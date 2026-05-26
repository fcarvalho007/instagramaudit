## Auditoria — Comparação Socialinsider em FormatCard e FrequencyCard

**Modo:** read-only. Não há alterações de código propostas para já — apenas diagnóstico por área e correções recomendadas, conforme pediste.

---

### 1. FormatCard compara claramente o mix real vs Socialinsider?
**PASS (com ressalva)**
- `ExternalReferenceTable` (linhas 533–670) mostra tabela de 4 colunas — *Formato · Este perfil · Referência externa · Leitura* — para Carrosséis / Reels / Imagens, consumindo `socialinsiderRef.{carousel,reel,image}`.
- Coluna "Este perfil" mostra `count · share%`; coluna "Referência externa" mostra `X/mês · Y% ER` (i18n `format.external_ref.ref_cell`).
- **Ressalva:** existe uma `InsightCallout` (linhas 332–337) imediatamente antes da tabela. Isso é OK, mas o veredicto editorial não menciona a referência externa, então o leitor pode ler o veredicto sem saber que existe tabela comparativa logo abaixo.

### 2. FormatCard evita overclaiming?
**PASS**
- A função `readingFor` (linhas 570–591) só classifica como `reading_above_freq` / `reading_below_freq` quando |delta| > 10pp, caso contrário diz `reading_near_freq`. Sem linguagem imperativa ("publica mais").
- `provisional` aparece quando `postsAnalyzed > 0 && postsAnalyzed < 8` (linha 555), com copy "Leitura provisória — amostra pequena".
- Quando o formato está ausente do perfil, mostra `"ausente na amostra"` em vez de criar comparação fictícia.

### 3. Distingue benchmark interno (tier) vs referência externa de mercado?
**PASS parcial — FAIL leve**
- A tabela tem título explícito *"Referência externa · Socialinsider"* (i18n `format.external_ref.title`) e rodapé `ExternalSourceNote` com "Fonte externa: Socialinsider, dados …".
- **Problema:** o componente `FormatCard` em si não exibe lado-a-lado o *benchmark de escalão interno* (tier). A `InsightCallout` editorial é qualitativa, não numérica. O utilizador vê "este perfil" vs "referência externa" mas **não vê** "este perfil vs escalão interno" no mesmo cartão — esse contraste vive noutro bloco (`ReportBenchmarkEvidence`). A separação está correta semanticamente, mas se o objetivo era ter ambos visíveis no mesmo cartão para comparação, isto não acontece.

### 4. FrequencyCard evita somar frequências por formato num falso total?
**PASS**
- `ExternalReferenceNote` (linhas 621–676) usa i18n `frequency.external_ref.intro` que lista cada formato separadamente: *"Reels ≈{{reel}}/mês, Carrosséis ≈{{carousel}}/mês, Imagens ≈{{image}}/mês — {{range}}. Não é uma regra fixa nem um total prescrito."*
- Nenhum `+` ou soma dos três valores em runtime. O total vem do cálculo real `effectiveSampleSize / effectiveWindowDays` derivado das publicações analisadas, não dos benchmarks externos.
- `frequency.external_ref.opportunity_mix` só dispara quando o score é alto, e diz *"A oportunidade pode estar no mix de formatos, não no volume"* — explicitamente desencoraja interpretar como meta de volume.

### 5. Fonte visível mas discreta?
**PASS**
- `ExternalSourceNote` renderiza `text-xs text-content-tertiary` com link `underline decoration-dotted underline-offset-2` para `sourceUrl` — discreto, mas clicável.
- Título da tabela usa `text-eyebrow-sm text-content-tertiary` (12px uppercase) e range em `text-[11px] tabular-nums` — visível sem dominar.

### 6. Layout legível em mobile?
**FAIL (FormatCard) · PASS (FrequencyCard)**
- **FormatCard `ExternalReferenceTable` (linha 638):** `grid-cols-[1fr_1.1fr_1.2fr_1fr]` com 4 colunas a 12–13px e padding `p-3.5 sm:p-4` num viewport de 375px deixa ≈75px por célula. A célula "Referência externa" pode quebrar `12/mês · 1.32% ER` em 2–3 linhas, e a coluna "Leitura" pode quebrar *"Acima na frequência"* feio.
- **FrequencyCard:** o `ExternalReferenceNote` é texto corrido em parágrafos, flui bem em mobile.
- Os cartões em si (header, donut, grid de thumbnails) já têm responsivos mobile-first corretos.

### 7. Valores vêm de `knowledge_benchmarks`, não de i18n hardcoded?
**PASS**
- `loadSocialinsiderInstagramContext` (`socialinsider-context.server.ts`) lê de `knowledge_benchmarks` com filtro `platform='instagram'`, `tier='overall'`, `valid_to.is.null OR valid_to >= today`, join com `knowledge_sources`, filtra por `name ilike '%socialinsider%'`. Cache 60s.
- Passado via `benchmark-input.server.ts` → `snapshot-to-report-data.ts` (`AdapterResult.externalReferences`) → `report-overview-block.tsx` linhas 180, 188 → props `socialinsiderRef` em ambos os cartões.
- i18n só contém *templates* (`{{reel}}/mês`, `{{posts}}/mês · {{eng}}% ER`) — sem números embutidos.

