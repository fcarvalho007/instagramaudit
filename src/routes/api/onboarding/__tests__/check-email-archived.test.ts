/**
 * /api/onboarding/check-email — verifica que leads arquivados não são
 * tratados como contas activas. Mocka supabaseAdmin para registar os
 * filtros aplicados e devolver respostas controladas.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => {
  type State = {
    leadResult: { data: unknown; error: unknown };
    authUsers: Array<{ id: string; email: string }>;
    calls: { eq: Array<[string, unknown]>; is: Array<[string, unknown]> };
  };
  const state: State = {
    leadResult: { data: null, error: null },
    authUsers: [],
    calls: { eq: [], is: [] },
  };

  function leadsBuilder() {
    const b: any = {
      select: () => b,
      eq: (col: string, val: unknown) => {
        state.calls.eq.push([col, val]);
        return b;
      },
      is: (col: string, val: unknown) => {
        state.calls.is.push([col, val]);
        return b;
      },
      limit: () => b,
      maybeSingle: () => Promise.resolve(state.leadResult),
    };
    return b;
  }

  const supabaseAdmin = {
    from: (table: string) => {
      if (table === "leads") return leadsBuilder();
      throw new Error(`unexpected table ${table}`);
    },
    auth: {
      admin: {
        listUsers: async () => ({
          data: { users: state.authUsers },
          error: null,
        }),
      },
    },
  };

  return { state, supabaseAdmin };
});

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: mocks.supabaseAdmin,
}));
vi.mock("@/lib/config/auth-mode.server", () => ({
  getAuthMode: () => "password",
}));

import { handleCheckEmail } from "../check-email";

function req(email: string) {
  return new Request("https://x/api/onboarding/check-email", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

beforeEach(() => {
  mocks.state.leadResult = { data: null, error: null };
  mocks.state.authUsers = [];
  mocks.state.calls = { eq: [], is: [] };
});

describe("check-email archived filter", () => {
  it("aplica filtro archived_at IS NULL ao procurar leads", async () => {
    await handleCheckEmail(req("teste@x.pt"));
    expect(mocks.state.calls.is).toContainEqual(["archived_at", null]);
    expect(mocks.state.calls.eq).toContainEqual(["email_normalized", "teste@x.pt"]);
  });

  it("lead activo → exists:true", async () => {
    mocks.state.leadResult = { data: { id: "l1", name: "X" }, error: null };
    const res = await handleCheckEmail(req("a@x.pt"));
    const body = await res.json();
    expect(body.exists).toBe(true);
  });

  it("sem lead e sem auth user → exists:false", async () => {
    mocks.state.leadResult = { data: null, error: null };
    mocks.state.authUsers = [];
    const res = await handleCheckEmail(req("novo@x.pt"));
    const body = await res.json();
    expect(body.exists).toBe(false);
  });

  it("lead arquivado (filtrado pela query) mas auth user existe → exists:true via auth", async () => {
    // O filtro is(archived_at,null) faz a query devolver null mesmo que
    // exista um lead arquivado. O fallback auth.users deve apanhá-lo.
    mocks.state.leadResult = { data: null, error: null };
    mocks.state.authUsers = [{ id: "u1", email: "arq@x.pt" }];
    const res = await handleCheckEmail(req("arq@x.pt"));
    const body = await res.json();
    expect(body.exists).toBe(true);
  });

  it("lead arquivado e SEM auth user → exists:false (totalmente purgado do ponto de vista público)", async () => {
    mocks.state.leadResult = { data: null, error: null };
    mocks.state.authUsers = [];
    const res = await handleCheckEmail(req("purg@x.pt"));
    const body = await res.json();
    expect(body.exists).toBe(false);
  });
});