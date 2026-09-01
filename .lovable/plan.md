# Report UX 08 — Pro content continuity (auditoria read-only)

Auditoria feita por leitura de código. Nada foi alterado.

## A. Árvore real do Estado C

```text
Hero + barra de utilidades
01 Visão geral (ReportOverviewBlock, access="pro")
   Índice do perfil · Engagement · Frequência · Publicações-chave · Formatos
   [+ camada comparativa quando há concorrente]
06 Conversas (Comment Intelligence)          ← já entregue em B, mantida
02 Diagnóstico editorial (ReportDiagnosticBlock)
   Grupo A Identidade editorial   → 01 Tipo de conteúdo · 02 Papel no funil
   Grupo B Como comunica          → Hashtags · Legendas
   Grupo E Análise visual         → Capas
   Grupo C Resposta do público    → 05 Resposta da audiência
   Grupo D Contexto estratégico   → 06 Integração entre canais
   [placeholder de enriquecimento pendente, quando aplicável]
Prioridades de acção (3–6 cartões)
Metodologia
```

Blocos 03–06 (Desempenho, Conteúdo, Procura, Comparação) estão `hidden` em `public_mvp` e `pro_preview` — só existem no `internal_lab`. O Pro real acrescenta exactamente dois blocos: Diagnóstico + Prioridades.

Progressão de profundidade: **PARCIAL**. A estrutura é correcta (causas → acções), mas nada no ecrã sinaliza a passagem de nível.

## B. Matriz "Porquê?"

| Sub-bloco | Classificação | Nota |
|---|---|---|
| 01 Tipo de conteúdo | EVIDÊNCIA | distribuição %, sem causa explícita |
| 02 Papel no funil | EXPLICA CAUSA | melhor peça causal do bloco |
| Hashtags | EVIDÊNCIA | inventário + classificação |
| Legendas | EXPLICA CAUSA | padrão de captions ↔ conversa |
| Capas | EXPLICA CAUSA | qualidade visual ↔ atenção |
| 05 Resposta do público | REPETE RESULTADO (parcial) | reexibe likes/comentários médios já vistos em Engagement e Conversas |
| 06 Integração entre canais | EXPLICA CAUSA | checklist bio/CTA/menções |

Saldo: 4 causa, 2 evidência, 1 repetição. Cumpre o "porquê", mas abre com evidência em vez de causa.

## C. Matriz "O que fazer?"

| Promessa (copy Pro) | Evidência real | Estado |
|---|---|---|
| "Diagnóstico editorial com as causas dos resultados" | Bloco 02 com 7 cartões | PASS |
| "O que testar, corrigir e repetir" | chips de categoria nos cartões de prioridade | PASS |
| "Prioridades de acção para as próximas 4 semanas" | prioridades existem, **sem qualquer horizonte temporal renderizado** | PARTIAL |
| "plano de prioridades para os próximos 30 dias" | nenhum sub-bloco organiza acções por semana/mês | FAIL |
| "plano de execução a 30 dias" (`diagnostic.cta_body`) | não existe no relatório entregue | FAIL |

`derivePriorities` só menciona "30 dias" no corpo de uma regra isolada; o modelo `PriorityItem` não tem campo de horizonte.

## D. Redundâncias A/B/C

| Item | Duplica | Veredicto |
|---|---|---|
| 05 Resposta do público (médias, top posts com comentários) | Engagement (A) + Conversas (B) | POTENTIAL DUPLICATION |
| `CommentIntelligenceUnavailable` dentro do cartão 05 | secção Conversas já mostra o mesmo estado | POTENTIAL DUPLICATION |
| 01 Tipo de conteúdo (distribuição) | Mix de formatos (B) | REFRAME — manter só se for lido como causa, não como distribuição |
| Hashtags | Temas/linguagem do overview | REFRAME |
| 02 Funil · Legendas · Capas · Integração | nada em A/B | KEEP |
| Prioridades | — | KEEP |

## E. Ligação Diagnóstico → Prioridades

Hoje parecem dois relatórios independentes:

