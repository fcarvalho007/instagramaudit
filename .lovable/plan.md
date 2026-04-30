
# Plano · Camada de credibilidade dos benchmarks

## Tensão crítica a resolver primeiro

O dataset canónico em `src/lib/knowledge/benchmark-context.ts` tem uma **regra explícita** desde a versão actual:

```ts
sources: [
  { name: "Socialinsider", uiDisplayAllowed: true, linksAllowedInReport: false },
  { name: "Buffer",        uiDisplayAllowed: true, linksAllowedInReport: false },
  { name: "Hootsuite",     uiDisplayAllowed: true, linksAllowedInReport: false },
  { name: "Databox",       uiDisplayAllowed: true, linksAllowedInReport: false },
]
```

E a `KnowledgeNote` "Política de fontes de benchmark" reforça: **nomes podem aparecer, URLs nunca**.

O teu pedido pede o oposto — referências `[1][2]` clicáveis em `target="_blank"`. Há três caminhos possíveis:

| Opção | O que muda | Consequência |
|---|---|---|
| **A · Manter regra: nomes sem links** | Mostra `Referência de mercado · Instagram · contas 5K–10K · Socialinsider · Buffer` (chips de nome, sem URL clicável). Abre tooltip/popover com o nome e a função editorial da fonte. | Coerente com a regra actual. Perde-se a "prova" externa. |
| **B · Levantar a regra: nomes + links** *(o que pedes)* | Flip `linksAllowedInReport: true`. Renderiza `[1][2]` clicáveis. URLs vivem só no dataset. Bump de `BENCHMARK_DATASET_VERSION` para `2026-04-30b` (invalida cache de insights v2). | Máxima credibilidade externa. Risco editorial: sair do relatório no momento de leitura. |
| **C · Híbrido por contexto** | Bloco 01 mostra **só nomes** (leitura rápida). A secção `ReportMethodology` ganha um bloco "Fontes de referência" com a lista completa + URLs clicáveis (sítio único onde se pode "verificar"). | Mantém o relatório limpo, dá rastreabilidade num só sítio. |

**Recomendação:** **Opção C**. Resolve a credibilidade sem poluir cada cartão e mantém a doutrina "URLs vivem na metodologia, não no corpo".

→ **Pergunta-chave antes de avançar: qual destas três opções queres?**

Vou assumir **C** no resto do plano. Se preferires A ou B, ajusto.

---

## R7 · Confidence/quality nas referências

Adiciono à tua sugestão: cada `BenchmarkSource` ganha `referenceQuality: "high" | "medium" | "low"` (não `confidence`, para não confundir com a confidence dos AI insights). Critério inicial:

- **high** — Socialinsider, Buffer (datasets grandes, públicos, com metodologia).
- **medium** — Hootsuite (cross-industry, agregados, metodologia menos transparente).
- **low** — Databox (futuro/inspiracional, hoje não usamos para valores).

Isto **não muda a UI agora** mas destranca futuras leituras de "intervalo de mercado".

---

## Arquitectura proposta

### 1. Knowledge Base (sem schema novo)

Tudo em **TypeScript estático** dentro do dataset canónico já existente. Sem migrações Supabase, sem writes. As tabelas `knowledge_sources` / `knowledge_benchmarks` continuam a servir o admin e o orquestrador AI; o que adicionamos é a camada **editorial** que a UI lê.

Estendo `BenchmarkSource` em `src/lib/knowledge/benchmark-context.ts`:

```ts
export interface BenchmarkSource {
  name: BenchmarkSourceName;
  role: string;
  uiDisplayAllowed: boolean;
  linksAllowedInReport: boolean;
  // novos
  url: string;                 // só usado em <ReportMethodology>
  publishedYear: number;
  shortDescription: string;    // 1 linha pt-PT — vai à metodologia
  referenceQuality: "high" | "medium" | "low";
}
```

URLs registados (já vêm do teu briefing):

- Socialinsider → `https://www.socialinsider.io/social-media-benchmarks/instagram` · 2025 · `high`
- Buffer → `https://buffer.com/insights/instagram-benchmarks` · 2025 · `high`
- Hootsuite → `https://blog.hootsuite.com/social-media-benchmarks/` · 2025 · `medium`
- Databox → `https://databox.com/benchmarks/instagram-benchmarks` · 2025 · `low`

Bump de `BENCHMARK_DATASET_VERSION` → `2026-04-30b`.

### 2. Componente novo · `ReportBenchmarkEvidence`

Ficheiro: `src/components/report-redesign/v2/report-benchmark-evidence.tsx`

Render minimalista:

```text
Referência de mercado · Instagram · contas 5K–10K · Socialinsider · Buffer
```

Sem `[1][2]` clicáveis (Opção C). Os nomes ficam como **chips mono pequenos** com `title` + `aria-label` que lêem "Fonte: Socialinsider — ver detalhes na metodologia".

Props:

```ts
type Props = {
  platform: "instagram";
  followerTier?: string | null;       // já formatado: "0–1K", "5–10K"...
  industry?: string | null;           // só se realmente conhecido
  sourceNames: BenchmarkSourceName[]; // 1 a 3 nomes
  className?: string;
};
```

**Regra anti-invenção:**
- `followerTier` derivado por `getBufferTierForFollowers(followers).tier`. Se `null` → omitir o segmento.
- `industry` só renderiza se `industry !== null` — caso contrário usa "referência geral de mercado".
- `sourceNames` filtrados por `uiDisplayAllowed === true`.

### 3. `EngagementRateCard` — wire-up

