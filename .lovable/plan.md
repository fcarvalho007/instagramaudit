## Contexto

O free flow (`mode === "free_with_engagement"`) em `report-overview-block.tsx` já renderiza Identity + Methodology + Engagement seguidos da grelha `PREMIUM_TEASERS` (5 secções 03–07) via `PremiumTeaserCard`. Estrutura, anchors, badge, blur e CTA dinâmico (`PUBLIC_PRODUCTS.report_full_9.priceLabel`) já existem e respeitam o pedido. Faltam apenas:

1. Pequenos ajustes de copy em 06 e 07.
2. Lista compacta visível dentro do teaser 06 com as 7 perguntas diagnósticas (Natureza do conteúdo · Funil · Hashtags · Legendas · Capas · Audiência · Integração) — o restante conteúdo continua borrado.

Sticky bar (`sticky_unlock.body = "5 secções premium por desbloquear"`) e sidebar (`2 de 7 acessíveis`) já estão alinhados com a contagem actual, sem necessidade de mexer. Nenhuma secção lab aparece neste fluxo (`PREMIUM_TEASERS` é uma constante fechada com apenas 03–07).

## Alterações

### 1. `src/components/report-redesign/v2/report-overview-block.tsx`
Apenas copy + props em dois entries do array `PREMIUM_TEASERS`:

- **06 Diagnóstico editorial**
  - `title`: "O que explica estes resultados?" (estava "O que explica o que estás a ver?")
  - `description`: "Desbloqueia 7 perguntas estratégicas sobre conteúdo, funil, hashtags, legendas, capas, audiência e integração."
  - novo campo `subItems: ["Natureza do conteúdo","Funil","Hashtags","Legendas","Capas","Audiência","Integração"]`
- **07 Prioridades de acção**
  - `description`: "Recebe recomendações práticas para transformar dados em decisões." (estava "Fica com recomendações…")

Mais nada muda: anchors (`diagnostico-editorial`, `prioridades`), números, eyebrows, `source="overview_pro_teaser"` e a contagem (5 teasers) ficam iguais.

### 2. `src/components/report-redesign/v2/premium-teaser-card.tsx`
Adicionar prop opcional:

```ts
subItems?: readonly string[];
```

Quando presente e não vazio, renderizar **acima** do bloco borrado uma lista compacta:

- container: `md:pl-[68px] mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5`
- cada item: chip suave (`rounded-md border border-border-default/60 bg-surface-muted/40 px-2 py-1 text-[12px] text-content-secondary`) com lock icon discreto à esquerda (`size-3 text-content-tertiary`)
- aria: `role="list"` + cada chip `role="listitem"`
- mobile: 2 colunas → desktop 3–4 colunas (não ocupa espaço a mais)

A área borrada por baixo + CTA "Desbloquear por {{priceLabel}}" mantêm-se exactamente como hoje, comunicando que os dados continuam fechados.

### 3. Nada de alterações em
`premium-cta-context.tsx`, `sticky-unlock-bar.tsx`, sidebar, i18n (todas as strings novas são literais PT já editoriais e ficam inline com o restante array — manter consistência com as outras entradas que já estão como strings literais portuguesas no mesmo array), `PUBLIC_PRODUCTS`, EuPago, checkout, entitlements, geração de relatório, classifiers, schema, lab variant. Bloco do `mode === "locked"` (relatório Pro real) intocado — Frequência, Formato, Publicações-chave, Diagnóstico editorial e Prioridades continuam a renderizar normalmente para utilizadores pagos.

## Comportamento final

**Free (com engagement)**
- Identity Card + Methodology + Engagement (desbloqueados).
- 5 teasers Premium consecutivos com badge, número, eyebrow, título, descrição, área borrada e CTA "Desbloquear por 9 €".
- Teaser 06 mostra adicionalmente a lista compacta das 7 perguntas (rótulos visíveis, conteúdo continua fechado).
- Sticky bar: "5 secções premium por desbloquear" (já correcto).
- Sidebar: "2 de 7 secções acessíveis" + 03–07 bloqueadas, com nota "7 perguntas estratégicas" sob 06 (já implementado).
- Mobile: chips 2 colunas; badge Premium escondido em <sm (já assim no componente).

**Paid**: zero alteração — o bloco free_with_engagement não é renderizado para Pro.

## Validação manual
1. Abrir relatório free pós-lead: aparecem 5 teasers, ordem 03-04-05-06-07.
2. Teaser 06 mostra os 7 chips com nomes correctos; nenhum dado real é legível.
3. Teasers 03, 04, 05, 07 mantêm aparência actual (só copy do 07 muda subtilmente).
4. CTA de cada teaser usa `priceLabel` dinâmico (verificar texto reflecte `PUBLIC_PRODUCTS.report_full_9.priceLabel`).
5. Clicar em qualquer CTA aciona `handlePremiumAccessClick("overview_pro_teaser")` — fluxo existente, sem regressão de tracking.
6. Sticky bar continua a mostrar "5 secções premium por desbloquear".
7. Sidebar continua "2 de 7 acessíveis".
8. Relatório Pro (`mode === "locked"` ou `mode === "all"`) continua a renderizar as 5 secções desbloqueadas — verificar visualmente.
9. Mobile: chips do 06 cabem em 2 colunas; nada estoura largura; blur + CTA legíveis.
10. Nenhum log de pagamento / EuPago / unlock alterado.
