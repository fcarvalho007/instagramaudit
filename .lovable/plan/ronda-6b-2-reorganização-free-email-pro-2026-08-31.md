# Ronda 6B.2 — Reorganização Free / Email / Pro

Grande parte da ronda já ficou implementada em 6B.1 (ordem do overview, `access="anon" | "lead" | "pro"`, `PostComparisonPreview`, Conversas cumulativas, `COMMERCIAL_SECTIONS` 01–08, sanitização `free/lead/pro`). Esta ronda fecha os desvios que restam, sem redesign interno dos cards.

## Desvios detectados face à especificação

1. **Estado C não é cumulativo de B.** Com `premiumUnlocked`, o shell usa o ramo antigo `mode="all"` do `ReportOverviewBlock`, com outra ordem (Engagement → Frequência → Formatos → Publicações-chave) e cards de comparação de concorrentes. O cliente pago vê uma arquitectura diferente da que viu em B.
2. **Estado A tem CTAs duplicados.** O visitante anónimo recebe o CTA dentro do `PostComparisonPreview`, o `FreeDeepenTeaser`, o `DeepenAnalysisCta` da rota e a `StickyFreeCtaBar` — quatro convites para a mesma acção.
3. **Copy do primeiro gate** não segue §8 (falta o badge "Grátis com email" como família única, headline "Queres ver o que encontrámos nestas publicações?" e menção a conteúdos + formatos + conversas).
4. **Teasers Pro aparecem antes de Conversas no estado B**, quando a proposta Pro deve ser única e vir depois de Conversas.
5. **Falta evento** `post_comparison_preview_viewed` (ou reutilização semântica do evento de deepen).
6. **Matriz de dados por post no payload anónimo** ainda não está documentada.

## Alterações previstas

### A. Composição cumulativa (A ⊂ B ⊂ C)
- `report-shell-v2.tsx`: passar sempre o ramo comercial (`mode="free_with_engagement"`) com `access = premiumUnlocked ? "pro" : leadCaptured ? "lead" : "anon"` nas variantes públicas (`public_mvp`, `pro_preview`).
- O ramo `mode="all"` (com comparação de concorrentes e leituras IA por card) fica reservado a `internal_lab` e ao modo comparação — não é apagado.
- Resultado: em C, os cinco cards iguais aos de B, seguidos de Conversas, Diagnóstico Editorial e Prioridades.

### B. Estado A com um único convite
- Remover o CTA interno do `PostComparisonPreview` (mantendo a faixa protegida com blur ~2 px e o CTA nítido no gate único).
- `FreeDeepenTeaser` passa a ser o gate único, com a copy de §8: eyebrow "Grátis com email", headline "Queres ver o que encontrámos nestas publicações?", suporte a mencionar melhores/piores conteúdos, formatos e conversas, CTA "Aprofundar gratuitamente" a abrir o `ConversionSheet` existente.
- Confirmar que em A não renderiza `FormatCard`, Conversas, Diagnóstico, Prioridades, teasers Pro, início da secção 02 nem CTA de 9 €.

### C. Estado B com proposta Pro única
- Teasers Pro deixam de ser renderizados dentro do overview; a transição Pro fica no bloco de fim (`ReportEndOfFreeBlock`), depois de Conversas, com a narrativa de §10 ("Já sabes o que está a acontecer. Agora descobre porquê — e o que deves fazer a seguir.") e o CTA canónico de 9 €. Preço e checkout inalterados.

### D. Analytics
- Acrescentar `post_comparison_preview_viewed` (via `useTrackOnceInView`) no preview em estado A. Sem eventos redundantes: `deepen_cta_viewed/clicked` mantêm-se.

### E. Dados
- Sem reescrita do contrato do snapshot. Documentar em `mem/features/free-pro-card-mirror.md` (ou nota adjacente) os campos por-post ainda presentes no payload anónimo e, se for seguro, remover apenas campos analíticos explicitamente Premium com teste a cobrir os três cards gratuitos.

### F. Sidebar
- `COMMERCIAL_SECTIONS` já está na ordem 01–08 com os anchors pedidos: apenas verificar que em A as entradas Pro não parecem navegáveis e que "Publicações-chave" comunica aprofundamento gratuito.

## Testes
- `access-gating.test.ts`: manter a matriz A/B/C.
- `report-shell-composition.test.ts`: novas invariantes — ramo comercial usado também em Pro, Conversas presente em B e C, Diagnóstico e Prioridades apenas em C, sem teasers Pro no overview.
- Testes de sanitização `free/lead/pro` mantidos e alargados se houver hardening de campos.

## Validação
- Capturar o mesmo snapshot em `/admin/report-lab` nos estados A, B e C, desktop e mobile, e comparar com o percurso público equivalente.

## Fora de âmbito
Design interno dos cards, hero, tipografia, sidebar redesenhada, Diagnóstico interno, cards Lab, pagamentos, preço, providers e fórmulas.

## Riscos residuais
- Em C público deixam de aparecer os cards de comparação de concorrentes que hoje surgem via `mode="all"`; ficam disponíveis no Lab e no modo comparação. Confirmar que é o comportamento desejado.
- Payload anónimo continua a expor campos por-post não analíticos; hardening completo fica para ronda futura.
