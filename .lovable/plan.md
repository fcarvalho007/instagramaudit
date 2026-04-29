# R3 · Conclusão (Partes 2 e 3)

A Parte 1 (insights v2 alimentados pela Knowledge Base) já está em produção: tipos `AiInsightsV2` em `src/lib/insights/types.ts`, prompt v2, validador, integração no `analyze-public-v1` e cache em `normalized_payload.ai_insights_v2`. Falta:

- **Parte 2** — server function nova de histórico + reforços gráficos
- **Parte 3** — 5 refinamentos visuais no shell real

Tudo mantém-se dentro de `/analyze/$username`. `/report/example` permanece intacto (LOCKED).

---

## Parte 2 — Server function + reforços gráficos

### 2.1 Histórico de engagement (4 análises)

**Novo:** `src/lib/server/profile-history.functions.ts`
- `getProfileEngagementHistory({ handle, limit = 4 })` — `createServerFn` que consulta `analysis_snapshots` filtrando por `instagram_username`, ordenado por `created_at desc`, lê `normalized_payload.profile.engagement_pct` e `meta.generated_at`. Devolve `Array<{ analyzedAt, engagementPct }>` (apenas snapshots com valor numérico).
- Sem RLS conflict — usa o cliente Supabase do servidor já configurado para `analyze-public-v1`.

**Novo componente:** `src/components/report-redesign/report-engagement-history.tsx`
- Recebe `handle` + valor actual. Faz fetch via server fn no `useEffect`.
- Renderiza 4 mini-barras horizontais alinhadas (cinza claro a azul) + data abreviada (`dd MMM`). Estilo Iconosquare.
- Estados: loading skeleton; <2 análises → `<p>` discreto "Histórico aparecerá após próximas análises".
- Tudo com tokens light (`accent-primary`, `surface-muted`, `content-tertiary`).

**Edição:** `src/components/report/report-benchmark-gauge.tsx`
- Adiciona render do `<ReportEngagementHistory handle={...} current={m.engagementRate} />` por baixo do "Gap" (dentro do mesmo card branco).

### 2.2 Cartões de formato — barras duplas (Actual vs Bench)

**Edição:** `src/components/report/report-format-breakdown.tsx`
- Substitui a única barra + tick por **duas barras paralelas** ("Atual" e "Benchmark"), cada uma com label mono à esquerda e valor à direita.
- Cor da barra "Atual" depende da posição face ao bench:
  - acima → `bg-signal-success`
  - ligeiramente acima → `bg-accent-primary`
  - abaixo → `bg-signal-danger`
- Barra "Benchmark" sempre `bg-content-tertiary/40` (cinza neutro).
- Mantém badge de status, ícone de formato, share %.

### 2.3 Hashtags ordenadas por engagement

**Edição:** `src/components/report/report-hashtags-keywords.tsx`
- Bloco hashtags: ordenar `topHashtags` por `avgEngagement` desc (não por `uses`).
- Largura da barra reflecte `avgEngagement / max(avgEngagement)`.
- Badge mostra `{uses} usos` em mono pequeno (mantém o sinal de frequência mas secundário).
- Cor única `bg-accent-primary` (já está, mas remover qualquer variação herdada).

---

## Parte 3 — 5 refinamentos visuais

### 3.1 Market signals · Strip horizontal

**Novo:** `src/components/report-market-signals/market-stats-strip.tsx`
- Variante linear horizontal das 4 métricas (Strongest, Keywords, Trend, Suggestion). 
- Em desktop: 4 colunas separadas por `divide-x divide-slate-200/70`. Em mobile: stack vertical compacto.
- Mesmo conteúdo do `MetricCard` actual mas sem cards individuais — ar mais editorial.

**Edição:** `src/components/report-market-signals/report-market-signals.tsx`
- Substitui a `<div className="grid ... sm:grid-cols-2">` (linhas 411-446) pelo `<MarketStatsStrip ... />`.
- Mantém chart, chips, footer de quota intactos.

### 3.2 Methodology + dataset source unificados

