## Âmbito

Refinar Bloco 1 (Visão geral) — `frequency-card.tsx` + `report-overview-engagement.tsx`. Sem alterar lógica de dados, scores ou copy fora dos títulos/status.

---

## 1. KPI strip no card "Frequência de publicação"

A informação proposta na imagem já existe no relatório, mas espalhada:

| KPI proposto       | Valor                 | Fonte (já calculada)                                      |
| ------------------ | --------------------- | --------------------------------------------------------- |
| Cadência           | `3,0 posts/sem`       | `postingFrequencyWeekly` (prop existente)                 |
| Consistência       | `41,4% dias activos`  | `publishedCount / windowedDays.length` (já no rodapé)     |
| Pico semanal       | `Terça`               | `pickMostActive(buckets).weekday` (já no WeeklySummary)   |

**Decisão de design:** consolidar num `KpiStrip` (3 colunas) imediatamente abaixo do header (acima do `WeeklySummary`), reaproveitando o padrão visual do `MetricsStrip` do `editorial-identity-card`:

- Card branco, border `border-default`, `divide-x` entre colunas, sem ícones (já há ícones no WeeklySummary mais abaixo).
- Eyebrow Inter uppercase (`text-eyebrow-sm`) → valor em Inter SemiBold tabular-nums (`text-[1.5rem]` desktop / `text-[1.25rem]` mobile) → micro-label Inter `text-xs` content-tertiary.
- "Pico semanal" usa cor `text-accent-primary` (#0077B6 Ocean) — único acento, alinhado com a nova paleta Ocean Breeze; sem cyan neon.
- Esconder o KPI strip quando `isInsufficient === true` (já há fallback de copy neutro).
- Como passa a haver KPI "Consistência (X% dias activos)" no topo, **remover** o `frequency.calendar.ratio` ("12/29") da legenda do calendário para evitar duplicação — fica só a legenda das cores.

**Cálculos (todos com dados já disponíveis no componente):**

```text
cadenciaSemanal     = postingFrequencyWeekly                  // formatDecimal(_, locale, 1)
consistenciaPct     = publishedCount / windowedDays.length    // 0–100, 1 casa
picoSemanalLabel    = weekdayLong[pickMostActive(buckets).weekday]
picoSemanalSubtitle = `${top.posts} posts` ou "—" se top.posts === 0
```

Ordem visual no card: Header → **KPI strip (novo)** → WeeklySummary → Calendar → Verdict.

---

## 2. Uniformizar títulos do Bloco 1

Padrão escolhido: **status inline a seguir ao título, palavra sublinhada com underline colorido** (igual ao que já está em `Frequência de publicação Alta` e `Formato Pouco variado`).

Mudança no `report-overview-engagement.tsx`:

- Remover o pill arredondado uppercase (`BAIXA`/`MÉDIA`/`ALTA`).
- Render: `Taxa de Engagement <span>Baixa</span>` com sublinhado colorido (verde/âmbar/vermelho) — mesma técnica de `frequency-card`.
- Manter eyebrow "ENGAGEMENT" por cima (consistente com o padrão dos outros dois cards).
- Garantir que o status em pt-PT está em **Title Case** (`Baixa`, `Média`, `Alta`), não uppercase — já existem chaves `engagement.status.*` em pt/report.json; verificar e ajustar se vierem em maiúsculas.

Resultado: os três cards do Bloco 1 partilham o mesmo padrão de header (`Título + <status sublinhado>` + subtitle), sem pills nem caps-lock.

---

## Ficheiros a tocar

1. `src/components/report-redesign/v2/overview/frequency-card.tsx`
   - Novo subcomponente `FrequencyKpiStrip` (cadência / consistência / pico).
   - Render entre header e `WeeklySummary`, gated em `!isInsufficient`.
   - Remover `frequency.calendar.ratio` da legenda do calendário.
2. `src/components/report-redesign/v2/report-overview-engagement.tsx`
   - Substituir o `<span>` pill por um `<span>` sublinhado inline dentro do `<h3>`.
   - Eliminar `pillClass` (deixa de ser usado).
3. `src/i18n/locales/pt/report.json` + `src/i18n/locales/en/report.json`
   - Novas chaves: `frequency.kpi.cadence_label`, `frequency.kpi.cadence_unit`, `frequency.kpi.consistency_label`, `frequency.kpi.consistency_caption`, `frequency.kpi.peak_label`, `frequency.kpi.peak_caption_posts_{one,other}`, `frequency.kpi.peak_caption_none`.
   - Confirmar `engagement.status.low/medium/high` em Title Case (`Baixa`/`Média`/`Alta`).

## Fora de âmbito

- Bloco 2+ (diagnóstico, top posts, capas, comentários).
- Sidebar, hero, ruler, lead-magnet.
- `/report.example`, dark mode, admin.
- Alterar lógica de cálculo de cadence/consistency (usar valores já calculados).

## Validação

- `bunx tsc --noEmit`.
- Preview `/analyze/frederico.m.carvalho` a 1460×905 e 411×742.
- Verificar:
  - [ ] KPI strip aparece com 3 colunas, valores Inter tabular-nums, "Terça" em Ocean.
  - [ ] Calendário deixa de mostrar "12/29" na legenda.
  - [ ] Engagement card tem "Taxa de Engagement Baixa" inline (sem pill).
  - [ ] Três cards do Bloco 1 partilham padrão de header.
  - [ ] Mobile: KPI strip stack-a em 1 coluna; sem overflow.

## Checkpoint
☐ KPI strip implementado e gated em isInsufficient
☐ Legenda do calendário sem "X/Y"
☐ Engagement card sem pill, com status sublinhado inline
☐ i18n pt + en atualizado
☐ tsc verde + preview QA desktop e mobile