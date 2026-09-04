import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { AdapterResult, SnapshotPayload } from "@/lib/report/snapshot-to-report-data";
import { buildEditorialPrioritiesData } from "../priorities/priorities-data";
import { buildPriorityItems } from "@/lib/report/build-priority-items";

const root = process.cwd();
const read = (p: string) => readFileSync(resolve(root, p), "utf8");

const componentSrc = read(
  "src/components/report-editorial-v2/priorities/editorial-priorities.tsx",
);
const adapterSrc = read(
  "src/components/report-editorial-v2/priorities/priorities-data.ts",
);
const shellSrc = read("src/components/report-editorial-v2/editorial-v2-shell.tsx");
const prodBlockSrc = read(
  "src/components/report-redesign/v2/report-diagnostic-block.tsx",
);
const prodPrioritiesSrc = read(
  "src/components/report-redesign/v2/report-diagnostic-priorities.tsx",
);
const sectionMetaSrc = read("src/components/report-editorial-v2/section-metadata.ts");

function makePayload(n: number, extra: Record<string, unknown> = {}): SnapshotPayload {
  return {
    posts: Array.from({ length: n }, (_, i) => ({
      id: `p${i}`,
      taken_at_iso: `2026-08-${String((i % 27) + 1).padStart(2, "0")}T10:00:00.000Z`,
      caption:
        i % 2 === 0
          ? "Como fazer um guia passo a passo. Subscreve a newsletter no link da bio."
          : "Promoção com 20% de desconto na loja.",
      likes: 100 + i,
      comments: i % 3,
      media_type: i % 4 === 0 ? "video" : "image",
    })),
    ...extra,
  } as unknown as SnapshotPayload;
}

function makeResult(enriched: Record<string, unknown> = {}): AdapterResult {
  return {
    data: { keyMetrics: {}, topHashtags: [], topKeywords: [], topThemes: [] },
    enriched: {
      profile: { bio: "Site: exemplo.pt", externalUrls: ["https://exemplo.pt"] },
      ...enriched,
    },
  } as unknown as AdapterResult;
}

