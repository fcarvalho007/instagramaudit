
## Auditoria

### Componente e ficheiros envolvidos

| Ficheiro | Papel |
|---|---|
| `src/components/report-redesign/v2/report-block-section.tsx` | Renderiza o header de cada secção |
| `src/components/report-redesign/v2/block-config.ts` | Dados estáticos: `number`, `shortLabel`, `eyebrowOverride`, `question`, `subtitle` |
| `src/components/report-redesign/report-tokens.ts` | Tokens: `chapterNumber`, `chapterNumberBox`, `chapterLabel`, `chapterSubtitle`, `h2Section` |

### Dados disponíveis

- **Estáticos** (block-config): `number`, `eyebrowOverride`/`shortLabel`, `question` (serif headline), `subtitle` (Inter description) — todos já preenchidos com copy editorial em pt-PT.
- **AI summary**: Não existe nenhum campo `aiHeroText`, `executiveSummary`, `summary` ou similar no payload nem no block-config. Os campos `question` e `subtitle` já servem a função editorial pretendida.
- **Payload metrics**: O `ReportBlockSection` não recebe dados do payload — apenas `BlockConfig` estática. Isto é correto e não deve mudar.

### Estado atual do código (preview, não publicado)

As alterações da iteração anterior já adicionaram:
- `chapterNumberBox`: `bg-surface-muted rounded-2xl` com dimensões fixas (88×80 / 112×96)
- `chapterNumber`: tamanho reduzido para 3.5rem/4.5rem, cor `text-content-tertiary/40`
- `border-t border-border-subtle` no header
- Layout `flex-col md:flex-row`

### Problemas identificados

1. **Número demasiado transparente** — `text-content-tertiary/40` (40% opacidade) torna o "01" quase invisível dentro da caixa cinza. Deve ter mais presença (~60-70% ou usar `text-content-tertiary` puro).
2. **h2Section demasiado grande** — `text-[2.25rem] md:text-[3rem] lg:text-[3.4rem]` (~54px desktop) domina visualmente. Para um header editorial de secção, ~28-36px é mais equilibrado.
3. **Tokens não semânticos** — `chapterLabel` usa `text-blue-600` e `chapterSubtitle` usa `text-slate-500`, violando a regra de design tokens. Devem usar `text-accent-primary` e `text-content-secondary`.
4. **Caixa do número pouco expressiva** — falta subtleza: um ring ou border muito suave daria mais "isolamento" editorial.

---

## Plano de implementação

### 1. `report-tokens.ts` — ajustar 4 tokens

- `chapterNumber`: mudar de `text-content-tertiary/40` para `text-content-tertiary/60` (mais presença, ainda decorativo)
- `chapterNumberBox`: adicionar `ring-1 ring-border-default/40` para subtil separação
- `chapterLabel`: substituir `text-blue-600` por `text-accent-primary`
- `chapterSubtitle`: substituir `text-slate-500` por `text-content-secondary`
- `h2Section`: reduzir de `text-[2.25rem] md:text-[3rem] lg:text-[3.4rem]` para `text-[1.5rem] md:text-[1.75rem] lg:text-[2rem]` — escala editorial mais contida

### 2. `report-block-section.tsx` — sem alterações estruturais

O layout (flex-col → flex-row, number box + text stack, border-t) já está correto. Apenas os tokens mudam.

### Ficheiros que NÃO mudam

- `block-config.ts` — copy estática inalterada
- Nenhum ficheiro de dados/payload
- Nenhuma chamada a providers externos

### Riscos

- **Mínimos** — alterações puramente CSS/tokens, sem lógica, sem dados, sem providers.
- Verificar que `text-accent-primary` e `text-content-secondary` existem em `tokens-light.css`.
- Verificar que `ring-border-default/40` resolve corretamente com o sistema de tokens.
