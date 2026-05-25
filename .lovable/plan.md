## Objetivo

1. **Primeira dobra mobile (hero)** mais organizada: o handle `@100xengineers` não pode partir para a segunda linha (`rs`). Tem de caber elegantemente.
2. **Card de veredicto** (`editorial-identity-card`) com **mais legibilidade**: corpo do texto maior e em tom mais escuro (mais próximo de preto) para leitura confortável em mobile.

Âmbito: apenas presentação. Sem alterações em dados, i18n, unlock logic, providers.

---

## 1. Hero mobile — handle numa só linha

**Ficheiro:** `src/components/report-redesign/v2/report-hero-v2.tsx`

Causa: no viewport 411px, o avatar (`size-20` = 80px + padding 8px) + gap-5 ocupa ~108px, sobrando ~280px. O handle a `text-[1.875rem]` (30px) Fraunces bold não cabe em ~14 caracteres.

Solução cirúrgica (sem reorganizar grelha):

- **Handle** (linha 78): reduzir tamanho mobile e aliviar tracking.
  - Antes: `text-[1.875rem] lg:text-[2.25rem] ... tracking-[-0.025em] leading-[1.05] break-words`
  - Depois: `text-[1.5rem] sm:text-[1.75rem] lg:text-[2.25rem] ... tracking-[-0.03em] leading-[1.1] break-all sm:break-words`
  - Adicionar `min-w-0` ao container já existente (linha 77) — já está.

- **Avatar mobile mais compacto** (linha 282 no helper `Avatar`):
  - Antes: `size-20 md:size-28`
  - Depois: `size-16 md:size-28`
  - Ajustar verified badge mobile (linha 316): `size-5 md:size-7` em vez de `size-6 md:size-7` para manter proporção.

- **Gap mais apertado em mobile** (linha 69):
  - Antes: `gap-5 lg:gap-7`
  - Depois: `gap-4 lg:gap-7`

Efeito esperado em 411px: avatar 64 + p1 8 + gap 16 = 88px usados; sobram ~300px para um handle a 24px Fraunces — `@100xengineers` (~14 chars) cabe confortavelmente numa linha. `break-all` em mobile garante que handles ainda maiores quebram limpo em vez de transbordar.

---

## 2. Card de veredicto — leitura mais confortável

**Ficheiro:** `src/components/report-redesign/v2/overview/editorial-identity-card.tsx` (linha 405)

Alteração ao parágrafo do veredicto:

- Antes: `text-[15px] leading-relaxed text-content-secondary max-w-2xl whitespace-pre-line`
- Depois: `text-[17px] md:text-[17px] leading-[1.65] text-content-primary max-w-2xl whitespace-pre-line`

Justificação:
- Subir de 15px → 17px aumenta corpo do texto, especialmente útil em mobile.
- `leading-[1.65]` em vez de `leading-relaxed` (1.625) → ligeiramente mais ar entre linhas, melhora ritmo de leitura num parágrafo longo.
- `text-content-primary` (navy escuro, ~near-black) em vez de `text-content-secondary` (cinza médio) → contraste muito maior, mais próximo do "preto" pedido, mantendo a coerência com os tokens do design system.

**Não alterar:**
- Título (`h2`) — já foi uniformizado no último prompt.
- Eyebrows, badges e bullets de "Sinais usados" — escala secundária, manter como está.
- Warnings (`text-xs`) — meta info, manter.

---

## Checkpoint

- [ ] Em 411px, `@100xengineers` aparece numa só linha no hero
- [ ] Avatar mobile reduz para 64px e o conjunto fica visualmente equilibrado
- [ ] Parágrafo do veredicto fica a 17px, line-height 1.65, em `text-content-primary`
- [ ] Desktop (≥1024px) mantém o handle 36px e avatar 112px como hoje
- [ ] Sem regressão em verdict cards muito longos (ainda dentro de `max-w-2xl`)
- [ ] `bunx tsc --noEmit` passa
- [ ] `bunx vitest run` passa