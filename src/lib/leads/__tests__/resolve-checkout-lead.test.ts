/**
 * Testes de segurança da ponte de identidade do checkout (Ronda 11B.1).
 *
 * Regras verificadas:
 *  - `lead_session` global tem precedência;
 *  - `report_capture_session` só autoriza o relatório a que está ligada;
 *  - qualquer mismatch, expiração ou adulteração → identidade "none";
 *  - identidade scoped não pode comprar packs nem o diagnóstico de 97€.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.SESSION_SECRET =
  process.env.SESSION_SECRET ?? "test-session-secret-with-32-chars-min!!";

const LEAD_A = "11111111-1111-4111-8111-111111111111";
const LEAD_B = "22222222-2222-4222-8222-222222222222";
const SNAPSHOT_X = "33333333-3333-4333-8333-333333333333";
const CACHE_X = "ig:handle-x:30d";
const CACHE_Y = "ig:handle-y:30d";

const state: {
  globalLead: string | null;
  cookieHeader: string;
  snapshots: Record<string, string>;
  leads: string[];
} = {
  globalLead: null,
  cookieHeader: "",
  snapshots: { [SNAPSHOT_X]: CACHE_X },
  leads: [LEAD_A, LEAD_B],
};

vi.mock("@tanstack/react-start/server", () => ({
  getRequest: () =>
    new Request("https://example.test/checkout/report-full", {
      headers: state.cookieHeader ? { cookie: state.cookieHeader } : {},
    }),
  setResponseHeader: () => {},
}));

vi.mock("../lead-cookie.server", () => ({
  getLeadFromCookie: () => state.globalLead,
}));

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: (table: string) => ({
      select: () => ({
        eq: (_col: string, value: string) => ({
          maybeSingle: async () => {
            if (table === "analysis_snapshots") {
              const cacheKey = state.snapshots[value];
              return { data: cacheKey ? { cache_key: cacheKey } : null };
            }
            return {
              data: state.leads.includes(value) ? { id: value } : null,
            };
          },
        }),
      }),
    }),
  },
}));

const { resolveCheckoutIdentity, isScopedCheckoutAllowed } = await import(
  "../resolve-checkout-lead.server"
);
const { encodeCaptureSession, CAPTURE_COOKIE_NAME } = await import(
  "../report-capture-session.server"
);

function withCapture(leadId: string, cacheKey: string): void {
  state.cookieHeader = `${CAPTURE_COOKIE_NAME}=${encodeCaptureSession(leadId, cacheKey)}`;
}

beforeEach(() => {
  state.globalLead = null;
  state.cookieHeader = "";
  state.leads = [LEAD_A, LEAD_B];
});

describe("resolveCheckoutIdentity", () => {
  it("aceita a sessão global e ignora o relatório", async () => {
    state.globalLead = LEAD_A;
    const identity = await resolveCheckoutIdentity({ reportRef: SNAPSHOT_X });
    expect(identity).toEqual({
      leadId: LEAD_A,
      source: "lead_session",
      cacheKey: null,
    });
  });

  it("dá precedência à sessão global quando existem as duas", async () => {
    state.globalLead = LEAD_A;
    withCapture(LEAD_B, CACHE_X);
    const identity = await resolveCheckoutIdentity({ reportRef: SNAPSHOT_X });
    expect(identity.leadId).toBe(LEAD_A);
    expect(identity.source).toBe("lead_session");
  });

  it("aceita capture válida ligada ao snapshot pedido", async () => {
    withCapture(LEAD_B, CACHE_X);
    const identity = await resolveCheckoutIdentity({ reportRef: SNAPSHOT_X });
    expect(identity.leadId).toBe(LEAD_B);
    expect(identity.source).toBe("report_capture_session");
    expect(identity.cacheKey).toBe(CACHE_X);
  });

  it("nega capture ligada a outro relatório", async () => {
    withCapture(LEAD_B, CACHE_Y);
    const identity = await resolveCheckoutIdentity({ reportRef: SNAPSHOT_X });
    expect(identity.source).toBe("none");
    expect(identity.leadId).toBeNull();
  });

  it("nega cookie adulterado", async () => {
    withCapture(LEAD_B, CACHE_X);
    state.cookieHeader = `${state.cookieHeader.slice(0, -3)}zzz`;
    const identity = await resolveCheckoutIdentity({ reportRef: SNAPSHOT_X });
    expect(identity.source).toBe("none");
  });

  it("nega capture expirada", async () => {
    withCapture(LEAD_B, CACHE_X);
    const spy = vi
      .spyOn(Date, "now")
      .mockReturnValue(Date.now() + 25 * 60 * 60 * 1000);
    const identity = await resolveCheckoutIdentity({ reportRef: SNAPSHOT_X });
    spy.mockRestore();
    expect(identity.source).toBe("none");
  });

  it("nega quando não há cookies", async () => {
    const identity = await resolveCheckoutIdentity({ reportRef: SNAPSHOT_X });
    expect(identity.source).toBe("none");
  });

  it("nega quando não há referência de relatório", async () => {
    withCapture(LEAD_B, CACHE_X);
    const identity = await resolveCheckoutIdentity({ reportRef: null });
    expect(identity.source).toBe("none");
  });

  it("nega quando o lead já não existe", async () => {
    withCapture(LEAD_B, CACHE_X);
    state.leads = [LEAD_A];
    const identity = await resolveCheckoutIdentity({ reportRef: SNAPSHOT_X });
    expect(identity.source).toBe("none");
  });

  it("não deriva identidade de username nem de snapshot desconhecido", async () => {
    withCapture(LEAD_B, CACHE_X);
    const identity = await resolveCheckoutIdentity({
      reportRef: "44444444-4444-4444-8444-444444444444",
    });
    expect(identity.source).toBe("none");
  });
});

describe("isScopedCheckoutAllowed", () => {
  it("permite apenas o relatório de 9€", () => {
    expect(isScopedCheckoutAllowed("report_full_9")).toBe(true);
  });

  it("bloqueia packs e diagnóstico humano", () => {
    for (const code of [
      "report_pack_5",
      "report_pack_10",
      "credits_10",
      "authority_diagnosis_97",
    ]) {
      expect(isScopedCheckoutAllowed(code)).toBe(false);
    }
  });
});
