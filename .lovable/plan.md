## Objetivo

Em mobile (411px), o bloco com as 3 métricas (Gostos · Comentários · Ritmo) e a coluna verde "O que já funciona" tem pouca leitura: subtítulos em cinza muito claro, eyebrows muito pequenos, e os bullets das forças num cinza secundário que perde contraste. Subir a qualidade visual e a legibilidade sem reorganizar o layout.

Âmbito: apenas presentação (`editorial-identity-card.tsx`). Sem dados, i18n ou lógica.

---

## 1. MetricsStrip (linhas 711-738)

**Container**: passa a respirar mais em mobile.
- Padding mobile: `px-5 py-5` → `px-5 py-4.5` mantém, mas reduzir o gap vertical entre items quando empilhados:
  - Adicionar `divide-y divide-border-default sm:divide-y-0` para ter separadores subtis em vez do `border-t` atual (mais limpo).

**Eyebrow (label "GOSTOS · MÉDIA")** (linha 726):
- Antes: `text-eyebrow-sm text-content-tertiary` (~10-11px, cinza claro)
- Depois: `text-eyebrow-sm text-content-secondary` (mesmo tamanho mas tom mais escuro — mais legível em mobile sem mudar hierarquia)

**Valor numérico** (linha 729):
- Antes: `text-[1.625rem]` (26px) em todos os ecrãs
- Depois: `text-[1.75rem] md:text-[1.625rem]` — ligeiramente maior em mobile (28px) para dar peso ao número, voltando aos 26px em desktop onde a strip é horizontal e mais densa.

**Unidade "por post"** (linha 732):
- Antes: `text-sm text-content-secondary` (14px)
- Depois: `text-[15px] text-content-secondary` — emparelha melhor com o número maior.

**Subtítulo ("0,19% dos seguidores" / "boa conversa" / "ritmo saudável")** (linha 734):
- Antes: `mt-1.5 text-xs text-content-tertiary leading-snug` (12px, cinza muito claro — quase ilegível em mobile)
- Depois: `mt-2 text-[13px] text-content-secondary leading-snug` — sobe 1px e troca para o tom secundário (mais escuro, mais próximo de preto). Mantém-se claramente abaixo do número na hierarquia mas torna-se legível.

---

## 2. BulletColumn "O que já funciona" / "O que limita" (linhas 604-625)

**Padding mobile** (linha 605):
- Antes: `px-5 py-4 sm:px-6 sm:py-5`
- Depois: `px-5 py-5 sm:px-6 sm:py-5` — mais ar vertical em mobile.

**Eyebrow do título** (linha 608):
- Antes: `text-eyebrow-sm` (cinza secundário)
- Manter classe mas garantir `font-semibold` (já vem do utilitário) — sem alteração necessária se já contrasta.

**Texto dos bullets** (linha 612):
- Antes: `flex gap-2 text-[15px] leading-relaxed` + `text-content-secondary` no texto (linha 617)
- Depois: `flex gap-2.5 text-[15px] md:text-[15px] leading-[1.55]` + `text-content-primary` no texto (substituir o `text-content-secondary` da linha 617 por `text-content-primary`). O destaque (`it.destaque`) já vai a primary com font-medium; o detalhe a primary com peso normal mantém o contraste hierárquico via peso, não via cor. Resultado: o parágrafo inteiro torna-se mais escuro e legível, especialmente em ecrãs OLED móveis.

**Bullet dot** (linha 614):
- Antes: `mt-1.5 h-1.5 w-1.5`
- Depois: `mt-[7px] h-1.5 w-1.5` — pequeno ajuste de alinhamento óptico com a nova line-height.

**Spacing entre itens** (linha 610):
- Antes: `space-y-2.5`
- Depois: `space-y-3` — um pouco mais de ar entre bullets em mobile.

---

## Não alterar

- Estrutura do grid (1 col em mobile, 3 em sm) do MetricsStrip — empilhamento vertical já é o ideal em 411px.
- Border vermelho/verde lateral (`border-l-2 border-signal-success/warning`) — assinatura visual do bloco, manter.
- Ícones, copy ou i18n.
- Score gauge, ReferenceBar, ou veredicto (já tratados no prompt anterior).
- Card de diagnóstico (Bloco 02) — fora de scope.

---

## Checkpoint

- [ ] MetricsStrip: número 28px em mobile, subtitle 13px em `text-content-secondary` (legível)
- [ ] BulletColumn: corpo dos bullets a `text-content-primary` com line-height 1.55
- [ ] Mobile 411px: subtítulos das métricas perfeitamente legíveis sem zoom
- [ ] Desktop ≥768px: nenhum desvio visível (número volta a 26px, separadores horizontais como hoje)
- [ ] `bunx tsc --noEmit` passa
- [ ] `bunx vitest run` passa