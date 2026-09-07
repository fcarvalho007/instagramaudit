# Editorial V2 — auditoria final de paridade (pré-lançamento)

Auditoria só de leitura. Nenhum ficheiro de produto foi alterado.

## 1. Veredicto

**NOT READY FOR DEFAULT SWITCH**

## 2. Problemas bloqueantes

**B1 — Mix de formatos exposto a visitantes anónimos (regressão de acesso).**
Em produção o cartão de formatos só aparece depois do email
(`report-overview-block.tsx`, condição `access !== "anon"`; escalão da secção
`formatos` = `free_email` em `block-config.ts`). No Editorial V2 a secção 03
é renderizada sempre (`editorial-v2-shell.tsx`, condição
`features.blockOverview !== "hidden"`), pelo que um anónimo vê contagens,
percentagens, formato dominante e miniaturas reais. Prova visual recolhida em
`/analyze/karmel.pt?report_design=editorial_v2` sem sessão: "9 de 12 · 75%",
"2 de 12 · 17%", "1 de 12 · 8%" e 12 miniaturas. A própria barra de navegação
do Editorial V2 mostra o cadeado em "03 Mix de formatos" — a chrome e o corpo
contradizem-se. Ficheiro implicado: apenas
`src/components/report-editorial-v2/editorial-v2-shell.tsx`.

**B2 — QA Pro real continua impossível.**
Estado real da base de dados: `lead_report_unlocks` = 0 linhas,
`lead_payments` = 0 linhas (nenhum pagamento pago), `lead_entitlements` = 1
linha (`report_full_9`, lead `qa.provider.validation@auditprofiles.com`,
`payment_id` nulo, nota "provider validation", sem relatório associado).
Não existe relatório Pro genuíno, pelo que **06 — Diagnóstico editorial** e
**07 — Prioridades de ação** não puderam ser comparados com produção em dados
reais.

`LAUNCH BLOCKED — no genuine Pro report available for mandatory real Pro QA`

Nada foi simulado: nenhum pagamento, entitlement, crédito ou `premiumUnlocked`
forçado.

## 3. Discrepância de fonte a decidir (não corrigida)

Referência de engagement do mesmo perfil, mesma janela:

- V1 mostra **4,80%** — vem da série estática consolidada
  (`benchmark-context.ts`, `getConsolidatedBenchmarkSeries`, usada em
  `report-overview-engagement.tsx` para o valor do gráfico *e* do KPI).
- V2 mostra **5,60%** e "dataset v1.0-2025-04" — vem de
  `keyMetrics.engagementBenchmark`, o valor calculado pelo motor de benchmark
  a partir de `benchmark_references`.

Ambos existem em produção; o V2 usa a fonte de dados viva, o V1 usa a série
editorial fixa. A diferença altera o número visível e o texto de delta
(96% vs −96,3%). Não foi reconciliado — decisão de produto necessária antes
do switch.

Nota relacionada já existente em V1 (não introduzida pelo V2): o gráfico de
escalões do V1 assinala "estás aqui" na banda 5K–20K (Micro) enquanto o perfil
é classificado como Nano.

## 4. Defeitos não bloqueantes

- Seguidores no Editorial V2 aparecem como `9115`, sem separador de milhares
  (V1: "9,1 mil"). Valor correcto, formatação inconsistente.
- Badge `Editorial V2 · Preview` e o respectivo TODO permanecem — permitido
  enquanto o V2 for pré-visualização.

## 5. Relatórios reais testados

| Perfil / snapshot | Rota | Estado |
| --- | --- | --- |
| `karmel.pt` | `/analyze/karmel.pt` (V1 e V2) | Anónimo |
| `dd8a1168…` (karmel.pt) | `/reports/:snapshotId` (V1 e V2) | Histórico |
| `frederico.m.carvalho` | `/analyze/...` (V2) | Free capturado (fase J) |
| — | — | Pro: **indisponível** |

Estados E (30 dias) verificados; F (90 dias), G (concorrente), H (sem
créditos) e I (packs) não foram exercidos por exigirem acções que consomem
saldo ou dados reais inexistentes.

## 6. Paridade secção a secção (anónimo + histórico)