Em `src/components/report-redesign/v2/report-overview-cards.tsx`:

- Calcular `bufferTier` a partir de `result.data.profile.followers` (já disponível). Vem por prop nova `followers` ao `EngagementRateCard`.
- Substituir o **chip duplo** actual (`CÁLCULO ·` + `REFERÊNCIA EXTERNA · KNOWLEDGE BASE`) por:
  - Header: `CÁLCULO · GOSTOS + COMENTÁRIOS` (mantém-se).
  - Junto à linha "vs. 4,20% de referência": substituir o chip de `external` pelo `<ReportBenchmarkEvidence …>`.

Resultado visual em mobile:

```text
vs. 4,20% de referência
Referência de mercado · Instagram · contas 5K–10K · Socialinsider · Buffer
```

### 4. `ReportMethodology` — bloco "Fontes de referência"

Em `src/components/report-redesign/report-methodology.tsx`, **abaixo** da grelha de legenda dos chips (R1 que já fizemos), adicionar:

```text
Fontes de referência                        DATASET 2026-04-30b
[📖] Socialinsider 2025 · Estudo agregado de envolvimento e formato.   ↗
[📖] Buffer 2025      · Benchmarks por dimensão de conta.              ↗
[📖] Hootsuite 2025   · Contexto cross-indústria.                      ↗
[📖] Databox 2025     · Inspiração para futura ligação autenticada.    ↗
```

Cada linha:
- ícone `BookOpen` (mantém coerência com `external` chip)
- nome + ano + 1 linha de `shortDescription`
- link `↗` à direita, `target="_blank" rel="noopener noreferrer"`, `aria-label="Abrir página da Socialinsider numa nova aba"`
- chip discreto `referenceQuality` só quando `medium`/`low` — `high` fica implícito (sem ruído).

Sem URLs visíveis no texto. Só o ícone `↗` é clicável.

### 5. Distinção benchmark ≠ concorrentes diretos

Adicionar **um** bloco discreto, **uma única vez**, em `ReportMethodology` (não em cada cartão), logo abaixo das fontes:

```text
Comparação direta com concorrentes
Disponível no plano Pro: adicionar perfis concorrentes para
comparar este perfil com contas reais do mesmo mercado.
[ Adicionar concorrente · Pro ]   ← botão ghost disabled
```

Botão `disabled` com `title="Disponível no plano Pro"` — sem onClick, sem rota, sem feature.

### 6. Regra editorial reforçada

Adicionar **uma frase** ao parágrafo de explicação na metodologia:

> "Estas referências usam estudos públicos de mercado para dar contexto aos resultados. Quando não há setor definido, a comparação é feita por plataforma e dimensão aproximada da conta."

(Substitui a frase actual que descreve só os 5 chips.)

---

## Fora do âmbito

- **Não** adicionamos `BenchmarkReference` granular por métrica/indústria/geografia (o teu type spec do briefing). O dataset actual já cobre os casos vivos (engagement, frequência, formato). Estender o modelo seria sobre-engenharia para o que a UI consome hoje — fica para o momento em que existir um segundo cartão a comparar com benchmark.
- **Não** mexemos em `/report/example` (locked).
- **Não** tocamos em providers, AI prompts, PDF, admin, validators.
- **Não** criamos schema novo no Supabase.
- **Não** adicionamos packages.
- **Não** mudamos o `report-kpi-grid.tsx` legacy nem o `report-kpi-grid-v2.tsx` — a evidência só entra no `EngagementRateCard` cinematográfico do overview.

---

## Detalhes técnicos

**Ficheiros a editar:**

- `src/lib/knowledge/benchmark-context.ts` — estender `BenchmarkSource` (url, publishedYear, shortDescription, referenceQuality), bump `BENCHMARK_DATASET_VERSION`.
- `src/lib/knowledge/__tests__/benchmark-context.test.ts` — actualizar assertions sobre fontes; adicionar test para `referenceQuality`.
- `src/components/report-redesign/v2/report-benchmark-evidence.tsx` — **novo**.
- `src/components/report-redesign/v2/report-overview-cards.tsx` — passar `followers` ao `EngagementRateCard`, substituir chip `external` pelo novo componente.
- `src/components/report-redesign/report-methodology.tsx` — bloco "Fontes de referência" + bloco "Comparação direta com concorrentes" + frase editorial.

**Validação:**
- `bunx tsc --noEmit`
- `bunx vitest run`
- QA visual a 375 / 768 / desktop em `/analyze/frederico.m.carvalho`

---

## Checkpoint

☐ R-Decisão · Confirmar Opção C (nomes em-card + URLs só na metodologia)
☐ KB1 · Estender `BenchmarkSource` com url + publishedYear + shortDescription + referenceQuality
☐ KB2 · Bump `BENCHMARK_DATASET_VERSION` → `2026-04-30b`
☐ UI1 · Criar `ReportBenchmarkEvidence`
☐ UI2 · Wire-up no `EngagementRateCard` (passar followers, substituir chip)
☐ UI3 · Bloco "Fontes de referência" na metodologia (com `target="_blank" rel="noopener noreferrer"` + aria-labels)
☐ UI4 · Teaser "Comparação direta com concorrentes · Pro" (botão disabled)
☐ UI5 · Frase editorial actualizada
☐ Tests · `benchmark-context.test.ts` actualizado
☐ TS pass · Vitest pass · QA 375/768/desktop

**Aprovas Opção C com este plano? Se preferires A ou B, indica e ajusto antes de avançar.**
