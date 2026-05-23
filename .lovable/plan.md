# Padronização tipográfica do Bloco 1 do Report

## Problema atual

O Bloco 1 (Editorial Identity + Engagement + Frequency + Format) usa tamanhos de fonte inconsistentes e muitos abaixo do limite legível:

| Elemento | Editorial | Format | Frequency | Engagement |
|----------|-----------|--------|-----------|------------|
| Body / parágrafo | `text-sm` (14px) | `text-[13px]` | `text-[13px]` | `text-[13px]` |
| Legendas / captions | — | `text-[9px]` | `text-[10px]` | — |
| Labels de insight | `text-[11px]` | `text-[10px]` | `text-[10px]` | `text-[10px]` |
| Contagem calendário | — | — | `text-[9px]` | — |

Além disso, os paddings dos headers variam (`px-5 py-6` num card, `px-4 sm:px-5 pt-5` noutro) e as margens entre secções internas não seguem um ritmo consistente.

## Solução — convenção unificada para o Bloco 1

```
Body principal (parágrafos, bullets, subtítulos):  text-[15px]  leading-relaxed
Labels secundárias (KPI small, captions):          text-sm      (14px)
Micro-texto mínimo (legendas, ticks, badges):      text-xs      (12px)  ← mínimo absoluto
Títulos H3 (Fraunces):                             mantêm os tamanhos atuais
Eyebrows:                                          .text-eyebrow / .text-eyebrow-sm
```

## Espaçamentos padronizados

- **Header de cada card**: `px-6 pt-7 pb-3` com `space-y-3` entre eyebrow / título / subtítulo
- **Margem entre secções internas**: `mt-6` (padrão único)
- **Margem entre cards do grid**: `gap-5` (já está em parte, uniformizar)

## Ficheiros e alterações

### 1. `editorial-identity-card.tsx`
- Parágrafo da síntese: `text-sm` → `text-[15px] leading-relaxed`
- Bullets fortes/limitações: `text-sm` → `text-[15px] leading-relaxed`
- Nota de confiança baixa: `text-xs` (mantém, já é o mínimo)
- Zona macro padding: `px-5 py-6 sm:px-7 sm:py-7` → `px-6 py-7`
- Badge de banda: `text-[11px]` → `text-xs`

### 2. `report-overview-engagement.tsx`
- Descrição do card: `text-[13px] md:text-[14px]` → `text-[15px] leading-relaxed`
- Labels dos KPIs: `text-xs` → `text-sm`
- Valores dos KPIs: mantêm `text-[1.6rem] sm:text-[2.25rem]`
- Texto da caixa de leitura (via InsightCallout): coberto no ficheiro 5

### 3. `frequency-card.tsx`
- Subtítulo do header: `text-[13px] md:text-[14px]` → `text-[15px] leading-relaxed`
- Texto do resumo semanal: `text-[13px]` → `text-[15px]`
- Labels do resumo semanal: `text-[10px]` → `text-xs`
- Headers dos dias da semana: `text-[11px] md:text-xs` → `text-xs`
- Contagem no calendário: `text-[9px] md:text-[10px]` → `text-xs`
- Legendas do calendário: `text-[10px] md:text-[11px]` → `text-xs`
- Header padding: `px-4 sm:px-5 md:px-6 pt-5 sm:pt-6 md:pt-8` → `px-6 pt-7 pb-3`

### 4. `format-card.tsx`
- Subtítulo do header: `text-[13px] md:text-[14px]` → `text-[15px] leading-relaxed`
- Legendas do donut: `text-[13px]` → `text-[15px]` (mantém legibilidade nos números)
- Legendas de thumbnails: `text-[9px]` → `text-xs`
- Label "posts analisados": `text-[10px]` → `text-xs`
- Header padding: `px-5 md:px-6 pt-6 md:pt-8` → `px-6 pt-7 pb-3`

### 5. `insight-callout.tsx`
- Label do callout: `text-[10px]` → `text-xs`
- Body do callout: `text-[13px] md:text-[14px]` → `text-[15px] leading-relaxed`

## Critério de aceitação

- Nenhum `text-[9px]`, `text-[10px]` ou `text-[11px]` remanescente nos 5 ficheiros do Bloco 1.
- Body text uniformemente `text-[15px]` com `leading-relaxed`.
- Paddings dos headers alinhados entre os 4 cards.
- Build passa sem erros.
