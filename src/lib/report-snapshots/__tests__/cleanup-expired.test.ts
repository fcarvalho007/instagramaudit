import { describe, it, expect, vi, beforeEach } from "vitest";

// ---- mocks ---------------------------------------------------------------

type Row = { id: string; expires_at: string; expired_at: string | null };

interface State {
  // Pool de snapshots disponíveis para o select (já filtrados por payload != null).
  rows: Row[];
  selectError: { message: string } | null;
  updateError: { message: string } | null;
  selectCalls: number;
  updatedIds: string[];
}

const state: State = {
  rows: [],
  selectError: null,
  updateError: null,
  selectCalls: 0,
  updatedIds: [],
};

function reset() {
  state.rows = [];
  state.selectError = null;
  state.updateError = null;
  state.selectCalls = 0;
  state.updatedIds = [];
}

function makeBuilder() {
  let _limit = 100;
  let _ids: string[] | null = null;
  let mode: "select" | "update" = "select";

  const builder: any = {
    select() {
      mode = "select";
      return builder;
    },
    update(_payload: Record<string, unknown>) {
      mode = "update";
      return builder;
    },
    lte(_col: string, _val: unknown) {
      return builder;
    },
    not(_col: string, _op: string, _val: unknown) {
      return builder;
    },
    is(_col: string, _val: unknown) {
      return builder;
    },
    in(_col: string, ids: string[]) {
      _ids = ids;
      return builder;
    },
    limit(n: number) {
      _limit = n;
      return builder;
    },
    then(resolve: (v: any) => unknown) {
      if (mode === "select") {
        state.selectCalls += 1;
        if (state.selectError) {
          return Promise.resolve(resolve({ data: null, error: state.selectError }));
        }
        // Pop até `_limit` linhas
        const taken = state.rows.splice(0, _limit);
        return Promise.resolve(resolve({ data: taken, error: null }));
      }
      // update
      if (state.updateError) {
        return Promise.resolve(resolve({ error: state.updateError }));
      }
      if (_ids) state.updatedIds.push(..._ids);
      return Promise.resolve(resolve({ error: null }));
    },
  };
  return builder;
}

const recordedEvents: Array<{ eventType: string; metadata?: any }> = [];

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: (_table: string) => makeBuilder(),
  },
}));

vi.mock("@/lib/tracking.server", () => ({
  recordProductEvent: vi.fn(async (payload: any) => {
    recordedEvents.push(payload);
  }),
}));

import { cleanupExpiredReportSnapshots } from "../cleanup-expired.server";

beforeEach(() => {
  reset();
  recordedEvents.length = 0;
});

function expiredRow(id: string, daysAgo = 1): Row {
  return {
    id,
    expires_at: new Date(Date.now() - daysAgo * 86400000).toISOString(),
    expired_at: null,
  };
}

describe("cleanupExpiredReportSnapshots", () => {
  it("vira payload=null e expired_at em snapshots expirados", async () => {
    state.rows = [expiredRow("a"), expiredRow("b")];
    const r = await cleanupExpiredReportSnapshots({ batchSize: 10, maxBatches: 2 });
    expect(r.ok).toBe(true);
    expect(r.expiredCount).toBe(2);
    expect(r.batches).toBe(1);
    expect(state.updatedIds).toEqual(expect.arrayContaining(["a", "b"]));
  });

  it("é idempotente — sem rows com payload, não faz update nem emite evento", async () => {
    state.rows = [];
    const r = await cleanupExpiredReportSnapshots({ batchSize: 10, maxBatches: 2 });
    expect(r.ok).toBe(true);
    expect(r.expiredCount).toBe(0);
    expect(r.batches).toBe(0);
    expect(recordedEvents).toHaveLength(0);
  });

  it("emite UM evento agregado por batch (não N)", async () => {
    state.rows = [expiredRow("a"), expiredRow("b"), expiredRow("c")];
    await cleanupExpiredReportSnapshots({ batchSize: 10, maxBatches: 2 });
    const successEvents = recordedEvents.filter(
      (e) => e.eventType === "report_snapshots_expired_batch",
    );
    expect(successEvents).toHaveLength(1);
    expect(successEvents[0].metadata.count).toBe(3);
    expect(successEvents[0].metadata.snapshot_ids).toEqual(["a", "b", "c"]);
  });

  it("regista report_snapshots_cleanup_failed quando update falha", async () => {
    state.rows = [expiredRow("a")];
    state.updateError = { message: "boom" };
    const r = await cleanupExpiredReportSnapshots({ batchSize: 10, maxBatches: 1 });
    expect(r.ok).toBe(false);
    expect(r.errors).toHaveLength(1);
    expect(
      recordedEvents.some((e) => e.eventType === "report_snapshots_cleanup_failed"),
    ).toBe(true);
    expect(
      recordedEvents.some((e) => e.eventType === "report_snapshots_expired_batch"),
    ).toBe(false);
  });

  it("respeita maxBatches e pára cedo", async () => {
    // 5 batches de 1 linha disponível, mas maxBatches=2
    state.rows = [
      expiredRow("a"),
      expiredRow("b"),
      expiredRow("c"),
      expiredRow("d"),
      expiredRow("e"),
    ];
    const r = await cleanupExpiredReportSnapshots({ batchSize: 1, maxBatches: 2 });
    expect(r.batches).toBe(2);
    expect(r.expiredCount).toBe(2);
    // Sobram rows não processadas
    expect(state.rows.length).toBe(3);
  });

  it("não importa providers (apify/openai/dataforseo)", async () => {
    // Smoke: o módulo carrega sem puxar dependências de providers
    const mod = await import("../cleanup-expired.server");
    expect(typeof mod.cleanupExpiredReportSnapshots).toBe("function");
  });
});