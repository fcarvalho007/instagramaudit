## Refinamentos da tab Sistema

Após releitura editorial dos 4 ficheiros, identifiquei **8 refinamentos** que elevam a qualidade visual e semântica sem reabrir o escopo. Tudo localizado, sem novos componentes partilhados.

---

## 1 · Readiness chip — alinhamento com o sistema

**Onde:** `health-section.tsx · ReadinessChip`

- Adicionar `tabular-nums` ao detalhe (relevante para "1 handle", futuros contadores).
- Reforçar contraste do dot com um `ring-2 ring-white/0` de focagem opcional? Não — manter simples. Em vez disso, **aumentar o dot para 9px** (`h-[9px] w-[9px]`) e dar-lhe um halo subtil com `box-shadow: 0 0 0 3px <cor>15` para sinalizar pulse sem animar. Isto diferencia visualmente do simples ponto e cria a sensação de "estado vivo".
- Eyebrow: actualmente "APIFY" / "RESEND" / "MODO TESTE" — ok. Mas o texto foi escrito com casing capitalizado em `MOCK_SYSTEM_HEALTH` (`Apify`, `Modo teste`). Como aplicamos `uppercase` por CSS, fica visualmente correcto, mas para clareza no read-back vou manter como está (CSS resolve).

## 2 · Smoke test — separar "estado" do "detalhe"

**Onde:** `health-section.tsx · SmokeRow`

Hoje a coluna direita junta texto longo + check verde. Para perfis que tiverem `warn` ou `fail` (já tipado), a cor verde está **hard-coded no JSX**. Refinar:

- Mapear `STATUS_TONE` para cor de texto e ícone (`ok → revenue-700 + Check`, `warn → expense-700 + AlertTriangle`, `fail → danger-700 + XCircle`).
- Adicionar `padding-bottom` à última linha (hoje termina sem respiração antes do `pb-2` do contentor — fica colado).
- Mudar `border-b` para `border-t` na primeira linha + remover `border-b` em todas. Visualmente igual mas mais consistente com o padrão da tabela de chamadas.

## 3 · Cabeçalho de cartão — micro-padding

**Onde:** `secrets-config-section.tsx · CardHeader` e headers internos de `costs-detail-section.tsx`

Os títulos `text-[16px] font-medium` ficam ligeiramente "pesados" face ao subtítulo. Reduzir para `text-[15px]` (como nas restantes secções já refinadas: Receita usa 15px nos cabeçalhos internos). Confirmei nos ficheiros das outras tabs.

## 4 · Configuração Apify — semáforo nos valores activos

**Onde:** `secrets-config-section.tsx · ConfigGridCell`

Os valores "Ligado" e "Activo" hoje saem em mono cinzento (idêntico a "$0.005"). Para reforçar que são **estados booleanos positivos**, pintar **só** os valores das duas primeiras cells (`APIFY_ENABLED` e `MODO TESTE`) em `text-admin-revenue-700` quando o estado for activo. Os custos ficam em mono primary. Adicionar opcional `tone?: 'default' | 'positive' | 'negative'` ao `ConfigCell`.

## 5 · Sub-cartão "Modo de teste" — densidade

**Onde:** `secrets-config-section.tsx`

- O `AdminBadge "Activo"` foge muito para a direita em desktop e fica desalinhado com o título. Mover para **junto do título** com `gap-2` (em vez de extremos), respirando melhor.
- Botão "Editar allowlist →" hoje usa `ml-auto` mas, no mobile, partilha linha com chips. Quebrar para o mobile (já acontece naturalmente com `flex-wrap`) — mas em desktop forçar a estar no fim, alinhado à direita. Adicionar `mt-2 sm:mt-0` no botão para dar respiração quando quebra.

## 6 · Tabela "Últimas chamadas" — coluna HTTP semaforizada

**Onde:** `costs-detail-section.tsx · ProviderCallRow`

A coluna HTTP (200/429/500) é uma das mais informativas para diagnóstico mas hoje sai em cinzento neutro. Aplicar tonalidade semântica:

- `2xx → text-admin-revenue-700`
- `4xx → text-admin-expense-700` (âmbar)
- `5xx → text-admin-danger-700`

Mantém mono+`tabular-nums`. Fica visualmente como uma micro-coluna de status secundária.

## 7 · Alertas — header do cartão com tonalidade

**Onde:** `costs-detail-section.tsx`

O badge "2 abertos" usa `expense` (âmbar). Mas a presença de **um crítico** entre os alertas justifica `danger`. Calcular `hasCritical = MOCK_ALERTS.some(a => a.severity === 'critical')` e usar `danger` se houver crítico, senão `expense`. Pequeno detalhe mas dá significado real ao badge.

## 8 · Cockpit legado — reforçar affordance do accordion

**Onde:** `legacy-access-section.tsx`

- Adicionar `focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-leads-500` ao botão (mesmo padrão do `AdminActionButton`).
- Ícone `ChevronRight` hoje é tertiary; quando aberto, mudar para `text-admin-text-secondary` para dar leve ênfase de "expandido".
- Quando fechado, exibir hint mono à direita do título (antes do chevron): pequeno texto `EXPANDIR` em mono 10px tertiary. Mais evidente que é clicável. Quando aberto, troca para `RECOLHER`.

---

## Validação

```bash
bunx tsc --noEmit
bun run build
```

---

## Checklist

- ☐ Readiness chip com dot maior + halo pulse + tabular-nums
- ☐ Smoke row com mapeamento ok/warn/fail (cor + ícone) e respiração final
- ☐ Cabeçalhos internos a 15px (alinhamento com Receita/Relatórios)
- ☐ Apify config — valores "Ligado/Activo" em verde
- ☐ Sub-cartão Modo de teste — badge junto ao título, botão alinhado
- ☐ Tabela HTTP semaforizada (2xx/4xx/5xx)
- ☐ Badge "N abertos" muda para `danger` se houver crítico
- ☐ Accordion legado com focus ring + label "EXPANDIR/RECOLHER"
- ☐ `tsc --noEmit` ✓ e `bun run build` ✓