| Secção | Resultado |
| --- | --- |
| 00 Visão geral | PASS (handle, seguidores 9 115, amostra 12, escalão Nano, janela 30 dias, índice 37/100, sem marcador de mediana) |
| 01 Engagement | PASS na taxa (0,21%) e amostra; **FAIL na referência** (4,80% vs 5,60%) — ver ponto 3 |
| 02 Frequência | PASS (2,8/semana; Seg 0, Ter 3, Qua 1, Qui 2, Sex 3, Sáb 3, Dom 0; empate tratado como empate) |
| 03 Mix de formatos | **FAIL de acesso** (números correctos, visibilidade errada) |
| 04 Publicações-chave | PASS (métricas ocultas a anónimo, tal como produção) |
| 05 Conversas | PASS (ausente para anónimo, tal como produção) |
| 06 Diagnóstico | NÃO TESTÁVEL (sem Pro real) |
| 07 Prioridades | NÃO TESTÁVEL; confirmado que não existe secção 08 |
| Metodologia/fontes/rodapé | PASS (Socialinsider Fev 2026, Buffer Mai 2026, Hootsuite Abr 2026, dataset 2026-05-08, recolha 02 Set 2026 — todos do registo real) |

## 7. Proveniência numérica

| Métrica | Fonte autoritativa | Tipo | Paridade |
| --- | --- | --- | --- |
| Seguidores (9 115) | snapshot | bruto | PASS (formatação difere) |
| Amostra (12) | snapshot | bruto | PASS |
| Índice (37/100) | cálculo determinístico 60/40 | derivado | PASS |
| Engagement (0,21%) | cálculo sobre posts | derivado | PASS |
| Referência (4,80% / 5,60%) | série editorial vs `benchmark_references` | benchmark | **FAIL** |
| Delta (−96,3%) | derivado da referência acima | derivado | depende de 3 |
| Frequência (2,8/sem) | cadência de produção | derivado | PASS |
| Dias da semana | agregação UTC dos posts | derivado | PASS |
| Contagens/percentagens de formato | classificação do snapshot | derivado | PASS (valores) |
| Gostos/comentários, médias, melhor/pior, amplitude | posts do snapshot | bruto/derivado | PASS (fases D/E) |
| Agregados de comentários | payload + inteligência persistida | bruto/enriquecimento | PASS (fase F) |
| Evidência de diagnóstico/prioridades | saídas persistidas | enriquecimento | NÃO TESTÁVEL |
| Preço (9€) | `PUBLIC_PRODUCTS` | catálogo | PASS |
| Saldo de créditos/packs | saldo real do lead | bruto | PASS (código partilhado) |

## 8. Matriz de acesso

| Estado | Resultado |
| --- | --- |
| Anónimo | **FAIL** (mix de formatos) |
| Free capturado | PASS |
| Pro | NÃO TESTÁVEL |
| Internal lab | PASS — nenhum bloco lab renderizado; "Sinais de procura" fica fora da metodologia pública |

## 9. Comercial, chrome e rotas

- Comercial: PASS por código e testes — gate Pro, preço dinâmico, CTA,
  consumo de unlock, créditos, 30/90 dias, concorrente e cache reutilizam os
  mesmos handlers de produção (`use-report-explore-actions.ts`). Nenhuma
  acção financeira foi executada.
- Chrome: PASS — período, concorrente, navegação com secção activa, CTA Pro,
  menu de acções, partilha, PDF e saldo vêm da produção. Não existe acção
  fictícia; "Guardar" continua a não existir, tal como em produção.
- Rotas: PASS — as quatro rotas respondem, as duas por omissão mantêm o
  desenho de produção e só `?report_design=editorial_v2` activa o V2.
- Rede: os pedidos são idênticos entre V1 e V2 nas mesmas rotas. O V2 não
  desencadeia IA, enriquecimento, nova recolha nem pedidos extra.

## 10. QA visual e acessibilidade

Sem overflow horizontal a 375px, 820px e 1440px; sem erros de consola nem
falhas de hidratação em nenhuma das rotas testadas. Miniaturas reais carregam.
Hierarquia de títulos coerente e ligações externas com alvo/rel seguros.
Não foi feita auditoria de teclado exaustiva por não haver bloqueador
identificado.

## 11. Testes

- `tsgo --noEmit`: OK.
- Suite completa: 157 ficheiros, 1 254 testes verdes, 5 ignorados,
  **6 falhas pré-existentes** e alheias ao Editorial V2 (2 ficheiros de admin:
  `send-commercial-followup` e `lead-context-labels`). Nenhuma falha nova.

## 12. Diferenças intencionais que permanecem

PDF, pré-visualização de administração e Report Lab continuam no desenho
antigo — fora do âmbito e sem efeito no relatório público.

## Próximo passo proposto (correcção mínima, ainda não aplicada)

Alinhar a visibilidade da secção 03 com produção, alterando apenas a condição
em `src/components/report-editorial-v2/editorial-v2-shell.tsx` para
`leadCaptured || premiumUnlocked`, acrescentando um teste de regressão de
gating. Sem outras alterações. A decisão sobre a referência de engagement
(ponto 3) e o desbloqueio da QA Pro real (B2) ficam para decisão do
proprietário antes da Fase L.
