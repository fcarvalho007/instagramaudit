# R1.1 — Polimento mínimo do /report

Pequenos refinamentos cirúrgicos ao `/analyze/$username` após o smoke test do `frederico.m.carvalho` que validou a persistência resiliente do snapshot. Sem mudar a arquitectura, sem tocar no `/report.example`, sem visual QA pesado.

## Diagnóstico do estado actual

O smoke test confirmou que:
1. O snapshot base persiste antes do OpenAI (resiliência OK).
2. O `ReportAiReading` esconde-se silenciosamente quando `ai_insights_v1` está ausente.
3. O `humanize()` já neutraliza tokens técnicos no render.
4. Existe pré-hidratação do tema light antes do primeiro paint.

Pontos identificados que merecem polimento mínimo (todos pequenos, todos não-arquitecturais):

| # | Issue | Localização | Severidade |
|---|---|---|---|
| 1 | Badge "IA editorial · empty" mostra-se igual a um ausente sem distinguir "snapshot recente sem IA ainda" de "IA falhou" | `report-hero.tsx:101-104` | Médio |
| 2 | `humanize()` não cobre todos os tokens vistos em snapshots reais (`avg_engagement`, `posts_per_week`, `reach_rate`, `bench_vs_market`) | `report-ai-reading.tsx:17-25` | Médio |
| 3 | `AnalysisErrorState` mostra a mesma copy genérica para todos os erros — não distingue "perfil privado/inexistente" de "falha temporária" | `analysis-error-state.tsx` | Baixo |
| 4 | Mensagem de erro propagada do snapshot (`body.message`) pode conter strings técnicas (codes Apify/DataForSEO) — risco de leak editorial | `analyze.$username.tsx:122-129` | Médio |
| 5 | Quando OpenAI falha, não há nenhum sinal subtil ao leitor de que a leitura editorial está pendente — apenas desaparece. Para o admin é OK; para o utilizador final fica estranho | `report-shell.tsx:62` | Baixo |

## Mudanças propostas (todas pequenas)

### 1. Distinguir estados do badge "IA editorial"
**Ficheiro:** `src/components/report-redesign/report-hero.tsx`

Ao invés de `status={enriched.aiInsights ? "real" : "empty"}`, esconder o badge por completo quando não existe leitura. Razão: mostrar "IA editorial · vazio" no Hero é ruído — a secção `ReportAiReading` já se esconde a si própria, o badge deve seguir o mesmo princípio.

```tsx
{enriched.aiInsights ? (
  <CoverageBadge label="IA editorial" status="real" />
) : null}
```

### 2. Estender `TECH_REPLACEMENTS` no `humanize()`
**Ficheiro:** `src/components/report-redesign/report-ai-reading.tsx`

Adicionar mapeamentos para tokens vistos em snapshots reais:
- `avg_engagement` → "envolvimento médio"
- `posts_per_week` → "ritmo de publicação"
- `reach_rate` → "alcance médio"
- `bench_vs_market` → "comparação com o mercado"
- `format_mix` → "mistura de formatos"
- `top_format` → "formato com mais retorno"

Mantém-se a regra: substituições só na camada de apresentação, sem mutar dados.

### 3. Sanitizar mensagens de erro propagadas
**Ficheiro:** `src/routes/analyze.$username.tsx`

Criar um pequeno mapeador na função `load()` que converte `error_code` conhecidos em copy editorial pt-PT:

| `error_code` | Copy editorial |
|---|---|
| `profile_not_found` | "Não encontrámos este perfil no Instagram. Confirma o nome de utilizador." |
| `profile_private` | "Este perfil é privado. Só conseguimos analisar perfis públicos." |
| `apify_disabled` / `not_allowlisted` | "Análise temporariamente indisponível. Tenta dentro de instantes." |
| `upstream_error` / outros | mensagem actual genérica |

Nunca propagar `body.message` cru se `error_code` for desconhecido — usar fallback editorial.

### 4. Sinal subtil de "leitura pendente" (opcional, gated)
**Ficheiro:** `src/components/report-redesign/report-shell.tsx`

Quando `result.data.aiInsights.length === 0` mas o snapshot é recente (< 5 min), mostrar um pequeno aviso editorial entre o KPI grid e o Market Signals:

```
"A leitura editorial deste perfil está a ser preparada. Volta em alguns
minutos para a versão completa."
```

Quando o snapshot é antigo (> 5 min) sem insights, esconder por completo (estado actual).

Implementação: comparar `result.profile.analyzedAt` com `Date.now()`.

### 5. (Não fazer agora) — adiar
- Refactor maior do `AnalysisErrorState` com ilustrações distintas por tipo de erro → R1.2
- Telemetria de "leitura editorial pendente vs falhada" no /admin → R3
- Substituir copy mock por leitura KB-aware → R3 (já planeado)

## Checkpoint (☐)

- ☐ Badge "IA editorial" no Hero esconde-se quando ausente (não mostra "empty")
- ☐ `humanize()` cobre os 6 novos tokens
- ☐ `analyze.$username.tsx` usa mapa de `error_code` → copy editorial pt-PT
- ☐ `body.message` nunca é mostrado cru ao utilizador
- ☐ Aviso "leitura a ser preparada" aparece apenas para snapshots recentes (< 5 min) sem insights
- ☐ `/report.example` continua intacto
- ☐ Tokens de design respeitados (sem cores hardcoded)
- ☐ Copy 100% pt-PT, Acordo Ortográfico, sem "você"

## Ficheiros tocados (5)

1. `src/components/report-redesign/report-hero.tsx` — badge condicional
2. `src/components/report-redesign/report-ai-reading.tsx` — humanize estendido
3. `src/routes/analyze.$username.tsx` — mapa de error_code
4. `src/components/report-redesign/report-shell.tsx` — aviso de leitura pendente
5. (eventual) `src/components/report-redesign/report-pending-ai-notice.tsx` — novo componente pequeno para o aviso

## Fora de âmbito

- BD, RLS, edge functions
- `/admin` (qualquer tab)
- `/report.example`
- Smoke tests adicionais a perfis novos
- Visual QA de PDFs
- Componentes locked listados em `LOCKED_FILES.md`
