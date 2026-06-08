import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * In-memory fake of the columns we touch on `credit_ledger` + RPC
 * `credit_balance`. We don't simulate Postgres semantics for the unique
 * grant index — we approximate it (returns 23505 on duplicate
 * initial_grant) so `grantInitialCredits` idempotency can be asserted.
 */
interface LedgerRow {
  id: number;
  lead_id: string;
  delta: number;
  reason: string;
  cache_key: string | null;
  reservation_id: string | null;
  analysis_event_id: string | null;
}

const ledger: LedgerRow[] = [];

function insert(payload: Partial<LedgerRow> & { lead_id: string; delta: number; reason: string }) {
  if (payload.reason === "initial_grant") {
    const already = ledger.some(
      (r) => r.lead_id === payload.lead_id && r.reason === "initial_grant",
    );
    if (already) {
      return { error: { code: "23505", message: "duplicate initial grant" } };
    }
  }
  // Simula o índice único parcial uniq_credit_ledger_reserve_per_report.
  if (payload.reason === "reserve" && payload.cache_key) {
    const dup = ledger.some(
      (r) =>
        r.lead_id === payload.lead_id &&
        r.reason === "reserve" &&
        r.cache_key === payload.cache_key,
    );
    if (dup) {
      return {
        error: {
          code: "23505",
          message:
            'duplicate key value violates unique constraint "uniq_credit_ledger_reserve_per_report"',
        },
      };
    }
  }
  ledger.push({
    id: ledger.length + 1,
    lead_id: payload.lead_id,
    delta: payload.delta,
    reason: payload.reason,
    cache_key: payload.cache_key ?? null,
    reservation_id: payload.reservation_id ?? null,
    analysis_event_id: (payload as { analysis_event_id?: string | null }).analysis_event_id ?? null,
  });
  return { error: null };
}

vi.mock("@/integrations/supabase/client.server", () => {
  const supabaseAdmin = {
    from: (_t: string) => ({
      insert: (payload: Partial<LedgerRow> & { lead_id: string; delta: number; reason: string }) => {
        const res = insert(payload);
        if (res.error) {
          return Promise.resolve({ error: res.error });
        }
        return Promise.resolve({ error: null });
      },
      update: (patch: Partial<LedgerRow>) => {
        const filters: Array<(r: LedgerRow) => boolean> = [];
        const builder = {
          eq: (col: keyof LedgerRow, val: unknown) => {
            filters.push((r) => r[col] === val);
            return builder;
          },
          is: (col: keyof LedgerRow, val: unknown) => {
            filters.push((r) => r[col] === val);
            return Promise.resolve({ error: null }).then(() => {
              for (const r of ledger) {
                if (filters.every((f) => f(r))) {
                  Object.assign(r, patch);
                }
              }
              return { error: null };
            });
          },
        };
        return builder;
      },
    }),
    rpc: (_name: string, args: { p_lead_id: string }) =>
      Promise.resolve({
        data: ledger
          .filter((r) => r.lead_id === args.p_lead_id)
          .reduce((acc, r) => acc + r.delta, 0),
        error: null,
      }),
  };
  return { supabaseAdmin };
});

import {
  confirmReservation,
  getBalance,
  grantInitialCredits,
  InsufficientCreditsError,
  releaseReservation,
  reserveCredit,
} from "../credits.server";

const LEAD = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

beforeEach(() => {
  ledger.length = 0;
});

