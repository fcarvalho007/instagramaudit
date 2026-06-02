# Refinamento UI da Ficha de Cliente

Trabalho **puramente de apresentação** em `src/components/admin/v2/beta-leads/lead-detail-sheet.tsx` (e componentes filhos quando necessário). Sem alterações de lógica, dados ou endpoints.

## Princípios

1. **Escala tipográfica única, derivada dos tokens** — Inter para tudo o que é UI, Fraunces só em headings editoriais (nome do lead). Zero font-mono em zonas públicas; números com `tabular-nums`.
2. **Hierarquia clara em 3 níveis** por secção: eyebrow → título → corpo. Nada cai abaixo de 12px (`text-xs`) excepto eixos de gráfico.
3. **Espaçamento ritmado** numa escala 4/8/12/16/24/32 — sem valores ad-hoc. Densidade aumenta em listas (relatórios, timeline), respira em headers e KPIs.
4. **Cores semânticas apenas** (`content-primary/secondary/tertiary`, `surface/surface-muted`, `border-default`, accents `signal-*`). Eliminar qualquer `slate-*`, `gray-*`, `text-white/80` ou hex inline que tenha sobrado.
5. **Contraste AA garantido** em todos os pares texto/fundo, incluindo estados disabled e badges.

## Escala aplicada

```text
Eyebrow secção    text-[11px] uppercase tracking-[0.12em] Inter Medium     content-tertiary
Título secção     text-sm     font-semibold                Inter            content-primary
Nome do lead      text-2xl    font-normal                  Fraunces         content-primary
Handle / email    text-sm     Inter                                          content-secondary
Label de campo    text-xs     Inter Medium                                   content-tertiary
Valor de campo    text-sm     Inter                                          content-primary
KPI número        text-xl     Inter SemiBold tabular-nums                    content-primary
KPI legenda       text-xs     Inter                                          content-secondary
Meta/timestamp    text-xs     Inter tabular-nums                             content-tertiary
Body longo        text-sm     leading-relaxed                                content-secondary
```

## Espaçamento aplicado

```text
Modal padding             p-8 (header), px-8 py-6 (tabs body)
Gap entre secções         space-y-8
Gap dentro de secção      space-y-4
Gap entre cards/linhas    gap-3 (denso) / gap-4 (normal)
Padding de card           p-4 (linha lista) / p-5 (card destacado)
Header → conteúdo         mt-6 depois do header
Tabs trigger              h-10, px-4, gap-6 entre triggers
```

## Cores revistas por zona

- **Header**: fundo `surface`, borda inferior `border-default`. Status badge usa accent semântico (`signal-positive/warning/info/neutral`) com fundo a 10% e texto a 100%.
- **KPI strip**: cards em `surface-muted` com borda `border-default/60`; números `content-primary`, labels `content-secondary`.
- **Tabs**: trigger inactivo `content-tertiary`, hover `content-secondary`, activo `content-primary` com underline `accent-primary` 2px.
- **Dropdown estado comercial**: grupo "Automático" em `content-tertiary` (read-only visual); "Pagamento" valores à direita em Inter SemiBold tabular-nums `content-primary`; "A tua decisão" item activo com fundo `accent-primary/10` + texto `accent-primary`.
- **Tab Relatórios**: linhas com hover `surface-muted/60`; "não visto" badge `signal-warning` subtil, não amarelo gritante.
- **Tab Feedback**: callouts usam variantes existentes do `AdminCallout`, sem inventar cores.
- **Tab Histórico**: rail da timeline `border-default`, bullets pintadas por categoria (`accent-primary` auto, `signal-positive` payment, `content-tertiary` system).

## Limpeza de inconsistências

- Substituir todos os `text-white`, `text-slate-*`, `text-gray-*`, `bg-slate-*` e hex literais por tokens.
- Remover `font-mono`/`JetBrains` que tenha ficado em metadata, contadores, valores comerciais.
- Uniformizar ícones Lucide para `h-4 w-4` em linha de texto e `h-5 w-5` em headers de secção; cor `content-tertiary` por defeito, `content-primary` quando enfatizado.
- Botões `size="sm"` em acções secundárias, `size="default"` em CTA principal. Labels em sentence case.

## Checkpoint

- ☐ Escala tipográfica aplicada em todo o `LeadDetailSheet` e subcomponentes (`CommercialStatusSelect`, `LeadReportsList`, `FeedbackBetaSection`, `LeadHistoryTimeline`).
- ☐ Espaçamento normalizado à escala 4/8/12/16/24/32.
- ☐ Zero `slate-*`/`gray-*`/hex inline; zero `font-mono` em zona pública.
- ☐ Contraste AA verificado em header, KPIs, dropdown agrupado, tabs e timeline.
- ☐ Sem alterações de comportamento, dados ou tipos.

## Ficheiros tocados (previsão)

- `src/components/admin/v2/beta-leads/lead-detail-sheet.tsx` (principal)
- Eventualmente pequenos ajustes em `admin-callout.tsx` / `admin-badge.tsx` **só** se faltar variante semântica — caso contrário, intactos.
- Nenhum ficheiro de `LOCKED_FILES.md` será modificado.
