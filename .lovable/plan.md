## Diagnóstico

O Bloco 1 (Overview) está a usar **duas famílias de eyebrow distintas** e dois registos de capitalização incompatíveis. Daí a sensação visual de inconsistência:

| Label | Componente | Classe atual | Tamanho | Peso | Tracking |
|---|---|---|---|---|---|
| "O que já funciona" / "O que limita o crescimento" | `editorial-identity-card.tsx` linha 425 | `.text-eyebrow-sm` | 10px | 500 | 0.14em |
| "PONTO FORTE" / "A MELHORAR" / "DIAGNÓSTICO" | `overview/insight-callout.tsx` linha 129 | `text-xs font-semibold uppercase tracking-[0.06em]` | **12px** | **600** | **0.06em** |
| "MELHOR PUBLICAÇÃO" / "PIOR PUBLICAÇÃO" / "DIAGNÓSTICO COMPARATIVO" | `report-post-comparison.tsx` (várias linhas) | `.text-eyebrow-sm` | 10px | 500 | 0.14em |

Problemas:

1. **Duas classes diferentes** para o mesmo papel semântico (label/eyebrow). A memória core do projeto define `.text-eyebrow-sm` como o token canónico → `overview/insight-callout` está a desviar-se.
2. **Strings em Title Case** ("O que já funciona") são passadas a uma classe que faz `text-transform: uppercase` via CSS. O resultado renderizado é `"O QUE JÁ FUNCIONA"` — uppercase mas **muito mais longo** que `"PONTO FORTE"`, criando peso visual desigual mesmo com o mesmo estilo.

## Plano

### 1. Unificar a classe eyebrow

Em `src/components/report-redesign/v2/overview/insight-callout.tsx` (linha 127-134):

```diff
- "text-xs font-semibold uppercase tracking-[0.06em] leading-none"
+ "text-eyebrow-sm"
```

Resultado: `PONTO FORTE`, `A MELHORAR`, `DIAGNÓSTICO`, `ALERTA` ficam com o **mesmo estilo exato** que `MELHOR PUBLICAÇÃO` / `PIOR PUBLICAÇÃO` / `DIAGNÓSTICO COMPARATIVO` (10px, weight 500, tracking 0.14em).

### 2. Encurtar as labels longas dos bullets

Em `src/i18n/locales/pt/report.json` linhas 49-50:

```diff
- "strengths": "O que já funciona",
- "limits": "O que limita o crescimento"
+ "strengths": "O que funciona",
+ "limits": "O que limita"
```

E o mirror em `src/i18n/locales/en/report.json` para manter paridade ("What works" / "What limits").

Justificação: quando uppercased pelo `.text-eyebrow-sm`, ficam labels curtas (≤16 caracteres) coerentes com `PONTO FORTE` (11), `A MELHORAR` (10), `MELHOR PUBLICAÇÃO` (17). Sem isto, "O QUE LIMITA O CRESCIMENTO" (26 chars) destoa visualmente mesmo com o estilo unificado.

### 3. Não tocar

- `report-post-comparison.tsx` — já está em `.text-eyebrow-sm`.
- `report-tokens.ts`, `report-editorial-patterns.tsx`, `caption-diagnostics-card.tsx` — fora do Bloco 1.
- O styles.css / tokens — a classe canónica já existe.
- Cores semânticas das tones (success/warning/danger/ai/neutral) ficam intactas — só o estilo tipográfico é unificado.
- A segunda InsightCallout legada (`v2/insight-callout.tsx`) que usa `text-eyebrow-sm font-medium` — fora do scope (já está conforme).

### 4. Verificação

- `bunx tsc --noEmit`
- Visual: confirmar no preview que todas as 8 labels do Bloco 1 partilham mesma altura/peso/tracking.

## Checkpoint

- ☐ Substituir classe inline por `.text-eyebrow-sm` em `overview/insight-callout.tsx`
- ☐ Encurtar strings `overview.cards.strengths` e `overview.cards.limits` em pt/en
- ☐ Validar tsc + preview visual do Bloco 1

## Decisão para confirmares

Encurtar para **"O que funciona" / "O que limita"** (recomendação acima) ou preferes outra formulação curta — ex.: **"Forças" / "Limites"** (1 palavra, ainda mais leve)?