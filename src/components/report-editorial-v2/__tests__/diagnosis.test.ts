import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { AdapterResult, SnapshotPayload } from "@/lib/report/snapshot-to-report-data";
import { buildEditorialDiagnosisData } from "../diagnosis/diagnosis-data";

const root = process.cwd();
const componentSrc = readFileSync(
  resolve(root, "src/components/report-editorial-v2/diagnosis/editorial-diagnosis.tsx"),
  "utf8",
);
const adapterSrc = readFileSync(
  resolve(root, "src/components/report-editorial-v2/diagnosis/diagnosis-data.ts"),
  "utf8",
);
const shellSrc = readFileSync(
  resolve(root, "src/components/report-editorial-v2/editorial-v2-shell.tsx"),
  "utf8",
);
const prodShellSrc = readFileSync(
  resolve(root, "src/components/report-redesign/v2/report-shell-v2.tsx"),
  "utf8",
);

function makePayload(n: number, extra: Record<string, unknown> = {}): SnapshotPayload {
  return {
    posts: Array.from({ length: n }, (_, i) => ({
      id: `p${i}`,
      taken_at_iso: `2026-08-${String((i % 27) + 1).padStart(2, "0")}T10:00:00.000Z`,
      caption:
        i % 2 === 0
          ? "Como fazer um guia passo a passo. Subscreve a newsletter no link da bio."
          : "Promoção com 20% de desconto na loja. Comenta aqui em baixo.",
      likes: 100 + i,
      comments: i % 3,
      media_type: "image",
    })),
    ...extra,
  } as unknown as SnapshotPayload;
}

function makeResult(over: Record<string, unknown> = {}): AdapterResult {
  return {
    data: { topHashtags: [], topKeywords: [], topThemes: [] },
    enriched: {
      profile: { bio: "Site: exemplo.pt", externalUrls: ["https://exemplo.pt"] },
      ...over,
    },
  } as unknown as AdapterResult;
}

describe("Editorial V2 — diagnóstico (06)", () => {
  it("não tem contagem de achados fixa: varia com os dados de entrada", () => {
    const small = buildEditorialDiagnosisData(makeResult(), makePayload(1));
    const large = buildEditorialDiagnosisData(makeResult(), makePayload(12));
    expect(large.threads.length).toBeGreaterThan(small.threads.length);
    expect(adapterSrc).not.toMatch(/slice\(0,\s*3\)\s*;?\s*\/\/\s*achados/);
  });

  it("devolve estado vazio verdadeiro sem dados", () => {
    const data = buildEditorialDiagnosisData(makeResult(), undefined);
    expect(data.empty).toBe(true);
    expect(data.threads).toHaveLength(0);
    expect(data.verdict).toBeNull();
  });

  it("usa o veredicto de IA persistido quando existe", () => {
    const data = buildEditorialDiagnosisData(
      makeResult({
        aiInsightsV2: { sections: { hero: { text: "Leitura persistida." } } },
      }),
      makePayload(10),
    );
    expect(data.verdict).toEqual({ text: "Leitura persistida.", source: "ia" });
  });

  it("cai no veredicto determinístico quando não há IA persistida", () => {
    const data = buildEditorialDiagnosisData(makeResult(), makePayload(10));
    if (data.verdict) expect(data.verdict.source).toBe("regra");
  });

  it("reflecte alterações reais dos dados nos números apresentados", () => {
    const a = buildEditorialDiagnosisData(makeResult(), makePayload(6));
    const b = buildEditorialDiagnosisData(makeResult(), makePayload(18));
    expect(JSON.stringify(a.threads)).not.toEqual(JSON.stringify(b.threads));
  });

  it("expõe estados verdadeiros de enrichment sem gerar nada", () => {
    const data = buildEditorialDiagnosisData(
      makeResult(),
      makePayload(8, {
        enrichment_status: { visual_cover: "pending", caption_semantic: "error" },
      }),
    );
    expect(data.notices.map((n) => `${n.id}:${n.kind}`)).toEqual(
      expect.arrayContaining(["visual_cover:pending", "caption_semantic:error"]),
    );
  });

  it("só usa capas quando a análise persistida é válida", () => {
    const invalid = buildEditorialDiagnosisData(
      makeResult(),
      makePayload(8, { visual_cover_analysis: { foo: 1 } }),
    );
    expect(invalid.threads.find((t) => t.id === "capas")).toBeUndefined();

    const valid = buildEditorialDiagnosisData(
      makeResult(),
      makePayload(8, {
        visual_cover_analysis: {
          overallScore: 62,
          status: "needs_improvement",
          analyzedCount: 9,
          aggregate: { humanPresencePct: 40, textInImagePct: 20 },
          diagnostic: { main: "Capas pouco reconhecíveis." },
        },
      }),
    );
    const cover = valid.threads.find((t) => t.id === "capas");
    expect(cover?.source).toBe("ia");
    expect(cover?.observations.join(" ")).toContain("62");
  });

  it("separa observação de leitura em todos os fios", () => {
    const data = buildEditorialDiagnosisData(makeResult(), makePayload(12));
    for (const thread of data.threads) {
      expect(thread.observations.length).toBeGreaterThan(0);
      expect(typeof thread.title).toBe("string");
    }
  });

  it("não faz fetch, IA nem geração durante o render", () => {
    expect(adapterSrc).not.toMatch(/\bfetch\(|supabase|openai|useQuery/i);
    expect(componentSrc).not.toMatch(/\bfetch\(|supabase|openai|useQuery/i);
  });

  it("não contém números fixos vindos do HTML de referência nem mocks", () => {
    expect(adapterSrc).not.toMatch(/mock|fixture|placeholder/i);
    expect(componentSrc).not.toMatch(/mock|fixture/i);
  });

  it("o gate Pro do Editorial V2 espelha exactamente o de produção", () => {
    expect(shellSrc).toContain(
      'premiumUnlocked && features.blockDiagnosis !== "hidden"',
    );
    expect(prodShellSrc).toContain('features.blockDiagnosis !== "hidden"');
  });

  it("mantém o placeholder de desenvolvimento apenas para prioridades", () => {
    expect(shellSrc).toContain('data-ev2-dev-placeholder="prioridades"');
    expect(shellSrc).not.toContain('data-ev2-dev-placeholder="pro-sections"');
  });

  it("a produção continua a usar o bloco de diagnóstico existente", () => {
    expect(prodShellSrc).toContain("ReportDiagnosticBlock");
    expect(prodShellSrc).not.toContain("EditorialDiagnosis");
  });

  it("não expõe conteúdo do laboratório interno", () => {
    expect(adapterSrc).not.toMatch(/internal_lab|isLab/);
    expect(componentSrc).not.toMatch(/internal_lab|isLab/);
  });

  it("usa o rótulo de apresentação 06 sem o transformar em chave", () => {
    expect(componentSrc).toContain(
      'EDITORIAL_V2_DISPLAY_NUMBERS["diagnostico-editorial"]',
    );
    expect(componentSrc).toContain('id="diagnostico-editorial"');
  });
});
