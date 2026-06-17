// One-off backfill: re-process recent `cost_events` through `estimateCostCents`
// to give pre-NODE-193 rows a non-zero USD baseline.
//
// Context: before the NODE-193 cutover (merged at 178bc62e) subscription runs
// wrote cost_events with cost_cents = 0 because the Claude Max OAuth plan reports
// no per-request USD. The live path now estimates the equivalent metered-API
// price from token counts (see heartbeat.ts updateRuntimeState). This script
// applies the SAME estimate to historical rows that were written before the fix.
//
// Safety / scope (matches the NODE-237 acceptance criteria):
//   - Pure read-modify-write on cost_events.cost_cents. No schema change, no migration.
//   - Only touches rows where cost_cents = 0 AND billing_type != 'metered_api'
//     (never clobbers a real billed metered row — same guard the live path uses).
//   - Skips rows whose model does not resolve in the pricing table (logs a count).
//   - Idempotent: it only fills zeros, so re-running is safe.
//   - Dry-run by default. Pass --apply to write inside a single transaction.
//
// Usage (run from the server package, needs DATABASE_URL pointing at the target DB):
//   DATABASE_URL=postgres://... pnpm tsx scripts/backfill-cost-cents.ts            # dry run, last 7 days
//   DATABASE_URL=postgres://... pnpm tsx scripts/backfill-cost-cents.ts --apply    # write
//   DATABASE_URL=postgres://... pnpm tsx scripts/backfill-cost-cents.ts --days 14  # widen window
//   DATABASE_URL=postgres://... pnpm tsx scripts/backfill-cost-cents.ts --company <uuid>  # scope to one company

import { and, eq, gte, ne, sql } from "drizzle-orm";
import { createDb, costEvents } from "@paperclipai/db";
import { estimateCostCents } from "../src/services/pricing.ts";

const METERED_BILLING_TYPE = "metered_api";

interface Options {
  apply: boolean;
  days: number;
  companyId: string | null;
}

function parseArgs(argv: string[]): Options {
  const opts: Options = { apply: false, days: 7, companyId: null };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--apply") {
      opts.apply = true;
    } else if (arg === "--days") {
      const value = Number(argv[++i]);
      if (!Number.isFinite(value) || value <= 0) {
        throw new Error(`--days expects a positive number, got: ${argv[i]}`);
      }
      opts.days = value;
    } else if (arg === "--company") {
      opts.companyId = argv[++i] ?? null;
      if (!opts.companyId) throw new Error("--company expects a company id");
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    console.error("DATABASE_URL is required. Point it at the target database before running.");
    process.exit(1);
  }

  const since = new Date(Date.now() - opts.days * 24 * 60 * 60 * 1000);
  const db = createDb(databaseUrl);

  const conditions = [
    eq(costEvents.costCents, 0),
    ne(costEvents.billingType, METERED_BILLING_TYPE),
    gte(costEvents.occurredAt, since),
  ];
  if (opts.companyId) {
    conditions.push(eq(costEvents.companyId, opts.companyId));
  }

  const candidates = await db
    .select({
      id: costEvents.id,
      model: costEvents.model,
      inputTokens: costEvents.inputTokens,
      cachedInputTokens: costEvents.cachedInputTokens,
      outputTokens: costEvents.outputTokens,
    })
    .from(costEvents)
    .where(and(...conditions));

  console.log(
    `Mode: ${opts.apply ? "APPLY (will write)" : "DRY RUN (no writes)"} | ` +
      `window: last ${opts.days}d (since ${since.toISOString()})` +
      (opts.companyId ? ` | company: ${opts.companyId}` : ""),
  );
  console.log(`Candidate rows (cost_cents = 0, billing_type != '${METERED_BILLING_TYPE}'): ${candidates.length}`);

  // Bucket the candidates so we only write rows whose estimate is a positive
  // change. Unknown-model rows and rows that estimate to 0 stay untouched
  // (writing 0 -> 0 is a pointless no-op that would also break idempotency
  // accounting), and we report both counts.
  const updates: Array<{ id: string; costCents: number }> = [];
  let zeroEstimate = 0;
  const unknownModelCounts = new Map<string, number>();

  for (const row of candidates) {
    const estimate = estimateCostCents(row.model, {
      inputTokens: row.inputTokens,
      cachedInputTokens: row.cachedInputTokens,
      outputTokens: row.outputTokens,
    });
    if (estimate == null) {
      unknownModelCounts.set(row.model, (unknownModelCounts.get(row.model) ?? 0) + 1);
    } else if (estimate === 0) {
      zeroEstimate++;
    } else {
      updates.push({ id: row.id, costCents: estimate });
    }
  }

  const totalCents = updates.reduce((sum, u) => sum + u.costCents, 0);
  console.log(`  -> will set cost_cents > 0 on: ${updates.length} rows (total $${(totalCents / 100).toFixed(2)})`);
  console.log(`  -> estimate resolved to 0, left as-is: ${zeroEstimate} rows`);
  const unknownTotal = [...unknownModelCounts.values()].reduce((a, b) => a + b, 0);
  console.log(`  -> skipped, model not in pricing table: ${unknownTotal} rows`);
  for (const [model, count] of [...unknownModelCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`       ${model}: ${count}`);
  }

  if (!opts.apply) {
    console.log("\nDry run complete. Re-run with --apply to write these estimates.");
    process.exit(0);
  }

  if (updates.length === 0) {
    console.log("\nNothing to write.");
    process.exit(0);
  }

  // Re-check the guard inside the UPDATE so a concurrent live write that filled
  // the row (or flipped it to metered) is never clobbered — keeps this idempotent
  // and safe to run against a live DB.
  let written = 0;
  await db.transaction(async (tx) => {
    for (const u of updates) {
      const result = await tx
        .update(costEvents)
        .set({ costCents: u.costCents })
        .where(
          and(
            eq(costEvents.id, u.id),
            eq(costEvents.costCents, 0),
            ne(costEvents.billingType, METERED_BILLING_TYPE),
          ),
        )
        .returning({ id: costEvents.id });
      written += result.length;
    }
  });

  console.log(`\nApplied. Rows updated: ${written}/${updates.length}` +
    (written !== updates.length ? " (difference = rows filled/changed concurrently, left untouched)" : ""));
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
