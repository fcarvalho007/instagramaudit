/**
 * Endpoint tests para `/api/onboarding/start` — invocam o handler
 * directamente (sem montar router) e fazem mock das fronteiras de I/O:
 * `supabaseAdmin`, `credits.server` e `lead-cookie.server`.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

type LeadRow = {
  id: string;
  email_normalized: string;
  name: string;
  [k: string]: unknown;
};

const leadStore = new Map<string, LeadRow>();
const insertCalls: Array<Record<string, unknown>> = [];
const updateCalls: Array<Record<string, unknown>> = [];
let nextLeadId = 0;

function makeId(): string {
  nextLeadId += 1;
  const n = nextLeadId.toString(16).padStart(12, "0");
  return `00000000-0000-0000-0000-${n}`;
}

function leadsBuilder() {
  let mode: "select" | "insert" | "update" | null = null;
  let filterCol: string | null = null;
  let filterVal: string | null = null;
  let pendingInsert: Record<string, unknown> | null = null;
  let pendingUpdate: Record<string, unknown> | null = null;

  const api: Record<string, (...args: any[]) => unknown> = {
    select() {
      return api;
    },
    eq(col: string, val: string) {
      filterCol = col;
      filterVal = val;
      if (mode === "update" && pendingUpdate) {
        // Apply update against store and resolve.
        const found = [...leadStore.values()].find(
          (r) => (r as Record<string, unknown>)[col] === val,
        );
        if (found) Object.assign(found, pendingUpdate);
        updateCalls.push({ ...pendingUpdate });
        return Promise.resolve({ data: null, error: null });
      }
      return api;
    },
    maybeSingle() {
      if (mode !== "select") {
        return Promise.resolve({ data: null, error: null });
      }
      const found = [...leadStore.values()].find(
        (r) =>
          filterCol &&
          (r as Record<string, unknown>)[filterCol] === filterVal,
      );
      return Promise.resolve({
        data: found ? { id: found.id } : null,
        error: null,
      });
    },
    single() {
      if (mode === "insert" && pendingInsert) {
        const id = makeId();
        const row: LeadRow = {
          id,
          email_normalized:
            (pendingInsert.email_normalized as string) ?? "",
          name: (pendingInsert.name as string) ?? "",
          ...pendingInsert,
        };
        leadStore.set(row.email_normalized, row);
        insertCalls.push({ ...pendingInsert });
        return Promise.resolve({ data: { id }, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    },
    insert(row: Record<string, unknown>) {
      mode = "insert";
      pendingInsert = row;
      return api;
    },
    update(row: Record<string, unknown>) {
      mode = "update";
      pendingUpdate = row;
      return api;
    },
  };
  // Default `select` enters select mode.
  const wrapped = new Proxy(api, {
    get(t, k: string) {
      if (k === "select" && mode === null) {
        mode = "select";
      }
      return t[k];
    },
  });
  return wrapped;
}

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    auth: {
      signInWithOtp: vi.fn(async () => ({ data: {}, error: null })),
    },
    from: (table: string) => {
      if (table === "leads") return leadsBuilder();
      if (table === "product_events") {
        // Server logs server-side rejections in product_events; swallow.
        return {
          insert: (_rows: unknown) => Promise.resolve({ data: null, error: null }),
        };
      }
      throw new Error(`unexpected table in test: ${table}`);
    },
  },
}));

// Mock credits — partial unique index é simulado por um Set.
const grantedLeads = new Set<string>();
const balanceByLead = new Map<string, number>();
const grantInitialCreditsMock = vi.fn(async (leadId: string) => {
  if (grantedLeads.has(leadId)) return; // idempotente
  grantedLeads.add(leadId);
  balanceByLead.set(leadId, (balanceByLead.get(leadId) ?? 0) + 2);
});
const getBalanceMock = vi.fn(async (leadId: string) =>
  balanceByLead.get(leadId) ?? 0,
);
vi.mock("@/lib/credits/credits.server", () => ({
  grantInitialCredits: (leadId: string) => grantInitialCreditsMock(leadId),
  getBalance: (leadId: string) => getBalanceMock(leadId),
}));

const setLeadCookieMock = vi.fn((_leadId: string) => undefined);
vi.mock("@/lib/leads/lead-cookie.server", () => ({
  setLeadCookie: (leadId: string) => setLeadCookieMock(leadId),
}));

// Import AFTER mocks.
import { handleOnboardingStart } from "@/routes/api/onboarding/start";

function post(body: Record<string, unknown>): Request {
  const withDefaults: Record<string, unknown> = {
    qualification: "brand_company",
    ...body,
  };
  if (!("gdpr_consent" in withDefaults)) withDefaults.gdpr_consent = true;
  return new Request("http://test.local/api/onboarding/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withDefaults),
  });
}

beforeEach(() => {
  leadStore.clear();
  insertCalls.length = 0;
  updateCalls.length = 0;
  grantedLeads.clear();
  balanceByLead.clear();
  nextLeadId = 0;
  grantInitialCreditsMock.mockClear();
  getBalanceMock.mockClear();
  setLeadCookieMock.mockClear();
  setLeadCookieMock.mockImplementation(() => undefined);
});

describe("POST /api/onboarding/start", () => {
  it("valid payload → 200 with credits=0 (verification-gated), NO lead_id and NO cookie before OTP", async () => {
    const res = await handleOnboardingStart(
      post({
        name: "Ana Silva",
        email: "ana@example.com",
        marketing_consent: true,
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      lead_id?: string;
      credits: number;
      verification_required?: boolean;
    };
    expect(body.ok).toBe(true);
    // CRIT-3: lead_id NÃO deve ser devolvido antes do OTP validar o email.
    expect(body.lead_id).toBeUndefined();
    expect(body.credits).toBe(0);
    expect(body.verification_required).toBe(true);
    // Fase 5: /start no longer grants credits — that moves to /claim-existing.
    expect(grantInitialCreditsMock).not.toHaveBeenCalled();
    // CRIT-3: cookie `lead_session` só é emitido em /claim-existing.
    expect(setLeadCookieMock).not.toHaveBeenCalled();
  });

  it("invalid payload (missing email) → 400 INVALID_PAYLOAD with field issues + human message", async () => {
    const res = await handleOnboardingStart(
      post({ name: "Ana" }) /* missing email */,
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as {
      ok: boolean;
      error_code: string;
      message: string;
      issues?: { field: string; code: string }[];
    };
    expect(body.ok).toBe(false);
    expect(body.error_code).toBe("INVALID_PAYLOAD");
    expect(setLeadCookieMock).not.toHaveBeenCalled();
    expect(grantInitialCreditsMock).not.toHaveBeenCalled();
    // mensagem específica do campo email, sem detalhes internos do Zod
    expect(body.message.toLowerCase()).toContain("email");
    expect(body.message.toLowerCase()).not.toContain("zod");
    expect(body.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "email" }),
      ]),
    );
  });

  it("duplicate email on /start → 403 EMAIL_REQUIRES_VERIFICATION (defense-in-depth)", async () => {
    const first = await handleOnboardingStart(
      post({ name: "Ana", email: "dup@example.com" }),
    );
    expect(first.status).toBe(200);

    const second = await handleOnboardingStart(
      post({ name: "Ana Maria", email: "dup@example.com" }),
    );
    expect(second.status).toBe(403);
    const body = (await second.json()) as {
      ok: boolean;
      error_code: string;
    };
    expect(body.ok).toBe(false);
    expect(body.error_code).toBe("EMAIL_REQUIRES_VERIFICATION");
  });

  it("never invokes setLeadCookie at /start (CRIT-3 — gate on OTP)", async () => {
    const res = await handleOnboardingStart(
      post({ name: "Ana", email: "secret@example.com" }),
    );
    expect(res.status).toBe(200);
    expect(setLeadCookieMock).not.toHaveBeenCalled();
  });

  it("disposable email domain → 400 INVALID_PAYLOAD (email field)", async () => {
    const res = await handleOnboardingStart(
      post({ name: "Ana", email: "abuse@mailinator.com" }),
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as {
      ok: boolean;
      error_code: string;
      issues?: { field: string; code: string }[];
    };
    expect(body.error_code).toBe("INVALID_PAYLOAD");
    expect(body.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "email", code: "disposable" }),
      ]),
    );
    expect(setLeadCookieMock).not.toHaveBeenCalled();
  });

  it("missing qualification → 400 INVALID_PAYLOAD (qualification field)", async () => {
    const res = await handleOnboardingStart(
      post({
        name: "Ana",
        email: "noqual@example.com",
        qualification: undefined,
      }),
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as {
      ok: boolean;
      error_code: string;
      issues?: { field: string; code: string }[];
    };
    expect(body.error_code).toBe("INVALID_PAYLOAD");
    expect(body.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "qualification" }),
      ]),
    );
  });

  it("missing gdpr_consent → 400 INVALID_PAYLOAD", async () => {
    const res = await handleOnboardingStart(
      post({ name: "Ana", email: "nogdpr@example.com", gdpr_consent: undefined }),
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as {
      ok: boolean;
      error_code: string;
      message: string;
      issues?: { field: string; code: string }[];
    };
    expect(body.ok).toBe(false);
    expect(body.error_code).toBe("INVALID_PAYLOAD");
    expect(setLeadCookieMock).not.toHaveBeenCalled();
    expect(body.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "gdpr_consent" }),
      ]),
    );
    expect(body.message.toLowerCase()).toContain("tratamento de dados");
  });

  it("gdpr_consent === false → 400 INVALID_PAYLOAD", async () => {
    const res = await handleOnboardingStart(
      post({
        name: "Ana",
        email: "falsegdpr@example.com",
        gdpr_consent: false,
      }),
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { ok: boolean; error_code: string };
    expect(body.error_code).toBe("INVALID_PAYLOAD");
  });

  it("valid payload persists gdpr_consent_at and gdpr_consent_version", async () => {
    const res = await handleOnboardingStart(
      post({ name: "Ana", email: "consent@example.com" }),
    );
    expect(res.status).toBe(200);
    expect(insertCalls).toHaveLength(1);
    const inserted = insertCalls[0];
    expect(typeof inserted.gdpr_consent_at).toBe("string");
    expect(inserted.gdpr_consent_version).toBe("v1");
  });
});