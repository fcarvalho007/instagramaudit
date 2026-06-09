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

// Mock dos emails transactional disparados em fire-and-forget — evita
// chamadas reais ao Brevo/Resend nos testes.
const sendReportAccessEmailMock = vi.fn(async () => ({
  ok: true as const,
  messageId: "mock-msg-id",
  provider: "brevo" as const,
}));
vi.mock("@/lib/email/send-report-access.server", () => ({
  sendReportAccessEmail: (args: unknown) => sendReportAccessEmailMock(args),
}));
const sendVerificationEmailMock = vi.fn(async () => ({
  ok: true as const,
  messageId: "mock-msg-id",
  provider: "brevo" as const,
}));
vi.mock("@/lib/email/send-verification.server", () => ({
  sendVerificationEmail: (args: unknown) => sendVerificationEmailMock(args),
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
  it("beta off (default) → 200 com lead_id, créditos e cookie emitidos", async () => {
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
      verification_mode?: string;
    };
    expect(body.ok).toBe(true);
    expect(body.verification_mode).toBe("off");
    expect(body.verification_required).toBe(false);
    expect(body.lead_id).toBeDefined();
    expect(body.credits).toBeGreaterThanOrEqual(2);
    expect(grantInitialCreditsMock).toHaveBeenCalledTimes(1);
    expect(setLeadCookieMock).toHaveBeenCalledTimes(1);
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

  it("beta off + email duplicado → 200 com claim idempotente (cookie reemitido, grant idempotente)", async () => {
    const first = await handleOnboardingStart(
      post({ name: "Ana", email: "dup@example.com" }),
    );
    expect(first.status).toBe(200);

    const second = await handleOnboardingStart(
      post({ name: "Ana Maria", email: "dup@example.com" }),
    );
    expect(second.status).toBe(200);
    const body = (await second.json()) as {
      ok: boolean;
      lead_id?: string;
      verification_mode?: string;
    };
    expect(body.ok).toBe(true);
    expect(body.verification_mode).toBe("off");
    expect(body.lead_id).toBeDefined();
    // Grant é idempotente — chamado 2x mas só credita uma.
    expect(grantInitialCreditsMock).toHaveBeenCalledTimes(2);
    expect(setLeadCookieMock).toHaveBeenCalledTimes(2);
  });

  it("modo `otp` (legacy) → 200 sem cookie, sem créditos, mantém gate de duplicado", async () => {
    const prev = process.env.EMAIL_VERIFICATION_MODE;
    process.env.EMAIL_VERIFICATION_MODE = "otp";
    try {
      const first = await handleOnboardingStart(
        post({ name: "Ana", email: "otp-new@example.com" }),
      );
      expect(first.status).toBe(200);
      const firstBody = (await first.json()) as {
        verification_mode?: string;
        verification_required?: boolean;
        lead_id?: string;
      };
      expect(firstBody.verification_mode).toBe("otp");
      expect(firstBody.verification_required).toBe(true);
      expect(firstBody.lead_id).toBeUndefined();
      expect(setLeadCookieMock).not.toHaveBeenCalled();
      expect(grantInitialCreditsMock).not.toHaveBeenCalled();

      const second = await handleOnboardingStart(
        post({ name: "Ana Maria", email: "otp-new@example.com" }),
      );
      expect(second.status).toBe(403);
      const body = (await second.json()) as {
        ok: boolean;
        error_code: string;
      };
      expect(body.ok).toBe(false);
      expect(body.error_code).toBe("EMAIL_REQUIRES_VERIFICATION");
    } finally {
      if (prev === undefined) delete process.env.EMAIL_VERIFICATION_MODE;
      else process.env.EMAIL_VERIFICATION_MODE = prev;
    }
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