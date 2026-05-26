
# Plano — Refinamentos Socialinsider no relatório público

Cinco mudanças cirúrgicas. Sem alterar o pipeline de dados, schema, valores de benchmark, providers ou `/report.example`.

---

## 1. FormatCard — layout mobile empilhado

Ficheiro: `src/components/report-redesign/v2/overview/format-card.tsx` (função `ExternalReferenceTable`, linhas 533–670).

Hoje a grelha `grid-cols-[1fr_1.1fr_1.2fr_1fr]` é aplicada em todos os breakpoints, o que comprime as 4 colunas em mobile e quebra a leitura.

Refactor:

- **Mobile (< 640px / `sm`)**: render como lista vertical de mini-cards (uma entrada por formato), com a estrutura:
  ```
  ┌─────────────────────────────┐
  │ Carrosséis                  │  ← format name (text-[14px], primary)
  │ Este perfil      8 · 67%    │  ← label esquerda / valor direita
  │ Referência ext.  6/mês · 1.34% ER
  │ ▸ Acima da referência       │  ← reading badge (chip discreto)
  └─────────────────────────────┘
  ```
  Cada mini-card: `rounded-lg border border-border-subtle/60 bg-surface-secondary p-3 space-y-1.5`. Reading badge como chip de fundo neutro (`bg-surface-muted text-content-secondary text-[11px] px-2 py-0.5 rounded-full`).

- **Desktop (`sm:` em diante)**: manter a grelha actual de 4 colunas como já está.

Implementação: dois blocos JSX paralelos com `className="sm:hidden"` e `className="hidden sm:grid ..."`, partilhando os mesmos helpers `profileCell` / `refCell` / `readingFor` (sem duplicação de lógica).

## 2. Copy neutra das leituras

As 3 chaves `format.external_ref.reading_*` em `src/i18n/locales/{pt,en}/report.json` passam de "frequência" → linguagem neutra de referência:

| Chave | PT (novo) | EN (novo) |
|---|---|---|
| `reading_above_freq` | `Acima da referência` | `Above the reference` |
| `reading_below_freq` | `Abaixo da referência` | `Below the reference` |
| `reading_near_freq` | `Próximo da referência` | `Near the reference` |

`absent` já é `ausente na amostra` (mantém). `provisional` já é `Leitura provisória — amostra pequena.` (mantém).

## 3. Bridge entre verdict editorial e tabela

Em `FormatCard` (depois do `InsightCallout`, antes do `<ExternalReferenceTable />`, linha ~338), adicionar:

```tsx
<p className="px-5 md:px-6 mt-2 text-[13px] text-content-secondary leading-relaxed">
  {t("format.external_ref.bridge")}
</p>
```

Novas chaves i18n:

- PT: `"Usa esta leitura como enquadramento: abaixo comparas o mix do perfil com uma referência externa por formato."`
- EN: `"Use this as context: below you compare this profile's format mix with an external format reference."`

## 4. Metodologia — distinguir tier vs referência externa

`ExternalSourceNote` é o único ponto onde a fonte é nomeada hoje. Vou estender o template i18n `external_source_note.template` para incluir a clarificação dos dois layers:

Novas chaves em `src/i18n/locales/{pt,en}/report.json`:

```jsonc
"external_source_note": {
  "template": "Fonte externa: {{source}}, dados {{range}}.",
  "methodology": "Benchmark do escalão: compara o perfil com contas de dimensão semelhante. Referência externa: usa dados agregados da Socialinsider por formato no Instagram. Estas referências servem para enquadramento, não como meta fixa."
}
```

EN:
```jsonc
"methodology": "Tier benchmark: compares the profile with accounts of a similar size. External reference: uses aggregated Socialinsider data by Instagram format. These references provide context, not a fixed target."
```

Em `external-source-note.tsx`, renderizar `methodology` numa linha adicional discreta abaixo do `template` (`text-[11px] text-content-tertiary mt-1`). Sem nova secção visual — fica no slot que já existe no fundo de `FormatCard` e `FrequencyCard`.

## 5. FrequencyCard — auditoria de copy

`frequency.external_ref.intro` já diz literalmente `"Não é uma regra fixa nem um total prescrito"`. ✔ Já não soma frequências num total — apenas lista por formato com `≈`. Sem mudanças de lógica.

Single small tweak: trocar `"opportunity_mix"` de `"A oportunidade pode estar no mix de formatos, não no volume."` (mantém — é não-imperativo, OK). **Nenhuma mudança** necessária no FrequencyCard.

