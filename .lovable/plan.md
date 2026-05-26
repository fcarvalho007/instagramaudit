## Diagnóstico

Os três cards editoriais do Bloco 1 usam três escalas de título diferentes:

| Card | Classe actual | Md |
|---|---|---|
| Taxa de Engagement | `text-[1.25rem] sm:text-[1.5rem] md:text-[2rem]` | **32px** |
| Frequência de publicação | `text-[1.25rem] md:text-[1.5rem]` | 24px |
| Formato | `text-[1.25rem] md:text-[1.5rem]` | 24px |

No Bloco 2, `caption-diagnostics-card.tsx` já usa a escala grande (`md:text-[2rem]`). O `report-diagnostic-grid-v2.tsx` é a grelha pequena de KPIs (perguntas) — categoria diferente, deve ficar como está.

## Ação

Forçar a escala grande (referência: card Engagement) em **todos** os títulos editoriais dos cards Bloco 1+2 que partilham o mesmo padrão visual.

### Escala unificada

```
font-display text-[1.25rem] sm:text-[1.5rem] md:text-[2rem]
font-semibold tracking-tight text-content-primary leading-tight
```

### Ficheiros a editar (2)

1. **`src/components/report-redesign/v2/overview/frequency-card.tsx:440`**
   - de: `text-[1.25rem] md:text-[1.5rem] ... leading-snug`
   - para: `text-[1.25rem] sm:text-[1.5rem] md:text-[2rem] ... leading-tight`

2. **`src/components/report-redesign/v2/overview/format-card.tsx:238`**
   - mesma substituição.

### Não tocar

- `report-overview-engagement.tsx` — já é a referência.
- `caption-diagnostics-card.tsx` (Bloco 2) — já alinhado.
- `report-diagnostic-grid-v2.tsx` — grelha KPI pequena (Bloco 2 perguntas), escala diferente é intencional.
- Sublinhados coloridos do status word ("Alta", "Pouco variado", "BAIXA") — mantêm-se.

### Validação

- `bunx tsc --noEmit`
- Inspecção visual em `/analyze/robs.cortez` (preview): 3 títulos do Bloco 1 com a mesma altura tipográfica a md.

Sem mudanças de copy, tokens, layout ou business logic.