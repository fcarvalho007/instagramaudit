# Editorial V2 — Fase H: 07 · Prioridades de ação

## Auditoria feita (read-only)

**Onde vivem as prioridades hoje**
- Tipos e regras determinísticas: `src/lib/report/block02-diagnostic.ts` (`PriorityItem`, `derivePriorities`).
- Montagem final (IA + determinístico, sanitização, dedupe, corte): inline em
  `src/components/report-redesign/v2/report-diagnostic-block.tsx`.
- Apresentação atual: `src/components/report-redesign/v2/report-diagnostic-priorities.tsx`.
- Sanitização numérica da prosa IA: `src/lib/insights/sanitize-ai-priorities.ts`.

**Contrato do objecto de prioridade (real, verificado)**
| Campo | Origem |
| --- | --- |
| `title`, `body` | regra determinística **ou** prosa IA persistida (`enriched.aiInsightsV2.priorities`), já sanitizada |
| `level` (`alta`/`media`/`oportunidade`) | regra determinística; nos itens IA vem do output persistido |
| `category` (`testar`/`corrigir`/`repetir`/`oportunidade`) | regra determinística; nos itens IA é inferida por verbos em `inferAiPriorityItem` (produção) |
| `basedOn` | regra determinística; nos itens IA é inferido por palavras-chave (produção) |
| `evidence` (label/valor) | só em regras determinísticas, com valores calculados do snapshot |
| `source` (`deterministic`/`ai`) | atribuído na montagem |
| `resolves` | legado, já não renderizado |

**Ordem, dedupe e contagem:** itens IA primeiro, depois determinísticos ordenados por
`_score`; dedupe por `título|categoria|primeira base`; corte em 6. Contagem é dinâmica
(pode ser 3–6). Não existe secção 08 funcional — o "08" atual é apenas rótulo visual.

**Gating:** as prioridades vivem dentro do bloco de diagnóstico, gated por
`premiumUnlocked && features.blockDiagnosis !== "hidden"`. Anónimo e Free não veem.

**Testar/Corrigir/Repetir:** existe como dado real (`category`), incluindo para itens IA
via regra de produção já aprovada. Vai ser reutilizado tal como está — nada inventado.

**Estados:** sem prioridades → lista vazia (produção esconde a secção). Enrichment
pendente/falhado é sinalizado à parte via `getEnrichmentState`.

## O que vai ser feito

1. **Extracção de lógica pura (sem mudança de comportamento)**
   Mover a montagem de prioridades (mapeamento IA, sanitização, dedupe, corte a 6)
   de dentro de `report-diagnostic-block.tsx` para `src/lib/report/build-priority-items.ts`.
   A produção passa a importar essa função; o resultado tem de ser byte-a-byte igual.
   Testes de regressão garantem isso.

2. **Nova apresentação Editorial V2** em `src/components/report-editorial-v2/priorities/`
   - `priorities-data.ts` — adaptador puro que devolve a lista já montada pela produção.
   - `editorial-priorities.tsx` — sequência editorial vertical: número de apresentação
     (01, 02…), título/acção, metadados reais (categoria, nível, origem) só quando
     existem, corpo da recomendação, evidência em `ObservationBlock`, "Baseado em"
     discreto no fim.
   - Intro: eyebrow `07 — Prioridades de ação`, título "Onde concentrar a atenção a
     seguir", lede com linguagem de sugestão (sem promessas de impacto).
   - Mobile 375px: fluxo contínuo, sem carrossel nem grelha; número e título dominantes.
   - Estado vazio verdadeiro quando não há prioridades.

3. **Integração no shell** `editorial-v2-shell.tsx` com exactamente a mesma condição de
   produção (`premiumUnlocked && features.blockDiagnosis !== "hidden"`), a seguir ao
   Diagnóstico. **Remoção completa** do placeholder de desenvolvimento de "07 —
   Prioridades". Mantém-se apenas o indicador global `Editorial V2 · Preview`.

## O que NÃO muda

Geração, prompts, modelo, contexto IA, regras determinísticas, sanitização, dedupe,
ordenação, categorias, níveis, evidência, `basedOn`, entitlements, pagamentos, loaders,
APIs, PDF, Admin Preview, Report Lab, analytics. Nenhuma chamada de rede ou IA no render.

## Testes

Novo `priorities.test.ts` cobrindo: render só em Editorial V2; invisível para anónimo e
Free; visível com Pro; contagem dinâmica; ordem igual à produção; alteração de input muda
output; categoria/nível/origem/`basedOn`/evidência só quando existem; sem classificação
inventada; sem números da HTML de referência; sem fetch/IA no render; estado vazio;
snapshot antigo com metadados parciais; sem `NaN`/`Infinity`; placeholder removido.
Mais regressão da extracção, testes de prioridades existentes, diagnóstico, gating/variante
e lab, e typecheck.

## Bloqueador registado

`Editorial V2 real Pro QA pending` — não existe relatório Pro real desbloqueado na base de
dados, pelo que a QA manual de proveniência e a QA visual 1440/820/375 com dados Pro reais
ficam BLOQUEADAS. Não será simulado entitlement nem usados fixtures como se fossem QA real.
Este bloqueador tem de ser resolvido antes de o Editorial V2 poder ser default público.
