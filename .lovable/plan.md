# Plano — 3 correções visuais no relatório público

## 1. Primeiro card volta ao `EditorialIdentityCard` rico (37/100 + verdict + MetricsStrip + split funciona/limita)

O ficheiro `src/components/report-redesign/v2/report-overview-block.tsx` já importa e renderiza `EditorialIdentityCard` no modo `free_with_engagement`. O screenshot do estado actual mostra ainda o `FreeInitialReadingCard` antigo (título "Leitura inicial do perfil"), o que indica que a versão deployada não corresponde ao código.

Ação:
- **Forçar o estado correcto**: reler `report-overview-block.tsx` no momento da implementação para confirmar que o branch `mode === "free_with_engagement"` renderiza `EditorialIdentityCard` (lines ~257-308). Se já estiver, fazer um touch trivial (reordenar 1 import) para garantir HMR/build pick up.
- **Eliminar** o ficheiro órfão `src/components/report-redesign/v2/overview/free-initial-reading-card.tsx` para garantir que nunca mais é renderizado por engano. (Já não é importado em lado nenhum — confirmado por `rg`.)

Sem alterações ao componente `EditorialIdentityCard` em si — o visual do screenshot 1 já é o que ele produz.

## 2. Sidebar não corta no portátil (≈1024–1280px, viewport 1084x744)

O `<nav>` em `report-block-nav.tsx` é `sticky top-24` com `max-h-[calc(100vh-7rem)]` e padding generoso. No portátil, a soma de Progress + Free + Premium + Explorar + Promo CTA ultrapassa a altura visível.

Ajustes pontuais em `src/components/report-redesign/v2/report-block-nav.tsx` (só CSS, sem mudar lógica nem secções):

a) `ReportBlockSidebar` `<nav>`:
- `sticky top-24` → `sticky top-20`
- `max-h-[calc(100vh-7rem)]` → `max-h-[calc(100vh-5.5rem)]`
- padding non-compact `p-4 xl:p-5` → `p-3 xl:p-4`

b) `SidebarList` espaçamentos non-compact:
- wrapper `space-y-4` → `space-y-3`
- `ProgressSummary` `pt-3 pb-1` → `pt-1 pb-1`, `mb-2` → `mb-1.5`
- `ItemRow` non-compact `py-2.5` → `py-2`
- secções de items `space-y-1` → `space-y-0.5`

c) `ExploreSection` non-compact:
- `<section className="space-y-3">` → `space-y-2`
- bloco Period `space-y-1.5` → `space-y-1`
- bloco Competitors `space-y-1.5` → `space-y-1`
- botão "Adicionar concorrente" `h-9` → `h-8`

d) `UnlockPromoCard` non-compact:
- `p-3 space-y-2.5` → `p-2.5 space-y-2`
- botão `py-2.5 text-sm` → `py-2 text-[13px]`

Estes ajustes encolhem ~80–110 px no total e permitem que a 1ª dobra mostre Progress + Free + Premium + topo do Explorar sem scroll, mantendo o restante acessível com pequeno scroll dentro do `<nav>` (não scroll de página).

## 3. Botão "Desbloquear relatório completo" → "Desbloquear relatório"

Mudar apenas a string usada pelo botão da sidebar (não os e-mails, não o sticky bar, não os outros CTAs que cabem confortavelmente).

Ficheiro: `src/i18n/locales/pt/report.json`
- Linha 590 (`nav.access.cta`): `"Desbloquear relatório completo"` → `"Desbloquear relatório"`
- Linha 591 (`nav.access.cta_aria`): `"Desbloquear relatório completo"` → `"Desbloquear relatório"`

**Não alterar**:
- `pricing.json` (já é "Desbloquear relatório")
- `report.json` linha 38 (outro contexto — `lock_modal.cta`)
- `report.json` linha 669 (sticky unlock bar — confirmar visualmente que cabe; se não couber, mudar também — caso contrário deixar)
- emails (`commercial-followup.ts`) — não é UI
- testes (`premium-cta-unification.test.ts`) — actualizar para "Desbloquear relatório" para passarem

Ajustar `src/components/report-redesign/v2/__tests__/premium-cta-unification.test.ts` linhas 25, 27 e 48 para a nova string.

## Fora do scope

- Nenhuma alteração a `EditorialIdentityCard`, a outros cards, ao layout do main content, ao sticky-unlock-bar, ao mobile bottom tabs.
- Nenhuma alteração de lógica, dados ou backend.
- Sem mexer em outras keys de i18n.

## Validação

1. `/analyze/frederico.m.carvalho` mostra 1º card com 37/100, "Cadência forte, sinal fraco" estilo, MetricsStrip com ícones, e split verde/âmbar de funciona/limita.
2. Em viewport 1084×744 a sidebar mostra Progress + Free + Premium + topo do Explorar na 1ª dobra (sem necessidade de scroll para ver o botão de unlock).
3. Botão da sidebar lê "Desbloquear relatório" numa só linha.
4. Testes Vitest passam (`premium-cta-unification.test.ts` actualizado).