
## Refine loading screen copy

### Phase messages

| # | Message | Rationale |
|---|---------|-----------|
| 1 | A recolher dados públicos do perfil… | Unchanged — accurate, sets expectations |
| 2 | A organizar publicações, métricas e sinais de interação… | Replaces "engagement" (anglicismo) with "interação"; adds "publicações" for clarity |
| 3 | A comparar o perfil com referências de mercado… | Replaces "benchmarks do setor" with plain Portuguese; removes jargon |
| 4 | A identificar padrões editoriais e oportunidades… | Removes "com IA" (not always true); focuses on value delivered |
| 5 | A preparar o relatório visual… | Drops "o teu" (impersonal tone per workspace rules) |

### Elapsed-time messages

| Window | Message | Rationale |
|--------|---------|-----------|
| 0–8s | A recolha de dados públicos demora normalmente poucos segundos. | Calm, factual, sets expectation without overpromising speed |
| 8–25s | A recolha de dados ainda está em curso. Pode demorar até 30 segundos. | Acknowledges delay, gives concrete ceiling |
| 25s+ | Ainda a processar. O relatório estará pronto em instantes. | Reassures without apology |

### Footnote

Change "montar o diagnóstico" → "preparar o diagnóstico" for consistency with phase 5 verb.

### File changed

**`src/components/product/analysis-skeleton.tsx`** — `PHASES` array, `getWaitMessage()` function, and footnote text.

### Validation

- tsc
- vitest
