/**
 * Endpoint tests para `/api/onboarding/start` — invocam o handler
 * directamente (sem montar router) e fazem mock das fronteiras de I/O:
 * `supabaseAdmin`, `credits.server` e `lead-cookie.server`.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type LeadRow = {
  id: string;
  email_normalized: string;
  name: string;
  phone: string | null;
  phone_normalized: string | null;
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
          phone: (pendingInsert.phone as string | null) ?? null,
          phone_normalized:
            (pendingInsert.phone_normalized as string | null) ?? null,
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
    from: (table: string) => {
      if (table !== "leads") {
        throw new Error(`unexpected table in test: ${table}`);
      }
      return leadsBuilder();
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

const GENERIC =
  "Não foi possível preparar o acesso ao relatório. Tenta novamente dentro de instantes.";

function post(body: Record<string, unknown>): Request {
  const withGdpr =
    "gdpr_consent" in body ? body : { ...body, gdpr_consent: true };
  return new Request("http://test.local/api/onboarding/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withGdpr),
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
  it("valid payload → 200 with lead_id, credits=2 and cookie writer invoked", async () => {
    const res = await handleOnboardingStart(
      post({
        name: "Ana Silva",
        email: "ana@example.com",
        phone: "+351912345678",
        marketing_consent: true,
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      lead_id: string;
      credits: number;
    };
    expect(body.ok).toBe(true);
    expect(body.lead_id).toMatch(UUID_RE);
    expect(body.credits).toBe(2);
    expect(setLeadCookieMock).toHaveBeenCalledTimes(1);
    expect(setLeadCookieMock).toHaveBeenCalledWith(body.lead_id);
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

  it("duplicate email → same lead_id, credits stays at 2 (no double grant)", async () => {
    const first = await handleOnboardingStart(
      post({ name: "Ana", email: "dup@example.com" }),
    );
    const firstBody = (await first.json()) as {
      lead_id: string;
      credits: number;
    };
    expect(first.status).toBe(200);
    expect(firstBody.credits).toBe(2);

    const second = await handleOnboardingStart(
      post({ name: "Ana Maria", email: "dup@example.com" }),
    );
    const secondBody = (await second.json()) as {
      lead_id: string;
      credits: number;
    };
    expect(second.status).toBe(200);
    expect(secondBody.lead_id).toBe(firstBody.lead_id);
    expect(secondBody.credits).toBe(2); // NOT 4
    expect(grantInitialCreditsMock).toHaveBeenCalledTimes(2);
    expect(grantedLeads.size).toBe(1);
  });

  it("SESSION_SECRET misconfigured → 500 INTERNAL_ERROR with generic, secret-safe message", async () => {
    setLeadCookieMock.mockImplementationOnce(() => {
      throw new Error(
        "SESSION_SECRET missing or too short (need at least 32 chars).",
      );
    });
    const res = await handleOnboardingStart(
      post({ name: "Ana", email: "secret@example.com" }),
    );
    expect(res.status).toBe(500);
    const body = (await res.json()) as {
      ok: boolean;
      error_code: string;
      message: string;
    };
    expect(body.ok).toBe(false);
    expect(body.error_code).toBe("INTERNAL_ERROR");
    expect(body.message).toBe(GENERIC);
    // não vaza o nome do secret nem detalhes internos
    expect(body.message.toLowerCase()).not.toContain("session_secret");
    expect(body.message.toLowerCase()).not.toContain("secret");
    expect(body.message.toLowerCase()).not.toContain("hmac");
  });

  it("formatted phone is accepted and normalized to digits", async () => {
    const res = await handleOnboardingStart(
      post({
        name: "Ana",
        email: "phone@example.com",
        phone: "+351 912 345 678",
      }),
    );
    expect(res.status).toBe(200);
    expect(insertCalls).toHaveLength(1);
    const inserted = insertCalls[0];
    expect(inserted.phone).toBe("+351 912 345 678");
    expect(inserted.phone_normalized).toBe("351912345678");
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