## 6. Comentário no cálculo `refShare`

Em `format-card.tsx` linhas 577–591 (função `readingFor`, dentro de `ExternalReferenceTable`), adicionar bloco de comentário:

```ts
// refShare: only used for DIRECTIONAL comparison of mix between this profile
// and the Socialinsider per-format reference. It is NEVER displayed as a
// total posting target and must NOT be interpreted as a recommended monthly
// volume. Socialinsider data is an external reference for context only.
```

## 7. Testes

Ficheiros novos/actualizados:

### `src/lib/knowledge/__tests__/socialinsider-context.test.ts` (novo)
- Mock de `supabaseAdmin` (vi.mock) devolvendo 3 linhas (reel/carousel/image) com `knowledge_sources.name = "Socialinsider"`.
- Assert: `loadSocialinsiderInstagramContext()` devolve `{ reel, carousel, image }` todos preenchidos com `postsPerMonth`/`engagementPct` numéricos.
- Assert: linhas sem source `Socialinsider` são ignoradas.
- Assert: chama `__resetSocialinsiderCache()` entre testes.

### `src/components/report-redesign/v2/overview/__tests__/format-card.test.tsx` (novo)
- Render do `FormatCard` com `socialinsiderRef` e i18n stub:
  - mostra `format.external_ref.title` (source note presente).
  - reels com `count: 0` → célula mostra `"ausente na amostra"` e NÃO contém palavras imperativas (`/deve|tem de|ideal|meta|regra/i`).
  - `postsAnalyzed = 5` → mostra `format.external_ref.provisional`.
- Render do mini-card empilhado em viewport mobile (verificar pela presença de classes `sm:hidden` e que cada formato aparece como bloco distinto).

### `src/components/report-redesign/v2/overview/__tests__/frequency-card.test.tsx` (novo, mínimo)
- Render do `FrequencyCard` com 3 refs Socialinsider distintas (postsPerMonth 4/6/3).
- Assert: o texto renderizado NÃO contém a soma `"13"` nem `"~13/mês"`. Só as 3 frequências separadas.

### Copy assertions (`socialinsider-copy.test.ts`, novo em `src/i18n/__tests__/`)
- Carregar `pt/report.json` + `en/report.json`.
- Assert: `format.external_ref.reading_*` não contém `/deve|tem de|ideal|meta|regra|target|must|should/i`.
- Assert: `external_source_note.methodology` existe em ambos e distingue "escalão"/"tier" de "referência externa"/"external reference".
- Assert: nenhuma string fora de `format.external_ref.*` menciona literalmente "Socialinsider" (excepto `external_source_note` que é dinâmica) — confirma que valores Socialinsider não estão hardcoded em copy editorial.

## 8. Ficheiros tocados

| Ficheiro | Mudança |
|---|---|
| `src/components/report-redesign/v2/overview/format-card.tsx` | mobile stacked layout + bridge + comentário refShare |
| `src/components/report-redesign/v2/overview/external-source-note.tsx` | render linha `methodology` |
| `src/i18n/locales/pt/report.json` | bridge, reading_* neutras, methodology |
| `src/i18n/locales/en/report.json` | idem |
| `src/lib/knowledge/__tests__/socialinsider-context.test.ts` | novo |
| `src/components/report-redesign/v2/overview/__tests__/format-card.test.tsx` | novo |
| `src/components/report-redesign/v2/overview/__tests__/frequency-card.test.tsx` | novo |
| `src/i18n/__tests__/socialinsider-copy.test.ts` | novo |

## 9. Fora de âmbito

- Apify, OpenAI, DataForSEO, pipeline, gates, pricing, admin CRM, schema, valores de benchmark, Block 1, `/report.example`.
- Não toco em `frequency-card.tsx` (copy já é neutra e não soma totais).
- Não mudo `socialinsider-context.server.ts` (lógica está correcta).

## ☐ Checkpoint

- ☐ Mobile: cada formato como mini-card empilhado; desktop mantém grelha 4-col
- ☐ Reading labels neutras (`acima/abaixo/próximo da referência`)
- ☐ Bridge editorial → tabela presente
- ☐ Linha de metodologia render em FormatCard e FrequencyCard
- ☐ Comentário sobre `refShare` adicionado
- ☐ 4 ficheiros de testes novos a verde
- ☐ `bunx tsc --noEmit` e `bunx vitest run` limpos
- ☐ Confirmação: zero providers chamados (só leitura de `knowledge_benchmarks` via cache existente)

Aprovas para implementar?