describe("credits.server", () => {
  it("grants 2 credits initially", async () => {
    await grantInitialCredits(LEAD);
    expect(await getBalance(LEAD)).toBe(2);
  });

  it("grantInitialCredits is idempotent", async () => {
    await grantInitialCredits(LEAD);
    await grantInitialCredits(LEAD);
    expect(await getBalance(LEAD)).toBe(2);
  });

  it("reserveCredit decrements balance and returns reservationId", async () => {
    await grantInitialCredits(LEAD);
    const r = await reserveCredit({ leadId: LEAD, handle: "x" });
    if (r.kind !== "reserved") throw new Error("expected reserved");
    expect(r.reservationId).toMatch(/^[0-9a-f-]{36}$/);
    expect(await getBalance(LEAD)).toBe(1);
  });

  it("reserveCredit throws InsufficientCreditsError at zero balance", async () => {
    await expect(reserveCredit({ leadId: LEAD })).rejects.toBeInstanceOf(
      InsufficientCreditsError,
    );
  });

  it("releaseReservation returns the credit", async () => {
    await grantInitialCredits(LEAD);
    const r = await reserveCredit({ leadId: LEAD });
    if (r.kind !== "reserved") throw new Error("expected reserved");
    await releaseReservation({ leadId: LEAD, reservationId: r.reservationId });
    expect(await getBalance(LEAD)).toBe(2);
  });

  it("confirmReservation does not change balance", async () => {
    await grantInitialCredits(LEAD);
    const r = await reserveCredit({ leadId: LEAD });
    if (r.kind !== "reserved") throw new Error("expected reserved");
    await confirmReservation({ leadId: LEAD, reservationId: r.reservationId });
    expect(await getBalance(LEAD)).toBe(1);
  });

  it("two reserves drain to zero, third fails", async () => {
    await grantInitialCredits(LEAD);
    await reserveCredit({ leadId: LEAD });
    await reserveCredit({ leadId: LEAD });
    expect(await getBalance(LEAD)).toBe(0);
    await expect(reserveCredit({ leadId: LEAD })).rejects.toBeInstanceOf(
      InsufficientCreditsError,
    );
  });

  it("reserveCredit com mesmo (lead, cacheKey) devolve duplicate e não debita 2x", async () => {
    await grantInitialCredits(LEAD);
    const r1 = await reserveCredit({ leadId: LEAD, cacheKey: "v1:foo|" });
    expect(r1.kind).toBe("reserved");
    const r2 = await reserveCredit({ leadId: LEAD, cacheKey: "v1:foo|" });
    expect(r2.kind).toBe("duplicate");
    expect(await getBalance(LEAD)).toBe(1);
  });

  it("reserveCredit com cacheKey diferente continua a consumir", async () => {
    await grantInitialCredits(LEAD);
    const r1 = await reserveCredit({ leadId: LEAD, cacheKey: "v1:foo|" });
    expect(r1.kind).toBe("reserved");
    const r2 = await reserveCredit({ leadId: LEAD, cacheKey: "v1:bar|" });
    expect(r2.kind).toBe("reserved");
    expect(await getBalance(LEAD)).toBe(0);
  });

  it("confirmReservation com analysisEventId liga confirm + reserve ao evento", async () => {
    await grantInitialCredits(LEAD);
    const r = await reserveCredit({ leadId: LEAD });
    if (r.kind !== "reserved") throw new Error("expected reserved");
    const eventId = "11111111-2222-3333-4444-555555555555";
    await confirmReservation({
      leadId: LEAD,
      reservationId: r.reservationId,
      analysisEventId: eventId,
    });
    const reserveRow = ledger.find((x) => x.reason === "reserve" && x.reservation_id === r.reservationId);
    const confirmRow = ledger.find((x) => x.reason === "confirm" && x.reservation_id === r.reservationId);
    expect(reserveRow?.analysis_event_id).toBe(eventId);
    expect(confirmRow?.analysis_event_id).toBe(eventId);
  });

  it("releaseReservation com analysisEventId liga release + reserve ao evento", async () => {
    await grantInitialCredits(LEAD);
    const r = await reserveCredit({ leadId: LEAD });
    if (r.kind !== "reserved") throw new Error("expected reserved");
    const eventId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    await releaseReservation({
      leadId: LEAD,
      reservationId: r.reservationId,
      analysisEventId: eventId,
    });
    const reserveRow = ledger.find((x) => x.reason === "reserve" && x.reservation_id === r.reservationId);
    const releaseRow = ledger.find((x) => x.reason === "release" && x.reservation_id === r.reservationId);
    expect(reserveRow?.analysis_event_id).toBe(eventId);
    expect(releaseRow?.analysis_event_id).toBe(eventId);
    expect(await getBalance(LEAD)).toBe(2);
  });

  it("confirmReservation sem analysisEventId mantém comportamento legado (NULL)", async () => {
    await grantInitialCredits(LEAD);
    const r = await reserveCredit({ leadId: LEAD });
    if (r.kind !== "reserved") throw new Error("expected reserved");
    await confirmReservation({ leadId: LEAD, reservationId: r.reservationId });
    const reserveRow = ledger.find((x) => x.reason === "reserve" && x.reservation_id === r.reservationId);
    const confirmRow = ledger.find((x) => x.reason === "confirm" && x.reservation_id === r.reservationId);
    expect(reserveRow?.analysis_event_id).toBeNull();
    expect(confirmRow?.analysis_event_id).toBeNull();
  });
});