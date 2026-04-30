
# Avaliação · Refinamentos ao sistema de transparência de fontes

Depois de auditar `ReportSourceLabel`, os 8 cartões do Bloco 02, os 3 cartões de overview, o veredito e a metodologia, identifiquei seis refinamentos com impacto real. Estão ordenados por valor editorial (não por esforço).

---

## R1 · Legenda visual das 5 fontes (alta prioridade)

**Problema.** A linha em `ReportMethodology` ("os cartões distinguem dados extraídos, cálculos próprios, leituras automáticas, leituras por IA e referências externas") é **só texto**. O leitor vê os chips espalhados pelo relatório sem nunca ver o **mapa visual** dos cinco tipos lado a lado.

**Solução.** Substituir esse parágrafo por uma mini-grelha 5-colunas (collapse para 2 em mobile) com cada chip real renderizado + uma linha de explicação curta:

```text
[🗄 DADO EXTRAÍDO]    Recolhido directamente do Instagram.
[🧮 CÁLCULO]          Métrica calculada pela InstaBench.
[🤖 LEITURA AUTOM.]   Classificação por regras determinísticas.
[🤖 LEITURA IA]       Texto interpretativo gerado por IA.
[📖 REF. EXTERNA]     Comparação com Knowledge Base.
```

Reutiliza `ReportSourceLabel` — sem CSS novo. É **uma única adição** de educação visual que destranca a leitura de todo o relatório.

---

## R2 · Detalhes inconsistentes entre cartões (média)

Auditando os `sourceDetail` actuais detecto duplicações e granularidade desigual:

| Cartão | `sourceDetail` actual | Problema |
|---|---|---|
| Q01 Tipo | `Legendas` | OK |
| Q02 Funil | `Legendas` | OK |
| Q03 Hashtags | `Hashtags` | OK |
| Q04 Temas | `Legendas` | Confunde-se com Q01/Q02 — devia dizer `Assuntos das legendas` |
| Q05 Linguagem | `Legendas` | Idem — devia dizer `Estilo das legendas` |
| Q06 Resposta | `Gostos + comentários` | OK |
| Q07 Integração | `Bio + legendas` | OK |
| Q08 Objetivo | `Sinais cruzados` | Vago — `Conteúdo + funil + bio` |
| Engagement card | `Gostos + comentários` | OK |
| Ritmo card | `Amostra` | Vago — `Posts ÷ janela` |
| Formato card | `Posts analisados` | Vago — `Distribuição de formatos` |

**Acção.** Ajustar 5 `sourceDetail` para serem informativos sem ultrapassar ~3 palavras. Critério: o detalhe deve descrever **o input**, não o output.

---

## R3 · Veredito editorial sem chip visível (média)

`ReportDiagnosticVerdict` recebe `source: "ai" | "fallback"` mas (segundo o histórico) renderiza um chip próprio. Devia usar `ReportSourceLabel` directamente para ficar consistente com o resto do relatório:
- `source="ai"` → `<ReportSourceLabel type="ai" detail="Síntese editorial" />`
- `source="fallback"` → `<ReportSourceLabel type="automatic" detail="Síntese a partir das classificações" />`

Verificar `report-diagnostic-verdict.tsx` e alinhar.

---

## R4 · Knowledge Base chip empilhado dentro do card de envolvimento (baixa-média)

Em `EngagementRateCard` há **dois chips de fonte** no mesmo cartão:
1. Header → `CÁLCULO · GOSTOS + COMENTÁRIOS`
2. Junto ao "vs. X de referência" → `REFERÊNCIA EXTERNA · KNOWLEDGE BASE` (com `text-[9px]`)

O segundo está visualmente apertado e usa um tamanho **fora do padrão** (9px vs 10px do componente). Duas opções:

- **Opção A** (mais limpa): remover o chip secundário e mover a referência para o `header sourceSlot` como **chip duplo empilhado** (`CÁLCULO ·` em cima, `REFERÊNCIA EXTERNA ·` em baixo). Mantém o cartão a respirar.
- **Opção B**: manter os dois chips mas remover o `text-[9px]` override e deixar o componente decidir o tamanho (fica a 10px coerente com o resto). Adicionar `mt-1` para respirar.

Recomendo **B** por ser mais cirúrgica e preservar a colocação contextual da referência.

---

## R5 · Cartão de Temas sem chip quando IA disponível mas texto curto (baixa)

`renderThemesCard` decide `isAi` por `r.source === "ai"`. Mas se o `aiText` existir e ainda assim for curto/genérico, o utilizador vê `LEITURA IA` sem o bloco `aiSource` (porque o componente já mostra dentro do body). Verificar se há caso em que mostramos chip IA **sem** o bloco interpretativo abaixo — se sim, downgrade para `automatic` e clarificar `body`.

---

## R6 · Acessibilidade e responsive do chip (baixa)

Pequenas melhorias no `ReportSourceLabel`:

1. **Tooltip nativo** (`title={a11y}`) para quem passa com o rato — útil quando o chip trunca em ecrãs estreitos.
2. **Mobile (375px)**: em cartões com `answer` longa + chip longo, o chip pode empurrar o número. Adicionar `flex-wrap` no header dos cartões e garantir `max-w-full` no chip (já lá está, mas o pai do header às vezes força nowrap).
3. **Cor do `external`**: actualmente partilha o azul com `calculation` e `ai`. Para diferenciar referência externa de leitura própria, usar **violet/indigo subtil** (`bg-indigo-50 ring-indigo-200 text-indigo-700`). Mantém-se discreto, mas separa "voz da Lovable" de "voz emprestada da Knowledge Base".

---

## Fora do âmbito (deliberadamente não fazer agora)

- **Não adicionar** chips a cartões fora do Bloco 02 e overview (Bloco 01, signals card, methodology) — a saturação prejudica a leitura.
- **Não tocar** em `/report.example` (locked).
- **Não criar** novo tipo de fonte (ex.: "estimativa") — os 5 actuais cobrem todos os casos.
- **Não mexer** em providers, Supabase, schema.

---

## Detalhes técnicos

**Ficheiros tocados:**

- `src/components/report-redesign/report-methodology.tsx` — R1 (substituir parágrafo final por grelha visual com 5 chips reais).
- `src/components/report-redesign/v2/report-diagnostic-block.tsx` — R2 (5 ajustes de `sourceDetail`), R5 (validação Q04).
- `src/components/report-redesign/v2/report-overview-cards.tsx` — R2 (Ritmo + Formato), R4 opção B.
- `src/components/report-redesign/v2/report-diagnostic-verdict.tsx` — R3 (substituir chip próprio por `ReportSourceLabel`).
- `src/components/report-redesign/v2/report-source-label.tsx` — R6 (tooltip + cor `external` indigo).

**Validação:**
- `bunx tsc --noEmit`
- `bunx vitest run`
- Inspecção visual em `/analyze/frederico.m.carvalho` a 375px / 768px / desktop.

---

## Checkpoint

☐ R1 · Grelha visual de legenda na metodologia
☐ R2 · `sourceDetail` ajustados em 5 cartões
☐ R3 · Veredito a usar `ReportSourceLabel`
☐ R4 · Engagement card — chip Knowledge Base normalizado (opção B)
☐ R5 · Q04 Temas — coerência IA chip ↔ aiSource block
☐ R6 · Tooltip + tom indigo para `external`
☐ TS pass · Vitest pass · QA visual 375 / 768 / desktop

Aprovas avançar com **todos os seis** ou queres que deixe algum de fora?
