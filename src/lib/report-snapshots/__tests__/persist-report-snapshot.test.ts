import { describe, it, expect, vi, beforeEach } from "vitest";

// ---- mocks ---------------------------------------------------------------

type Row = Record<string, unknown>;

interface TableState {
  selectRow?: Row | null;
  insertResult?: { data: Row | null; error: { code?: string; message?: string } | null };
  updateCalls: Row[];
  insertCalls: Row[];
  selectCalls: number;
  // For "race" recovery: second select returns this
  selectRowSecond?: Row | null;
  // Optional override: nth select returns specific row
}

const tables: Record<string, TableState> = {};

function freshState(): TableState {
  return {
    selectRow: null,
    insertResult: { data: { id: "new-id" }, error: null },
    updateCalls: [],
    insertCalls: [],
    selectCalls: 0,
  };
}

function mockSupabaseFrom(table: string) {
  if (!tables[table]) tables[table] = freshState();
  const state = tables[table];

  const builder: any = {
    _filters: {} as Record<string, unknown>,
    select(_cols?: string) {
      return builder;
    },
    eq(col: string, val: unknown) {
      builder._filters[col] = val;
      return builder;
    },
    is(_col: string, _val: unknown) {
      return builder;
    },
    limit(_n: number) {
      return builder;
    },
    async maybeSingle() {
      state.selectCalls += 1;
      const row =
        state.selectCalls === 1
          ? state.selectRow
          : (state.selectRowSecond ?? state.selectRow);
      return { data: row ?? null, error: null };
    },
    insert(payload: Row) {
      state.insertCalls.push(payload);
      // Returns object that supports .select().single()
      return {
        select() {
          return {
            async single() {
              return state.insertResult ?? { data: null, error: null };
            },
          };
        },
      };
    },
    update(payload: Row) {
      state.updateCalls.push(payload);
      const u: any = {
        eq() { return u; },
        is() { return u; },
        then(resolve: (v: { error: null }) => unknown) { return Promise.resolve(resolve({ error: null })); },
      };
      return u;
    },
  };
  return builder;
}

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { from: (t: string) => mockSupabaseFrom(t) },
}));

const recordedEvents: Row[] = [];
vi.mock("@/lib/tracking.server", () => ({
  recordProductEvent: vi.fn(async (p: Row) => { recordedEvents.push(p); }),
}));

// Capture global fetch — must NOT be called (no providers)
const fetchSpy = vi.fn();
vi.stubGlobal("fetch", fetchSpy);

// ---- imports after mocks --------------------------------------------------

import {
  persistReportSnapshotInternal,
  ensureReportSnapshotForRequest,
} from "../persist-report-snapshot.server";
import { REPORT_RETENTION_MS } from "@/lib/report/retention";

// ---- helpers --------------------------------------------------------------

function reset() {
  for (const k of Object.keys(tables)) delete tables[k];
  recordedEvents.length = 0;
  fetchSpy.mockClear();
}

function seedReportRequest(row: Row) {
  tables.report_requests = { ...freshState(), selectRow: row };
}

function seedAnalysisSnapshot(row: Row) {
  tables.analysis_snapshots = { ...freshState(), selectRow: row };
}

function baseAnalysisPayload() {
  return {
    profile: { username: "frederico.m.carvalho", followers_count: 100, avatar_url: "https://x/y.jpg" },
    metrics: { engagement_pct: 1 },
    posts: [{ id: "p1", caption: "olá", thumbnail_url: "https://x/p1.jpg" }],
    // heavy fields that MUST be excluded from the historical payload
    caption_semantic_analysis: { foo: "x".repeat(5000) },
    visual_cover_analysis: { bar: "y".repeat(5000) },
    market_signals_free: { dfs: "z".repeat(5000) },
    enrichment_status: { running: true },
  };
}

// ---- tests ----------------------------------------------------------------

