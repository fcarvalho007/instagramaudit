import { describe, expect, it } from "vitest";

// Reproduz a heurística do handler (analyze-public-v1.ts:818-838) sem
// importar a rota — esta arrasta deps do Worker (supabaseAdmin, Apify).
function classifyEmptyFeed(input: {
  isPrivateFlag: boolean;
  isProfessional: boolean | undefined;
  profilePostsCount: number;
  latestPostsLength: number;
}): "PROFILE_PERSONAL_NO_FEED" | "PROFILE_PRIVATE" | "HAS_POSTS" {
  if (input.latestPostsLength > 0) return "HAS_POSTS";
  const looksPersonalNoFeed =
    !input.isPrivateFlag &&
    !input.isProfessional &&
    input.profilePostsCount > 0;
  return looksPersonalNoFeed ? "PROFILE_PERSONAL_NO_FEED" : "PROFILE_PRIVATE";
}

describe("analyze-public-v1 · heuristic", () => {
  it("classifica perfil público + pessoal + posts_count>0 + sem latestPosts como PERSONAL_NO_FEED", () => {
    expect(
      classifyEmptyFeed({
        isPrivateFlag: false,
        isProfessional: false,
        profilePostsCount: 42,
        latestPostsLength: 0,
      }),
    ).toBe("PROFILE_PERSONAL_NO_FEED");
  });

  it("classifica perfil privado como PRIVATE (fallback)", () => {
    expect(
      classifyEmptyFeed({
        isPrivateFlag: true,
        isProfessional: false,
        profilePostsCount: 42,
        latestPostsLength: 0,
      }),
    ).toBe("PROFILE_PRIVATE");
  });

  it("classifica conta sem posts (postsCount=0) como PRIVATE (fallback)", () => {
    expect(
      classifyEmptyFeed({
        isPrivateFlag: false,
        isProfessional: false,
        profilePostsCount: 0,
        latestPostsLength: 0,
      }),
    ).toBe("PROFILE_PRIVATE");
  });

  it("classifica conta profissional vazia como PRIVATE (fallback, não é caso pessoal)", () => {
    expect(
      classifyEmptyFeed({
        isPrivateFlag: false,
        isProfessional: true,
        profilePostsCount: 42,
        latestPostsLength: 0,
      }),
    ).toBe("PROFILE_PRIVATE");
  });

  it("trata `is_professional=undefined` como não-profissional (perfil pessoal)", () => {
    expect(
      classifyEmptyFeed({
        isPrivateFlag: false,
        isProfessional: undefined,
        profilePostsCount: 10,
        latestPostsLength: 0,
      }),
    ).toBe("PROFILE_PERSONAL_NO_FEED");
  });

  it("não é accionada quando latestPosts.length > 0", () => {
    expect(
      classifyEmptyFeed({
        isPrivateFlag: false,
        isProfessional: false,
        profilePostsCount: 42,
        latestPostsLength: 12,
      }),
    ).toBe("HAS_POSTS");
  });
});

describe("analyze-public-v1 · contract", () => {
  it("PublicAnalysisErrorCode inclui PROFILE_PERSONAL_NO_FEED distinto de PRIVATE/NOT_FOUND/CACHE_ONLY", async () => {
    // Import dinâmico só do módulo de tipos (sem deps server).
    const types = await import("@/lib/analysis/types");
    type Code = import("@/lib/analysis/types").PublicAnalysisErrorCode;
    const codes: Code[] = [
      "PROFILE_PERSONAL_NO_FEED",
      "PROFILE_PRIVATE",
      "PROFILE_NOT_FOUND",
      "CACHE_ONLY_NO_DATA",
    ];
    // 4 valores únicos
    expect(new Set(codes).size).toBe(4);
    // Sanity: o módulo importa sem dependências de Worker.
    expect(types).toBeDefined();
  });
});