- Cada cartão de diagnóstico tem âncora estável (`diag-conteudo`, `diag-funil`, `diag-hashtags`, `diag-legendas`, `diag-capas`, `diag-audiencia`, `diag-integracao`), mas **nenhuma prioridade liga a essas âncoras**.
- `basedOn` é texto livre ("Padrão das captions") e `resolves` cita "Pergunta 03/06" — numeração que **não coincide** com a numeração visível dos cartões (01, 02, 05, 06) nem com as letras dos grupos.
- Não há contagem do tipo "3 causas → 5 acções" a fechar o diagnóstico.

## F. Ordem

- Sequência dos grupos renderizada é **A → B → E → C → D**: as letras aparecem fora de ordem alfabética, o que sugere estrutura partida.
- Começa em evidência (tipo de conteúdo) e não na causa mais forte.
- "Análise visual" (E) interrompe a narrativa entre "como comunica" e "resposta do público".
- Termina bem: Integração → Prioridades.
- Falta abertura: `ReportDiagnosticVerdict` e `ReportDiagnosticSummaryCards` existem no repositório mas **não são importados por nenhum ecrã** — o bloco Pro arranca directamente no primeiro cartão, sem veredicto.

## G. Componentes a congelar (P0, não tocar)

`block02-diagnostic.ts` (classificadores, `derivePriorities`, pesos), `report-diagnostic-card.tsx`, `hashtag-diagnostics-card.tsx`, `caption-diagnostics-card.tsx`, `visual-cover-analysis-card.tsx`, `report-comment-intelligence.tsx`, cards do overview (Índice, Engagement, Frequência, Formatos, Publicações), `access-gating.ts`, `premium-cta-context.tsx`, checkout.

## H. Só precisam de enquadramento (framing)

`report-diagnostic-block.tsx` (ordem dos grupos e cabeçalho de abertura), `report-diagnostic-priorities.tsx` (cabeçalho, horizonte, ligação às âncoras), `report-shell-v2.tsx` (confirmação de desbloqueio antes do bloco 02), `block-config.ts` (numeração), copy `report.json`.

## I. Alterações mínimas recomendadas (próxima ronda, não implementadas)

1. **Entrada no Pro** — faixa editorial de uma linha antes do bloco 02 ("Relatório Pro desbloqueado · a partir daqui: porquê e o que fazer"), sem hero.
2. **Veredicto de abertura** — reactivar `ReportDiagnosticVerdict` (já existe, sem consumidores) no topo do bloco 02, alimentado por `aiInsightsV2.sections.hero` com fallback determinístico.
3. **Ordem dos grupos** — renderizar A → B → C → D → E (capas passa a fechar a evidência) ou renomear as letras para a ordem real.
4. **Ligação causa → acção** — `basedOn` passa a link para a âncora `diag-*` correspondente; remover a numeração "Pergunta N" desalinhada de `resolves`.
5. **Horizonte temporal** — chip "próximas 4 semanas" no cabeçalho das Prioridades, alinhado com a promessa comercial; sem alterar a lógica de derivação.
6. **Numeração** — `report-diagnostic-priorities.tsx` mostra "07 · Prioridades" enquanto a sidebar diz 08; alinhar com `COMMERCIAL_SECTIONS`.
7. **Título hardcoded** — "O que testar, corrigir ou repetir?" está fora do i18n; mover para `report.json` (PT/EN).
8. **Redundância 05** — remover o `CommentIntelligenceUnavailable` duplicado dentro do cartão de audiência quando a secção Conversas já está visível.
9. **Camada comparativa** — hoje vive dentro do bloco 01, mas a sidebar numera-a como secção 06; posição conceptual recomendada: depois do Diagnóstico e antes das Prioridades, para contextualizar causas sem cortar o fio.
10. **Mobile** — Estado C acumula ~7 cartões de diagnóstico + até 6 prioridades numa coluna única; recomenda-se apenas colapsar a evidência secundária (distribuições e checklists) em detalhe expansível, sem redesenho.

## Densidade

Sem "card dentro de card" problemático fora do cartão 05 (que aninha destaque de audiência + estado de comentários). O risco real é comprimento: cinco divisores de grupo com contadores "N PERGUNTAS" acrescentam labels sem acrescentar leitura.

READY FOR PRO CONTINUITY POLISH