**Edição:** `src/components/report-redesign/report-methodology.tsx`
- Aceita prop opcional `enriched?: ReportEnriched`.
- Quando presente, anexa por baixo da grid de 4 cards uma linha fina com "Dataset · vXX · nota" (texto do `ReportEnrichedBenchmarkSource`), separada por `border-t border-slate-200/70 pt-4`.

**Edição:** `src/components/report-redesign/report-shell.tsx`
- Passa `enriched={result.enriched}` ao `<ReportMethodology />`.
- Remove a chamada separada `<ReportEnrichedBenchmarkSource />` (deixa de existir como bloco autónomo).

### 3.3 Bloco final · 3 botões em linha

**Edição:** `src/components/report-share/report-final-block.tsx`
- Reorganiza para `<div className="flex flex-col sm:flex-row gap-3">` com 3 botões iguais em altura: **PDF (primário azul)** · **Partilhar (ghost)** · **Link público (ghost com ícone copy)**.
- Header simplificado: 1 eyebrow + 1 título + 1 linha de hint (remove o parágrafo grande).
- Mantém fallback PDF e estado loading.

### 3.4 Beta feedback · Banner full-width

**Novo bloco:** dentro do `report-shell.tsx`, antes do `<Footer />` (após `<ReportFinalBlock />`).
- Container `max-w-7xl` com card branco bordo subtil, padding generoso, 2 colunas: copy à esquerda + CTA à direita.
- Reusa `BETA_COPY.feedback` já importado.

**Edição:** `report-final-block.tsx`
- Remove o bloco "feedback beta" do interior do card final (linhas 127-141). Passa a viver fora.

### 3.5 Footer dedup

**Edição:** `src/components/layout/footer.tsx`
- Remover secções comerciais redundantes (CTA "Pedir relatório", "Como funciona", se duplicam navegação que já vive no header).
- Manter: logo + tagline curta + 1 coluna de links institucionais (Privacidade, Termos, Contacto) + créditos.

---

## Detalhes técnicos

**Server function pattern** (`profile-history.functions.ts`):
```ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const getProfileEngagementHistory = createServerFn({ method: "GET" })
  .inputValidator((i) => z.object({ handle: z.string().min(1), limit: z.number().int().min(1).max(20).default(4) }).parse(i))
  .handler(async ({ data }) => {
    const supabase = createSupabaseServerClient();
    const { data: rows } = await supabase
      .from("analysis_snapshots")
      .select("created_at, normalized_payload")
      .eq("instagram_username", data.handle.toLowerCase())
      .eq("analysis_status", "ready")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    return (rows ?? [])
      .map((r) => ({
        analyzedAt: r.created_at,
        engagementPct: Number(r.normalized_payload?.profile?.engagement_pct ?? NaN),
      }))
      .filter((r) => Number.isFinite(r.engagementPct));
  });
```

**Tokens já existentes** (verificado): `--accent-primary`, `--signal-success`, `--signal-danger` em `tokens-light.css`. Não é preciso adicionar tokens novos para as barras Actual/Bench — usamos os existentes via classes Tailwind (`bg-signal-success`, etc).

**Sem mudanças DB**: tudo lê do que já existe em `analysis_snapshots`.

**Sem novos secrets/dependências**.

---

## Checklist (execução nesta ordem)

- ☐ Criar `src/lib/server/profile-history.functions.ts`
- ☐ Criar `src/components/report-redesign/report-engagement-history.tsx`
- ☐ Editar `report-benchmark-gauge.tsx` (incluir histórico)
- ☐ Editar `report-format-breakdown.tsx` (barras duplas)
- ☐ Editar `report-hashtags-keywords.tsx` (ordenação por engagement)
- ☐ Criar `market-stats-strip.tsx`
- ☐ Editar `report-market-signals.tsx` (usar strip)
- ☐ Editar `report-methodology.tsx` (recebe enriched)
- ☐ Editar `report-shell.tsx` (props + remover bloco redundante + adicionar banner feedback)
- ☐ Editar `report-final-block.tsx` (3 botões + remover feedback interno)
- ☐ Editar `layout/footer.tsx` (dedup)
- ☐ Verificar `/analyze/frederico.m.carvalho` (preview real, dark→light no /report)
- ☐ Confirmar que `/report/example` continua intacto (LOCKED)
