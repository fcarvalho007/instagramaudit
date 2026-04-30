## Refinamento visual do Bloco 01 · Overview

Manter exatamente 3 cartões principais + linha de atenção. Sem novas dependências, sem tocar hero, sem tocar Blocos 02–06, sem tocar `Leitura IA` (já não tem a frase repetida — confirmado em `report-overview-block.tsx`).

### Ficheiros a alterar

- `src/components/report-redesign/v2/report-overview-cards.tsx` — refinar os 3 cartões principais
- `src/components/report-redesign/v2/report-overview-attention-row.tsx` — restilizar para signal-card editorial calmo

Nenhum dos dois está em `LOCKED_FILES.md`. Não criar `report-signal-card.tsx` separado: o `SignalCard` interno chega.

### Cartão 1 · Taxa de envolvimento

- Título já é `Taxa de envolvimento` (verificar — actual é `Taxa de engagement`, **renomear**).
- Manter valor grande como elemento principal (`text-[2.5rem] md:text-[2.75rem]`).
- Refinar `EngagementDistanceBar`:
  - barra horizontal cinzenta de fundo
  - preenchimento até ao valor actual
  - marca vertical da `referência` com pequeno círculo branco anelado
  - labels mono `0%` à esquerda e `referência` à direita (já existem — manter)
- Tom rose/red **só** quando claramente abaixo (`deltaPct <= -10`); dentro da banda fica neutro slate (não amber).
- Copy mantido: `gostos, comentários e respostas face à dimensão do perfil` + `vs. X,XX% de referência`.
- Sem círculo de progresso (já não existe — confirmar ausência).

### Cartão 2 · Ritmo de publicação

- Manter título e valor `X,X` + `publicações por semana`.
- Manter linha de suporte `N publicações em D dias analisados`.
- Manter `RhythmDots` (7 segmentos), mas:
  - adicionar label mono por baixo: `ritmo semanal · 0 → 7+`
  - ajustar `aria-label` para clarificar que é uma escala, não dias da semana
  - tom verde só como acento subtil (manter `bg-emerald-500` mas reduzir saturação visual mantendo dots finos — já estão `h-2.5 w-6`, ok)
- Garantir que utilizador não interpreta dots como dias específicos: a label mono resolve.

### Cartão 3 · Formato mais regular

Inverter hierarquia:

- Valor principal passa a ser a **percentagem** `75%` em `font-display text-[2.5rem] md:text-[2.75rem]` (mesma escala dos outros 2 cartões → coerência).
- Nome do formato (`Carrosséis`) passa a **chip contextual** mais pequeno ao lado: pílula com `text-sm` + dot semântico, **nunca** maior que a percentagem.
- Linha de suporte: `formato mais frequente na amostra analisada` (já existe).
- Manter `FormatStackedBar` com legenda mono (Reels/Carrosséis/Imagens %).
- Remover/substituir `FormatChipLarge` por uma versão menor (`FormatChipContextual`).

### Linha de atenção · "O que merece atenção primeiro"

Restilizar `SignalCard` para tom editorial calmo (não alerta):

- Remover **eyebrow** `Sinal · envolvimento|ritmo|formato` por completo (no JSX e no objecto `Signal` — campo `eyebrow` deixa de ser renderizado; manter no tipo opcional ou remover).
- Superfície sempre branca / quase-branca:
  - `bg-white border border-slate-200`
  - sem fundos `rose-50` / `amber-50`
- Acento semântico apenas em:
  - linha vertical fina à esquerda (`border-l-2`) com cor do tom (`border-rose-300` / `border-amber-300` / `border-slate-200`)
  - ícone num quadrado pequeno (`h-7 w-7`) com tinta subtil
  - dot semântico ao lado do título
- Reduzir altura: `p-3.5 md:p-4`, ícone `h-3.5 w-3.5`.
- Tipografia: título `text-[0.95rem]` semi-bold slate-900; corpo `text-[12.5px] text-slate-600`.
- Header da secção mantém `AlertTriangle` + eyebrow `O que merece atenção primeiro`.

### Leitura IA

Sem alterações (a frase `Síntese gerada a partir...` ainda existe em `report-overview-block.tsx` — **remover essa frase**). Manter o ícone bot, o label `Leitura IA` e o `insightFrameV2`. Esta é a única alteração em `report-overview-block.tsx`.

Adendo: incluir `report-overview-block.tsx` na lista de ficheiros alterados (apenas remoção da frase explicativa).

### Responsivo

- 375px: `grid-cols-1`, sem overflow, chip contextual no Cartão 3 quebra para nova linha se preciso (`flex-wrap` já existe).
- 768px: `md:grid-cols-2` mantém-se, signal cards `sm:grid-cols-2`.
- 1366px: `lg:grid-cols-3` para os 3 principais e para a attention row (já configurado).

### Copy (pt-PT, AO90)

Confirmados na implementação: `Taxa de envolvimento`, `Ritmo de publicação`, `Formato mais regular`, `O que merece atenção primeiro`, `Envolvimento abaixo da referência`, `Ritmo elevado, resposta baixa`, `Dependência de um formato`, `referência`, `amostra`, `publicações por semana`. Sem `engagement`, `payload`, `snapshot`.

### Validação

- `bunx tsc --noEmit`
- `bunx vitest run`
- Sem QA visual no browser.
- Sem chamadas a Apify/DataForSEO/OpenAI/PDFShift/Supabase write.
- Sem alterações a PDF, providers, admin, `/report/example`, schema, prompts ou validators.
- Sem alterações a Blocos 02–06 nem a `report-hero-v2.tsx`.

### Checkpoint

- ☐ Cartão 1 renomeado para `Taxa de envolvimento` + barra refinada + tom neutro dentro da banda
- ☐ Cartão 2 com label mono `ritmo semanal · 0 → 7+`
- ☐ Cartão 3 com `%` como valor principal e formato como chip contextual
- ☐ Attention row sem eyebrow `Sinal · ...`, fundo branco, accent line à esquerda, mais compacta
- ☐ Frase `Síntese gerada a partir...` removida do Bloco 01
- ☐ `bunx tsc --noEmit` passa
- ☐ `bunx vitest run` passa
