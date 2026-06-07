# Refinos à sidebar do relatório

Escopo: apenas `src/components/report-redesign/v2/report-block-nav.tsx` e `src/i18n/locales/pt/report.json` (+ EN simétrico para não partir chaves). Nada toca em dados, pagamento, schema ou outras secções.

## 1. Primeira dobra (estado expandido)
- Remover o eyebrow "EXPLORAR" acima de "Período de análise" (a `<p>` que imprime `nav.explore.title` no `ExploreSection` expandido). Os labels "Período de análise" e o botão "Adicionar concorrente" continuam a identificar a secção, ganha-se ~28 px verticais.
- Substituir o chip "12 pub." por "12 publicações": mudar `nav.explore.period_sample` de `"{{count}} pub."` para `"{{count}} publicações"` (PT) e o equivalente EN (`"{{count}} posts"` já está bem).

## 2. Estado compact (sidebar quando se faz scroll)
Hoje o compact corta o ProfileHeader em `gap-2 / pb-2 mb-2 / text-sm`, esconde o eyebrow, e o `ExploreSection` colapsa para dois botões `h-8` colados. Vai parecer entalado. Ajustes:

- `ProfileHeader` compact:
  - Voltar a mostrar um eyebrow, mas curto e em uppercase: novo string `nav.eyebrow_analyzing` = "A analisar" (EN: "Analyzing"). Só aparece no estado compact (no expandido continua "Análise de perfil").
  - Manter handle por baixo. `pb-3 mb-3` em vez de `pb-2 mb-2`, e manter a `border-b` subtil também em compact (hoje só existe no expandido) para separar do bloco de navegação.
  - Avatar continua `size="sm"` para não comer altura.

- Lista de items em compact: subir o `py-1.5` para `py-2` no `ItemRow`/`LockedItemRow` quando compact, e aumentar `space-y-0.5` da lista para `space-y-1`. Continua mais denso que o expandido, mas deixa de parecer comprimido.

- `ExploreSection` compact: trocar o grid colado por dois botões com `h-9` e `gap-2`, e adicionar um pequeno eyebrow opcional só com a palavra "Explorar" em `text-eyebrow-sm` (sem maiúsculas grandes), `mb-1.5`. Mantém o resto idêntico (período + concorrente lado a lado).

- Padding global da `<nav>` no estado compact passa de `p-3` para `p-3.5` para respirar.

## 3. Cadeado a gold (premium)
- Token já existe: `--accent-gold` (#BA7517). Aplicar com moderação:
  - Todos os ícones `Lock` dentro do `LockedItemRow` e do `ExploreSection` (locked period chips e botão "Adicionar concorrente" no estado free) passam a usar `text-[rgb(var(--accent-gold))]` em vez de `text-content-tertiary`.
  - Cadeado do `ProgressSummary` / `paidStatus` continua neutro (não é um lock).
  - Não tocar nos cadeados do checkout/sticky bar (fora do escopo).

## 4. Diagnóstico editorial — manter a sublinha útil
Hoje a linha "7 perguntas estratégicas" aparece logo abaixo do item 06 quando está bloqueado e expandido, mas desaparece em compact e quando o user é premium.

- Reescrever a string: `nav.diagnostic_subitems.note` → "7 itens estratégicos" (PT); manter EN equivalente ("7 strategic items").
- Mostrar a sublinha também no estado **premium expandido** (mesmo quando os sub-itens estão escondidos) — útil como descritor. Continua escondida quando o utilizador abre a sub-lista (DiagExpanded) para não duplicar.
- Em **compact** continua escondida (espaço crítico).
- Estilo: `pl-9 pr-3 -mt-0.5 pb-1 text-[11px] text-content-tertiary` (igual ao actual).

## 5. Eyebrow "A ANALISAR" no topo (só em scroll)
Já coberto pelo ponto 2 (ProfileHeader compact). Comportamento:
- Sem scroll → header expandido com avatar grande + "Análise de perfil" + @handle (inalterado).
- Com scroll → header compact com eyebrow "A ANALISAR" (uppercase, `text-eyebrow-sm text-content-tertiary`) e @handle por baixo em negrito.

## Ficheiros tocados
- `src/components/report-redesign/v2/report-block-nav.tsx` — ajustes acima.
- `src/i18n/locales/pt/report.json` — `period_sample`, `diagnostic_subitems.note`, novo `eyebrow_analyzing`.
- `src/i18n/locales/en/report.json` — mesmas chaves simétricas (sem mudar conteúdo já bom).

## Fora de escopo
- Conteúdo dos blocos do relatório, lógica de créditos/entitlements, checkout, PR1 window validation (que ficou pendente do cookie), e qualquer ficheiro server-side.