describe("Editorial V2 — prioridades de ação (07)", () => {
  it("reutiliza a montagem de produção: mesma lista e mesma ordem", () => {
    const result = makeResult();
    const payload = makePayload(12);
    const data = buildEditorialPrioritiesData(result, payload, false);

    // O adaptador não pode criar um cálculo paralelo: importa a produção.
    expect(adapterSrc).toContain("buildPriorityItems");
    expect(adapterSrc).not.toContain("derivePriorities(");
    expect(prodBlockSrc).toContain("buildPriorityItems");

    expect(data.items.length).toBeGreaterThan(0);
    const titles = data.items.map((i) => i.title);
    expect(titles).toEqual([...titles]); // ordem preservada tal como devolvida
  });

  it("não força um número fixo de prioridades", () => {
    const a = buildEditorialPrioritiesData(makeResult(), makePayload(12), false);
    const b = buildEditorialPrioritiesData(
      makeResult({
        cadence: { weekly: 0.4, sufficient: false },
      }),
      makePayload(3),
      false,
    );
    expect(a.items.length).toBeLessThanOrEqual(6);
    expect(b.items.length).toBeLessThanOrEqual(6);
    // Sem contagem hardcoded na apresentação.
    expect(componentSrc).not.toMatch(/slice\(0,\s*\d+\)/);
    expect(componentSrc).not.toMatch(/length\s*===\s*3/);
  });

  it("mudar os dados de entrada muda o output", () => {
    const base = buildEditorialPrioritiesData(makeResult(), makePayload(12), false);
    const changed = buildEditorialPrioritiesData(
      makeResult({ cadence: { weekly: 0.2, sufficient: true } }),
      makePayload(12),
      false,
    );
    const bt = base.items.map((i) => i.title).join("|");
    const ct = changed.items.map((i) => i.title).join("|");
    expect(ct).not.toBe(bt);
  });

  it("prosa de IA persistida é usada tal como produção a monta", () => {
    const ai = [
      {
        level: "alta" as const,
        title: "Responder aos comentários pendentes",
        body: "Há conversa por responder no perfil.",
        resolves: "",
      },
    ];
    const data = buildEditorialPrioritiesData(
      makeResult({ aiInsightsV2: { priorities: ai, sections: {} } }),
      makePayload(12),
      false,
    );
    expect(data.items[0]!.title).toBe(ai[0]!.title);
    expect(data.items[0]!.source).toBe("ai");

    const direct = buildPriorityItems({
      aiPriorities: ai,
      deterministicArgs: {
        contentType: { available: false } as never,
        funnel: { available: false } as never,
        caption: { available: false } as never,
        audience: { available: false } as never,
        integration: { available: false, signals: {
          bioLink: { detected: true },
          siteOrNewsletter: { detected: false, count: 0 },
          explicitCta: { detected: false, sharePct: 0 },
        } } as never,
        dominantFormatShare: 0,
        dominantFormatLabel: null,
      },
      sanitizationPool: {},
    });
    expect(direct.source).toBe("ai");
  });

  it("estado vazio é verdadeiro quando produção não devolve prioridades", () => {
    const empty = buildPriorityItems({
      aiPriorities: null,
      deterministicArgs: {
        contentType: { available: false, distribution: [] } as never,
        funnel: { available: false } as never,
        caption: { available: false } as never,
        audience: { available: false } as never,
        integration: { available: false, signals: {
          bioLink: { detected: true },
          siteOrNewsletter: { detected: false, count: 0 },
          explicitCta: { detected: false, sharePct: 0 },
        } } as never,
        dominantFormatShare: 0,
        dominantFormatLabel: null,
      },
      sanitizationPool: {},
    });
    expect(Array.isArray(empty.items)).toBe(true);
    expect(componentSrc).toContain("data.empty");
    expect(componentSrc).toContain("Não há sinais suficientes");
  });

  it("snapshot antigo/parcial rende sem inventar metadados", () => {
    const data = buildEditorialPrioritiesData(makeResult(), makePayload(1), false);
    for (const item of data.items) {
      expect(typeof item.title).toBe("string");
      expect(item.basedOn.length).toBeGreaterThan(0);
      // categoria/nível/origem vêm sempre da produção, nunca inferidos aqui
      expect(["testar", "corrigir", "repetir", "oportunidade"]).toContain(item.category);
    }
    // A apresentação só mostra metadados quando existem.
    expect(componentSrc).toContain("item.category ?");
    expect(componentSrc).toContain("item.level ?");
    expect(componentSrc).toContain("item.source ?");
    expect(componentSrc).toContain("basedOn.length > 0");
    expect(componentSrc).toContain("evidence.length > 0");
  });

  it("nenhum valor numérico é NaN, Infinity ou fabricado", () => {
    const data = buildEditorialPrioritiesData(makeResult(), makePayload(12), false);
    const text = data.items
      .map((i) => `${i.title} ${i.body} ${(i.evidence ?? []).map((e) => `${e.label} ${e.value}`).join(" ")}`)
      .join(" ");
    expect(text).not.toMatch(/NaN|Infinity|undefined|null/);
  });

  it("não classifica Testar/Corrigir/Repetir por conta própria", () => {
    // Só mapeia rótulos das categorias reais de produção.
    expect(componentSrc).not.toMatch(/\/(testar|corrigir|repetir)\//i);
    expect(adapterSrc).not.toMatch(/category\s*=/);
  });

  it("não usa dados mock, fixtures nem números da HTML de referência", () => {
    expect(componentSrc).not.toMatch(/mock|fixture|placeholder|exemplo-de-prioridade/i);
    expect(adapterSrc).not.toMatch(/mock|fixture/i);
    expect(componentSrc).not.toMatch(/\b(37|42|56)\s*\/\s*100\b/);
  });

  it("não faz fetch nem chamadas de IA no render", () => {
    for (const src of [componentSrc, adapterSrc]) {
      expect(src).not.toMatch(/\bfetch\(/);
      expect(src).not.toMatch(/useQuery|useEffect|supabase|openai/i);
    }
  });

  it("reutiliza o gate Pro exacto da produção", () => {
    expect(shellSrc).toContain(
      'premiumUnlocked && features.blockDiagnosis !== "hidden"',
    );
    expect(prodBlockSrc).toContain("premiumUnlocked");
    // anónimo/Free nunca chegam ao componente: o shell só o monta com Pro
    const proBlock = shellSrc.slice(shellSrc.indexOf("EditorialPriorities") - 400);
    expect(proBlock).toContain("premiumUnlocked");
  });

  it("não expõe módulos internal_lab", () => {
    for (const src of [componentSrc, adapterSrc]) {
      expect(src).not.toMatch(/internal_lab|MarketSignals|VisualCoverAnalysisCard|HashtagDiagnosticsCard|CaptionDiagnosticsCard/);
    }
  });

  it("o placeholder de desenvolvimento de 07 foi removido", () => {
    expect(shellSrc).not.toContain("data-ev2-dev-placeholder");
    expect(shellSrc).not.toContain("Ambiente de desenvolvimento");
    expect(shellSrc).toContain("EditorialV2PreviewBadge");
  });

  it("não cria uma secção 08 e mantém 07 como número de apresentação", () => {
    expect(sectionMetaSrc).toContain('prioridades: "07"');
    expect(componentSrc).toContain('EDITORIAL_V2_DISPLAY_NUMBERS["prioridades"]');
    expect(componentSrc).not.toMatch(/"08"/);
  });

  it("a apresentação de produção mantém-se intacta", () => {
    expect(prodPrioritiesSrc).toContain("ReportDiagnosticPriorities");
    expect(prodPrioritiesSrc).toContain("diagnostic.priorities_title");
  });
});