describe("persistReportSnapshotInternal", () => {
  beforeEach(() => {
    reset();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("cria snapshot na primeira chamada", async () => {
    seedReportRequest({
      id: "rr-1",
      lead_id: "lead-1",
      user_id: null,
      instagram_username: "frederico.m.carvalho",
      competitor_usernames: ["a", "b"],
      analysis_snapshot_id: "as-1",
      report_snapshot_id: null,
    });
    seedAnalysisSnapshot({
      id: "as-1",
      instagram_username: "frederico.m.carvalho",
      normalized_payload: baseAnalysisPayload(),
      created_at: "2026-05-11T10:00:00.000Z",
    });
    tables.report_snapshots = { ...freshState(), insertResult: { data: { id: "rs-new" }, error: null } };

    const r = await persistReportSnapshotInternal("rr-1", "public_unlock");

    expect(r).toEqual({ snapshotId: "rs-new", created: true });
    expect(tables.report_snapshots.insertCalls).toHaveLength(1);

    const inserted = tables.report_snapshots.insertCalls[0];
    expect(inserted.report_request_id).toBe("rr-1");
    expect(inserted.lead_id).toBe("lead-1");
    expect(inserted.source_analysis_snapshot_id).toBe("as-1");
    expect(inserted.instagram_username).toBe("frederico.m.carvalho");
    expect(inserted.competitor_usernames).toEqual(["a", "b"]);
    expect(inserted.payload_schema_version).toBe("report.v1");
    expect(inserted.report_version).toBe("free.v1");
    expect(inserted.algorithm_version).toBe("analysis.v1");

    // RR.update should be called to link the new snapshot id
    expect(tables.report_requests.updateCalls).toEqual([
      expect.objectContaining({ report_snapshot_id: "rs-new" }),
    ]);

    // Provider HTTP must not be called
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("não duplica em chamada repetida (RR já tem report_snapshot_id)", async () => {
    seedReportRequest({
      id: "rr-1",
      lead_id: "lead-1",
      user_id: null,
      instagram_username: "x",
      competitor_usernames: [],
      analysis_snapshot_id: "as-1",
      report_snapshot_id: "rs-existing",
    });
    tables.report_snapshots = freshState();
    tables.analysis_snapshots = freshState();

    const r = await persistReportSnapshotInternal("rr-1", "public_unlock");

    expect(r).toEqual({ snapshotId: "rs-existing", created: false });
    expect(tables.analysis_snapshots.selectCalls).toBe(0);
    expect(tables.report_snapshots.insertCalls).toHaveLength(0);
  });

  it("recupera snapshot existente em race 23505", async () => {
    seedReportRequest({
      id: "rr-1",
      lead_id: "lead-1",
      user_id: null,
      instagram_username: "x",
      competitor_usernames: [],
      analysis_snapshot_id: "as-1",
      report_snapshot_id: null,
    });
    seedAnalysisSnapshot({
      id: "as-1",
      instagram_username: "x",
      normalized_payload: baseAnalysisPayload(),
      created_at: "2026-05-11T10:00:00.000Z",
    });
    tables.report_snapshots = {
      ...freshState(),
      insertResult: { data: null, error: { code: "23505", message: "dup" } },
      // After 23505, helper re-SELECTs by report_request_id → second access
      selectRow: { id: "rs-race-existing" },
    };

    const r = await persistReportSnapshotInternal("rr-1", "public_unlock");

    expect(r).toEqual({ snapshotId: "rs-race-existing", created: false });
    expect(tables.report_snapshots.insertCalls).toHaveLength(1);
  });

  it("RR sem analysis_snapshot_id → reason missing_analysis_snapshot e não tenta insert", async () => {
    seedReportRequest({
      id: "rr-1",
      lead_id: "lead-1",
      user_id: null,
      instagram_username: "x",
      competitor_usernames: [],
      analysis_snapshot_id: null,
      report_snapshot_id: null,
    });
    tables.report_snapshots = freshState();

    const r = await persistReportSnapshotInternal("rr-1", "public_unlock");
    expect(r.snapshotId).toBeNull();
    expect(r.reason).toBe("missing_analysis_snapshot");
    expect(tables.report_snapshots.insertCalls).toHaveLength(0);
  });

  it("expires_at = now + 15 dias e payload exclui campos pesados", async () => {
    const NOW = new Date("2026-05-11T12:00:00.000Z");
    vi.setSystemTime(NOW);

    seedReportRequest({
      id: "rr-1",
      lead_id: "lead-1",
      user_id: null,
      instagram_username: "x",
      competitor_usernames: [],
      analysis_snapshot_id: "as-1",
      report_snapshot_id: null,
    });
    seedAnalysisSnapshot({
      id: "as-1",
      instagram_username: "x",
      normalized_payload: baseAnalysisPayload(),
      created_at: NOW.toISOString(),
    });
    tables.report_snapshots = { ...freshState(), insertResult: { data: { id: "rs-1" }, error: null } };

    await persistReportSnapshotInternal("rr-1", "beta_request");

    const inserted = tables.report_snapshots.insertCalls[0];
    const expires = new Date(inserted.expires_at as string).getTime();
    expect(expires - NOW.getTime()).toBe(REPORT_RETENTION_MS);

    const serialized = JSON.stringify(inserted.report_payload_jsonb);
    expect(serialized).not.toContain("caption_semantic_analysis");
    expect(serialized).not.toContain("visual_cover_analysis");
    expect(serialized).not.toContain("market_signals_free");
    expect(serialized).not.toContain("enrichment_status");

    vi.useRealTimers();
  });
});

describe("ensureReportSnapshotForRequest (wrapper fail-soft)", () => {
  beforeEach(() => {
    reset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("regista evento report_snapshot_persist_failed em caso de insert_error", async () => {
    seedReportRequest({
      id: "rr-1",
      lead_id: "lead-1",
      user_id: null,
      instagram_username: "x",
      competitor_usernames: [],
      analysis_snapshot_id: "as-1",
      report_snapshot_id: null,
    });
    seedAnalysisSnapshot({
      id: "as-1",
      instagram_username: "x",
      normalized_payload: { profile: { username: "x" }, posts: [] },
      created_at: "2026-05-11T10:00:00.000Z",
    });
    tables.report_snapshots = {
      ...freshState(),
      insertResult: { data: null, error: { code: "OTHER", message: "boom" } },
    };

    const r = await ensureReportSnapshotForRequest("rr-1", "public_unlock", {
      handle: "x",
      leadId: "lead-1",
      snapshotId: "as-1",
    });
    expect(r.snapshotId).toBeNull();
    expect(r.reason).toBe("insert_error");
    expect(recordedEvents.some(e => e.eventType === "report_snapshot_persist_failed")).toBe(true);
    expect(recordedEvents.some(e => e.eventType === "report_snapshot_persisted")).toBe(false);
  });

  it("não emite evento quando reason é missing_analysis_snapshot", async () => {
    seedReportRequest({
      id: "rr-1",
      lead_id: "lead-1",
      user_id: null,
      instagram_username: "x",
      competitor_usernames: [],
      analysis_snapshot_id: null,
      report_snapshot_id: null,
    });
    tables.report_snapshots = freshState();

    await ensureReportSnapshotForRequest("rr-1", "public_unlock");
    expect(recordedEvents).toHaveLength(0);
  });

  it("emite report_snapshot_persisted na primeira criação com metadata completa", async () => {
    seedReportRequest({
      id: "rr-1",
      lead_id: "lead-1",
      user_id: null,
      instagram_username: "frederico.m.carvalho",
      competitor_usernames: ["a"],
      analysis_snapshot_id: "as-1",
      report_snapshot_id: null,
    });
    seedAnalysisSnapshot({
      id: "as-1",
      instagram_username: "frederico.m.carvalho",
      normalized_payload: baseAnalysisPayload(),
      created_at: "2026-05-11T10:00:00.000Z",
    });
    tables.report_snapshots = { ...freshState(), insertResult: { data: { id: "rs-new" }, error: null } };

    const r = await ensureReportSnapshotForRequest("rr-1", "public_unlock", {
      handle: "frederico.m.carvalho",
      leadId: "lead-1",
      snapshotId: "as-1",
    });

    expect(r.created).toBe(true);
    expect(r.snapshotId).toBe("rs-new");
    const ev = recordedEvents.find(e => e.eventType === "report_snapshot_persisted");
    expect(ev).toBeDefined();
    const md = ev?.metadata as Record<string, unknown>;
    expect(md.report_request_id).toBe("rr-1");
    expect(md.report_snapshot_id).toBe("rs-new");
    expect(md.source).toBe("public_unlock");
    expect(md.source_analysis_snapshot_id).toBe("as-1");
    expect(md.created).toBe(true);
    expect(md.payload_schema_version).toBe("report.v1");
    expect(md.report_version).toBe("free.v1");
    expect(md.algorithm_version).toBe("analysis.v1");
    expect(typeof md.expires_at).toBe("string");
  });

  it("não emite report_snapshot_persisted em chamada duplicada (idempotente)", async () => {
    seedReportRequest({
      id: "rr-1",
      lead_id: "lead-1",
      user_id: null,
      instagram_username: "x",
      competitor_usernames: [],
      analysis_snapshot_id: "as-1",
      report_snapshot_id: "rs-existing",
    });
    tables.report_snapshots = freshState();
    tables.analysis_snapshots = freshState();

    const r = await ensureReportSnapshotForRequest("rr-1", "public_unlock");
    expect(r).toEqual({ snapshotId: "rs-existing", created: false });
    expect(recordedEvents.some(e => e.eventType === "report_snapshot_persisted")).toBe(false);
  });
});