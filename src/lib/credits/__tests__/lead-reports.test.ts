import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Fake mínimo de `lead_reports` que cobre o uso real:
 *   • upsert com ignoreDuplicates respeita UNIQUE(lead_id, cache_key)
 *   • select.eq.eq.limit.maybeSingle devolve null quando não existe
 */
interface Row {
  lead_id: string;
  handle: string;
  cache_key: string;
  analysis_snapshot_id: string | null;
  source: string;
}
const rows: Row[] = [];

vi.mock("@/integrations/supabase/client.server", () => {
  const supabaseAdmin = {
    from: (_t: string) => ({
      upsert: (
        payload: Omit<Row, "analysis_snapshot_id"> & {
          analysis_snapshot_id?: string | null;
        },
        _opts: { onConflict: string; ignoreDuplicates: boolean },
      ) => {
        const exists = rows.some(
          (r) =>
            r.lead_id === payload.lead_id && r.cache_key === payload.cache_key,
        );
        if (!exists) {
          rows.push({
            lead_id: payload.lead_id,
            handle: payload.handle,
            cache_key: payload.cache_key,
            analysis_snapshot_id: payload.analysis_snapshot_id ?? null,
            source: payload.source,
          });
        }
        return Promise.resolve({ error: null });
      },
      select: (_cols: string) => ({
        eq: (col1: keyof Row, val1: string) => ({
          eq: (col2: keyof Row, val2: string) => ({
            limit: (_n: number) => ({
              maybeSingle: () => {
                const found = rows.find(
                  (r) => r[col1] === val1 && r[col2] === val2,
                );
                return Promise.resolve({
                  data: found ? { id: "fake-id" } : null,
                  error: null,
                });
              },
            }),
          }),
        }),
      }),
    }),
  };
  return { supabaseAdmin };
});

import {
  leadOwnsReport,
  upsertLeadReport,
} from "../lead-reports.server";

const LEAD = "lead-1";
const KEY = "v1:foo|";

beforeEach(() => {
  rows.length = 0;
});

describe("lead-reports.server", () => {
  it("leadOwnsReport devolve false quando não existe associação", async () => {
    expect(await leadOwnsReport(LEAD, KEY)).toBe(false);
  });

  it("upsertLeadReport cria associação e leadOwnsReport passa a true", async () => {
    await upsertLeadReport({
      leadId: LEAD,
      handle: "foo",
      cacheKey: KEY,
      analysisSnapshotId: "snap-1",
    });
    expect(await leadOwnsReport(LEAD, KEY)).toBe(true);
    expect(rows).toHaveLength(1);
  });

  it("upsertLeadReport é idempotente para (lead_id, cache_key)", async () => {
    await upsertLeadReport({ leadId: LEAD, handle: "foo", cacheKey: KEY });
    await upsertLeadReport({ leadId: LEAD, handle: "foo", cacheKey: KEY });
    await upsertLeadReport({ leadId: LEAD, handle: "foo", cacheKey: KEY });
    expect(rows).toHaveLength(1);
  });

  it("leads distintos podem ter o mesmo cache_key associado", async () => {
    await upsertLeadReport({ leadId: "a", handle: "foo", cacheKey: KEY });
    await upsertLeadReport({ leadId: "b", handle: "foo", cacheKey: KEY });
    expect(await leadOwnsReport("a", KEY)).toBe(true);
    expect(await leadOwnsReport("b", KEY)).toBe(true);
    expect(rows).toHaveLength(2);
  });
});