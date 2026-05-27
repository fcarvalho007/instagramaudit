import { describe, expect, it, vi } from "vitest";

// Reproduz inline o lookup do cache negativo (analyze-public-v1.ts:577-615)
// e testa-o contra um cliente Supabase mocked. Evita importar a rota real.

type Code = "PROFILE_PERSONAL_NO_FEED" | "PROFILE_PRIVATE";

interface MockResult {
  data: { error_code: Code } | null;
  error: unknown | null;
}

function buildSupabaseMock(result: MockResult | { throw: unknown }) {
  const maybeSingle = vi.fn(async () => {
    if ("throw" in result) throw result.throw;
    return result;
  });
  const chain: Record<string, unknown> = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    in: vi.fn(() => chain),
    gte: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    maybeSingle,
  };
  return {
    from: vi.fn(() => chain),
    _spies: { maybeSingle, chain },
  };
}

async function lookupNegativeCache(
  supabase: ReturnType<typeof buildSupabaseMock>,
  handle: string,
): Promise<Code | null> {
  try {
    const res = await supabase
      .from("analysis_events")
      // @ts-expect-error mock chain
      .select("error_code")
      .eq("handle", handle)
      .eq("network", "instagram")
      .in("error_code", ["PROFILE_PERSONAL_NO_FEED", "PROFILE_PRIVATE"])
      .gte("created_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return ((res as { data?: { error_code?: Code } })?.data?.error_code ??
      null) as Code | null;
  } catch {
    return null;
  }
}

describe("analyze-public-v1 · negative cache lookup", () => {
  it("hit recente PROFILE_PERSONAL_NO_FEED → devolve o code", async () => {
    const supa = buildSupabaseMock({
      data: { error_code: "PROFILE_PERSONAL_NO_FEED" },
      error: null,
    });
    expect(await lookupNegativeCache(supa, "brunoremribeiro")).toBe(
      "PROFILE_PERSONAL_NO_FEED",
    );
    expect(supa.from).toHaveBeenCalledWith("analysis_events");
  });

  it("hit recente PROFILE_PRIVATE → também faz short-circuit", async () => {
    const supa = buildSupabaseMock({
      data: { error_code: "PROFILE_PRIVATE" },
      error: null,
    });
    expect(await lookupNegativeCache(supa, "alguem_privado")).toBe(
      "PROFILE_PRIVATE",
    );
  });

  it("sem hit (data=null) → devolve null e handler prosseguiria para Apify", async () => {
    const supa = buildSupabaseMock({ data: null, error: null });
    expect(await lookupNegativeCache(supa, "novo_handle")).toBeNull();
  });

  it("lookup com erro Supabase → devolve null (best-effort, não bloqueia)", async () => {
    const supa = buildSupabaseMock({ throw: new Error("boom") });
    expect(await lookupNegativeCache(supa, "qualquer")).toBeNull();
  });

  it("aplica filtro de 24h", async () => {
    const supa = buildSupabaseMock({ data: null, error: null });
    await lookupNegativeCache(supa, "x");
    const gteCall = (supa._spies.chain.gte as ReturnType<typeof vi.fn>).mock
      .calls[0];
    expect(gteCall[0]).toBe("created_at");
    const isoArg = String(gteCall[1]);
    const t = Date.parse(isoArg);
    const expected = Date.now() - 24 * 3600 * 1000;
    expect(Math.abs(t - expected)).toBeLessThan(5_000);
  });
});