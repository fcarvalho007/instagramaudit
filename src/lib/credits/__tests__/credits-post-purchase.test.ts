import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Standalone mock for `grantPostPurchaseBetaCredits`. The fake mirrors only
 * the supabase-js calls the function uses: a chained select for the
 * idempotency probe and an insert for the +2 grant. Approximates the
 * application-level uniqueness keyed on
 * `(lead_id, reason='admin_adjust', metadata.kind, metadata.payment_id)`.
 */
interface LedgerRow {
  lead_id: string;
  delta: number;
  reason: string;
  metadata: Record<string, unknown>;
}

const ledger: LedgerRow[] = [];

function buildSelectChain(filters: Array<(r: LedgerRow) => boolean>) {
  const chain = {
    eq(column: string, value: string) {
      filters.push((r) => (r as unknown as Record<string, unknown>)[column] === value);
      return chain;
    },
    filter(path: string, op: string, value: string) {
      const key = path.replace(/^metadata->>/, "");
      if (op === "eq") {
        filters.push((r) => (r.metadata?.[key] as unknown) === value);
      }
      return chain;
    },
    limit(_n: number) {
      return chain;
    },
    maybeSingle() {
      const row = ledger.find((r) => filters.every((f) => f(r))) ?? null;
      return Promise.resolve({ data: row ? { id: "fake" } : null, error: null });
    },
  };
  return chain;
}

vi.mock("@/integrations/supabase/client.server", () => {
  const supabaseAdmin = {
    from: (_t: string) => ({
      select: (_cols: string) => buildSelectChain([]),
      insert: (payload: LedgerRow) => {
        ledger.push({
          lead_id: payload.lead_id,
          delta: payload.delta,
          reason: payload.reason,
          metadata: (payload.metadata ?? {}) as Record<string, unknown>,
        });
        return Promise.resolve({ error: null });
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
  getBalance,
  grantPostPurchaseBetaCredits,
  grantPurchaseIncludedCredit,
} from "../credits.server";

const LEAD = "11111111-2222-3333-4444-555555555555";
const PAYMENT_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const PAYMENT_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

beforeEach(() => {
  ledger.length = 0;
});

describe("grantPostPurchaseBetaCredits", () => {
  it("grants +2 once for a fresh (lead, payment) pair", async () => {
    const res = await grantPostPurchaseBetaCredits({
      leadId: LEAD,
      paymentId: PAYMENT_A,
    });
    expect(res.granted).toBe(true);
    expect(await getBalance(LEAD)).toBe(2);
    expect(ledger).toHaveLength(1);
    expect(ledger[0]).toMatchObject({
      delta: 2,
      reason: "admin_adjust",
      metadata: {
        kind: "post_purchase_beta_bonus",
        payment_id: PAYMENT_A,
      },
    });
  });

  it("is idempotent per payment_id (no duplicate ledger row, no double grant)", async () => {
    const first = await grantPostPurchaseBetaCredits({
      leadId: LEAD,
      paymentId: PAYMENT_A,
    });
    const second = await grantPostPurchaseBetaCredits({
      leadId: LEAD,
      paymentId: PAYMENT_A,
    });
    expect(first.granted).toBe(true);
    expect(second.granted).toBe(false);
    expect(await getBalance(LEAD)).toBe(2);
    expect(ledger).toHaveLength(1);
  });

  it("grants again for a different payment_id (separate purchase)", async () => {
    await grantPostPurchaseBetaCredits({ leadId: LEAD, paymentId: PAYMENT_A });
    const res = await grantPostPurchaseBetaCredits({
      leadId: LEAD,
      paymentId: PAYMENT_B,
    });
    expect(res.granted).toBe(true);
    expect(await getBalance(LEAD)).toBe(4);
    expect(ledger).toHaveLength(2);
  });
});

describe("grantPurchaseIncludedCredit", () => {
  it("grants +1 once for a fresh (lead, payment) pair", async () => {
    const res = await grantPurchaseIncludedCredit({
      leadId: LEAD,
      paymentId: PAYMENT_A,
      productCode: "report_full_9",
    });
    expect(res.granted).toBe(true);
    expect(await getBalance(LEAD)).toBe(1);
    expect(ledger).toHaveLength(1);
    expect(ledger[0]).toMatchObject({
      delta: 1,
      reason: "admin_adjust",
      metadata: {
        kind: "purchase_included_credit",
        payment_id: PAYMENT_A,
        product_code: "report_full_9",
        source: "payment_confirmed",
      },
    });
  });

  it("is idempotent per payment_id", async () => {
    await grantPurchaseIncludedCredit({
      leadId: LEAD,
      paymentId: PAYMENT_A,
      productCode: "report_full_9",
    });
    const second = await grantPurchaseIncludedCredit({
      leadId: LEAD,
      paymentId: PAYMENT_A,
      productCode: "report_full_9",
    });
    expect(second.granted).toBe(false);
    expect(await getBalance(LEAD)).toBe(1);
    expect(ledger).toHaveLength(1);
  });
});

describe("combined post-purchase grant sequence", () => {
  it("included + bonus = 3 credits on first run; retry stays at 3", async () => {
    const a = await grantPurchaseIncludedCredit({
      leadId: LEAD,
      paymentId: PAYMENT_A,
      productCode: "report_full_9",
    });
    const b = await grantPostPurchaseBetaCredits({
      leadId: LEAD,
      paymentId: PAYMENT_A,
      productCode: "report_full_9",
    });
    expect(a.granted).toBe(true);
    expect(b.granted).toBe(true);
    expect(await getBalance(LEAD)).toBe(3);
    expect(ledger).toHaveLength(2);

    // Webhook retry
    const a2 = await grantPurchaseIncludedCredit({
      leadId: LEAD,
      paymentId: PAYMENT_A,
      productCode: "report_full_9",
    });
    const b2 = await grantPostPurchaseBetaCredits({
      leadId: LEAD,
      paymentId: PAYMENT_A,
      productCode: "report_full_9",
    });
    expect(a2.granted).toBe(false);
    expect(b2.granted).toBe(false);
    expect(await getBalance(LEAD)).toBe(3);
    expect(ledger).toHaveLength(2);
  });

  it("accumulates across distinct payments (3 + 3 = 6)", async () => {
    await grantPurchaseIncludedCredit({
      leadId: LEAD,
      paymentId: PAYMENT_A,
      productCode: "report_full_9",
    });
    await grantPostPurchaseBetaCredits({
      leadId: LEAD,
      paymentId: PAYMENT_A,
      productCode: "report_full_9",
    });
    await grantPurchaseIncludedCredit({
      leadId: LEAD,
      paymentId: PAYMENT_B,
      productCode: "report_full_9",
    });
    await grantPostPurchaseBetaCredits({
      leadId: LEAD,
      paymentId: PAYMENT_B,
      productCode: "report_full_9",
    });
    expect(await getBalance(LEAD)).toBe(6);
    expect(ledger).toHaveLength(4);
  });
});