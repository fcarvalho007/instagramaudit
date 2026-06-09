import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Self-contained in-memory fake for the subset of supabaseAdmin used by
 * `grantCreditPack`: an `.insert(...)` write path and a chained
 * `.select(...).eq(...).eq(...).filter(...).filter(...).limit(...).maybeSingle()`
 * read path that walks `metadata` JSON.
 */
interface LedgerRow {
  id: number;
  lead_id: string;
  delta: number;
  reason: string;
  metadata: Record<string, unknown>;
}

const ledger: LedgerRow[] = [];

function fakeSelect() {
  const filters: Array<(r: LedgerRow) => boolean> = [];
  const builder = {
    eq(col: keyof LedgerRow, value: unknown) {
      filters.push((r) => r[col] === value);
      return builder;
    },
    filter(path: string, op: string, value: unknown) {
      if (op !== "eq") throw new Error(`unsupported op ${op}`);
      // We only support `metadata->>key` lookups in this fake.
      const match = path.match(/^metadata->>(.+)$/);
      if (!match) throw new Error(`unsupported path ${path}`);
      const key = match[1];
      filters.push((r) => r.metadata?.[key] === value);
      return builder;
    },
    limit() {
      return builder;
    },
    maybeSingle() {
      const row = ledger.find((r) => filters.every((f) => f(r))) ?? null;
      return Promise.resolve({ data: row, error: null });
    },
  };
  return builder;
}

vi.mock("@/integrations/supabase/client.server", () => {
  const supabaseAdmin = {
    from() {
      return {
        insert(payload: Omit<LedgerRow, "id">) {
          ledger.push({ ...payload, id: ledger.length + 1 });
          return Promise.resolve({ error: null });
        },
        select() {
          return fakeSelect();
        },
      };
    },
    rpc(_name: string, args: { p_lead_id: string }) {
      return Promise.resolve({
        data: ledger
          .filter((r) => r.lead_id === args.p_lead_id)
          .reduce((acc, r) => acc + r.delta, 0),
        error: null,
      });
    },
  };
  return { supabaseAdmin };
});

import {
  CREDIT_PACK_KIND,
  CREDIT_PACK_LAUNCH_BONUS_AMOUNT,
  CREDIT_PACK_LAUNCH_BONUS_KIND,
  getCreditPackAmount,
  grantCreditPack,
  grantCreditPackLaunchBonus,
} from "../credits.server";

const LEAD = "11111111-2222-3333-4444-555555555555";
const PAYMENT = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

beforeEach(() => {
  ledger.length = 0;
});

describe("getCreditPackAmount", () => {
  it("maps credit_pack_1 to 1 credit", () => {
    expect(getCreditPackAmount("credit_pack_1")).toBe(1);
  });

  it("returns null for unknown SKUs", () => {
    expect(getCreditPackAmount("report_full_9")).toBeNull();
    expect(getCreditPackAmount("authority_diagnosis_97")).toBeNull();
    expect(getCreditPackAmount("credit_pack_99")).toBeNull();
  });
});

describe("grantCreditPack", () => {
  it("inserts an admin_adjust row with the credit-pack kind", async () => {
    const res = await grantCreditPack({
      leadId: LEAD,
      paymentId: PAYMENT,
      productCode: "credit_pack_1",
      amount: 1,
    });
    expect(res.granted).toBe(true);
    expect(ledger).toHaveLength(1);
    expect(ledger[0]).toMatchObject({
      lead_id: LEAD,
      delta: 1,
      reason: "admin_adjust",
    });
    expect(ledger[0].metadata).toMatchObject({
      kind: CREDIT_PACK_KIND,
      payment_id: PAYMENT,
      product_code: "credit_pack_1",
      pack_amount: 1,
    });
  });

  it("is idempotent per (lead_id, payment_id)", async () => {
    const first = await grantCreditPack({
      leadId: LEAD,
      paymentId: PAYMENT,
      productCode: "credit_pack_1",
      amount: 1,
    });
    const second = await grantCreditPack({
      leadId: LEAD,
      paymentId: PAYMENT,
      productCode: "credit_pack_1",
      amount: 1,
    });
    expect(first.granted).toBe(true);
    expect(second.granted).toBe(false);
    expect(ledger).toHaveLength(1);
  });

  it("allows a second pack from a different payment", async () => {
    await grantCreditPack({
      leadId: LEAD,
      paymentId: PAYMENT,
      productCode: "credit_pack_1",
      amount: 1,
    });
    const other = await grantCreditPack({
      leadId: LEAD,
      paymentId: "ffffffff-eeee-dddd-cccc-bbbbbbbbbbbb",
      productCode: "credit_pack_1",
      amount: 1,
    });
    expect(other.granted).toBe(true);
    expect(ledger).toHaveLength(2);
  });

  it("rejects non-positive amounts", async () => {
    await expect(
      grantCreditPack({
        leadId: LEAD,
        paymentId: PAYMENT,
        productCode: "credit_pack_1",
        amount: 0,
      }),
    ).rejects.toThrow(/invalid amount/);
    await expect(
      grantCreditPack({
        leadId: LEAD,
        paymentId: PAYMENT,
        productCode: "credit_pack_1",
        amount: -1,
      }),
    ).rejects.toThrow(/invalid amount/);
  });
});

describe("grantCreditPackLaunchBonus", () => {
  it("inserts +2 admin_adjust row tagged as launch bonus", async () => {
    const res = await grantCreditPackLaunchBonus({
      leadId: LEAD,
      paymentId: PAYMENT,
      productCode: "credit_pack_1",
    });
    expect(res.granted).toBe(true);
    expect(ledger).toHaveLength(1);
    expect(ledger[0]).toMatchObject({
      lead_id: LEAD,
      delta: CREDIT_PACK_LAUNCH_BONUS_AMOUNT,
      reason: "admin_adjust",
    });
    expect(ledger[0].metadata).toMatchObject({
      kind: CREDIT_PACK_LAUNCH_BONUS_KIND,
      payment_id: PAYMENT,
      product_code: "credit_pack_1",
      launch_bonus: true,
    });
  });

  it("is idempotent per (lead_id, payment_id)", async () => {
    const first = await grantCreditPackLaunchBonus({
      leadId: LEAD,
      paymentId: PAYMENT,
      productCode: "credit_pack_1",
    });
    const second = await grantCreditPackLaunchBonus({
      leadId: LEAD,
      paymentId: PAYMENT,
      productCode: "credit_pack_1",
    });
    expect(first.granted).toBe(true);
    expect(second.granted).toBe(false);
    expect(ledger).toHaveLength(1);
  });

  it("combines with grantCreditPack to credit 3 total", async () => {
    await grantCreditPack({
      leadId: LEAD,
      paymentId: PAYMENT,
      productCode: "credit_pack_1",
      amount: 1,
    });
    await grantCreditPackLaunchBonus({
      leadId: LEAD,
      paymentId: PAYMENT,
      productCode: "credit_pack_1",
    });
    const total = ledger.reduce((acc, r) => acc + r.delta, 0);
    expect(total).toBe(3);
  });
});