### 8. Restam valores Socialinsider hardcoded em `report.json` ou JSX?
**PASS**
- `rg -ni "socialinsider" src/i18n` mostra apenas templates parametrizados e atribuições de fonte ("Fontes de enquadramento: Socialinsider, Buffer e Hootsuite"). Nenhum número hardcoded como `8/mês`, `5 reels`, `1.32%`.
- JSX: `format-card.tsx` e `frequency-card.tsx` não contêm constantes numéricas Socialinsider. Não existe ficheiro `report.json` de dados — apenas os dois ficheiros i18n.
- O legado `FORMAT_HEX` e `FORMAT_STYLE` em `format-card.tsx` são apenas cores decorativas, não dados.

### 9. Secção de metodologia explica o papel das fontes externas?
**FAIL parcial**
- `positioning.source_note`: *"Fontes de enquadramento: Socialinsider, Buffer e Hootsuite."* — menciona, mas não explica.
- `positioning.benchmark_note`: *"Os benchmarks são referências direcionais. A leitura pode variar consoante dimensão da conta, setor, período analisado e método de cálculo."* — explica natureza direcional, mas é genérica.
- `benchmarkEvidence.ctx_socialinsider`: *"engagement por formato"* — é apenas uma etiqueta de 3 palavras, não uma explicação.
- **Falta** uma frase que distinga claramente: (a) benchmark interno por escalão de seguidores vs (b) referência externa Socialinsider por formato (Instagram global). Hoje o leitor não percebe porque há *duas* fontes diferentes citadas em cartões diferentes.

---

### Outras observações pontuais
- `ExternalReferenceTable` calcula `refShare` somando `postsPerMonth` dos 3 formatos só para derivar uma quota interna da referência (linhas 578–585). Isso é uma **soma intermédia** mas nunca é exibida — usada só para classificar `delta > 10`. Tecnicamente OK, mas conceptualmente é uma soma de frequências (a mesma coisa que o ponto 4 proíbe). Não viola o requisito porque não chega ao utilizador, mas vale a pena marcar.
- `ExternalSourceNote` em ambos os cartões cai para o primeiro `ref` disponível (`reel ?? carousel ?? image`) para extrair `dataRange`. Se os 3 formatos tiverem janelas diferentes (improvável hoje, todos `valid_from` iguais no seed), só a do primeiro é mostrada.

---

### Recomendações (não aplicar agora)
1. **Mobile FormatCard:** colapsar tabela 4-col para layout empilhado (mobile: 2 colunas — perfil | referência — com "Leitura" como badge inline) ou esconder coluna "Leitura" abaixo de `sm:` e mantê-la apenas em ≥640px.
2. **Ligar veredicto à tabela:** acrescentar 1 linha no `InsightCallout` ou imediatamente abaixo: *"Compara com a referência Socialinsider abaixo"* para fazer ponte editorial → tabela.
3. **Metodologia:** acrescentar bloco curto (1–2 frases) que explique: *benchmark interno = escalão de seguidores deste perfil; referência externa Socialinsider = média Instagram global por formato (Reels / Carrosséis / Imagens). Servem para enquadramento, não como meta.*
4. **`refShare` interno:** renomear variável e adicionar comentário a explicitar que é uso interno classificatório, nunca exibido, para evitar futura confusão.
5. **`ExternalSourceNote` data range:** quando os 3 formatos tiverem ranges distintos, escolher o range mais recente ou mostrar união (`min(from)`–`max(to)`).
6. **Ressalva semântica (#3):** decidir explicitamente se queres tier interno + referência externa lado-a-lado dentro do mesmo cartão, ou se a separação atual (cartões diferentes) é desejada — afeta os pontos 1 e 3.

---

### Resumo PASS/FAIL
| # | Área | Resultado |
|---|---|---|
| 1 | Comparação clara perfil vs Socialinsider (FormatCard) | PASS com ressalva |
| 2 | Sem overclaiming | PASS |
| 3 | Distingue tier interno vs referência externa | PASS parcial (não no mesmo cartão) |
| 4 | FrequencyCard não soma frequências num total | PASS |
| 5 | Fonte visível mas discreta | PASS |
| 6 | Mobile legível | FAIL no FormatCard / PASS no FrequencyCard |
| 7 | Valores vêm de `knowledge_benchmarks` | PASS |
| 8 | Sem Socialinsider hardcoded em JSX/i18n | PASS |
| 9 | Metodologia explica fontes externas | FAIL parcial |

Sem implementação. Diz qual das recomendações queres atacar primeiro (sugiro #1 + #3 — maior impacto na experiência mobile e na clareza editorial).