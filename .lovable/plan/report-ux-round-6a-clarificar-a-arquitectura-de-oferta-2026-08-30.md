# Report UX Round 6A — Clarificar a arquitectura de oferta

Sem redesenho visual. Sem alterações a métricas, fórmulas, dados, providers, pagamentos, preço, entitlements, pipeline Pro ou `/report.example`.

## Estado actual verificado

Parte da ronda já está no código (turno anterior):

- `ReportShellV2` recebe `leadCaptured` e já esconde os 5 `PremiumTeaserCard`, a `StickyUnlockBar` e o `ReportEndOfFreeBlock` no estado anónimo.
- A secção `#conversas` com `CommentIntelligenceSection` já é renderizada quando `leadCaptured && !premiumUnlocked`.
- `DeepenAnalysisCta` (âncora `#deepen-analysis`) é o único CTA principal do anónimo e abre o `ConversionSheet` com `conversion_entry_point="comment_intelligence"`.
- `ReportEndCta` já foi retirado da rota.

Lacunas confirmadas por leitura:

1. `leadCaptured = unlockStatus !== null` só é verdadeiro para quem submeteu o email **nesta sessão de página**. Um lead que regressa por magic link, ou um snapshot que já tem `comment_intelligence`, cai indevidamente no estado A.
2. `StickyUnlockBar` só existe na versão 9€. No estado A não há sticky nenhuma; no estado C está corretamente ausente.
3. `UnlockModal` continua montado na rota (`onUnlockClick` da sidebar). A sidebar é a única superfície que ainda o abre.
4. `report-block-nav` marca todos os blocos ≠ overview como `premium`, sem distinguir "Conversas" (gratuito após email).
5. Faltam eventos para separar Instantânea→Email de Email→Pro: existem `lead_cta_viewed/clicked` e `premium_cta_clicked`, mas não `comment_intelligence_viewed`, `pro_cta_viewed`.

## Alterações propostas

### 1. Derivar o estado real (A / B / C)

Criar um único cálculo na rota `analyze.$username.tsx`:

```
premiumUnlocked            → Estado C
leadCaptured               → Estado B
caso contrário             → Estado A
```

`leadCaptured` passa a ser verdadeiro se qualquer destes for verdadeiro:

- `unlockStatus !== null` (sessão actual);
- o payload do snapshot já traz `comment_intelligence`;
- existe sessão de lead para este snapshot, lida de um endpoint leve `GET /api/public/report-access-state?snapshotId=…` que devolve apenas `{ leadCaptured: boolean }` a partir do cookie `report_capture_session`/`lead_session` já existentes (sem devolver email, leadId ou histórico).

Nada de novo é escrito em base de dados; o endpoint é só leitura.

### 2. CTAs por estado

| Estado | CTA principal | Destino | Superfícies |
|---|---|---|---|
| A — Auditoria Instantânea | "Aprofundar gratuitamente" | `ConversionSheet` (`comment_intelligence`) | `DeepenAnalysisCta` no fim do conteúdo gratuito + sticky discreta com a mesma acção |
| B — Análise Aprofundada | "Desbloquear análise Pro · 9€" | `PremiumCtaProvider` | `ReportEndOfFreeBlock` + `StickyUnlockBar` |
| C — Pro | nenhum CTA de compra | — | apenas utilitários (PDF/partilha) |

- `InstantAuditBar` fica informativa nos estados A e C; no estado B mostra "guardado" quando aplicável. Nunca compete com o CTA principal.
- A `StickyUnlockBar` ganha uma variante `free` (copy "Aprofundar gratuitamente", sem preço, sem contador de teasers) usada no estado A, e mantém a variante actual de 9€ apenas no estado B.
- No estado A mantém-se apenas uma menção discreta e não interactiva de que existe Análise Pro (texto, sem botão nem preço).

### 3. Comment Intelligence

- Secção `02 · Conversas` mantém-se logo a seguir ao overview.
- Estado A: não renderizar bloco blur; apenas o CTA contextual.
- Estado B: renderizar `CommentIntelligenceSection`; enquanto `unlockStatus` for `queued`/`pending`, mostrar o estado de processamento já existente e continuar o polling da Ronda 4 até `comment_intelligence` aparecer no snapshot; em falha, `CommentIntelligenceUnavailable`.
- Nenhuma métrica nova; reutiliza `report-comment-intelligence.tsx`.

### 4. UnlockModal legado

- Deixa de ser montado em `analyze.$username.tsx`; `onUnlockClick` da sidebar passa a abrir o `ConversionSheet` (estado A) ou o fluxo Premium (estado B).
- O ficheiro `unlock-modal.tsx` não é apagado. Os usos restantes noutras rotas são listados em comentário no topo do componente e no resumo final.

### 5. Sidebar

Sem redesenho. Apenas a lógica de `buildSidebarItems` e badges:

- "Conversas" passa a item próprio com badge "Gratuito após email" no estado A e acessível no estado B.
- Blocos 03–07 mantêm badge Pro; o rótulo "GRÁTIS" repetido é removido dos itens já acessíveis.
- Estado C: tudo acessível, sem badges comerciais.

### 6. Nomenclatura e copy

UI pública usa apenas "Auditoria Instantânea", "Análise Aprofundada" e "Análise Pro". "Nível 0/1/2" fica só em comentários de código. Copy de apoio do estado A: "Guarda esta auditoria e descobre o que revelam as conversas nas publicações recentes."

### 7. Analytics

Acrescentar ao allow-list do funil anónimo, com dedupe por `snapshotId`:

- `deepen_cta_viewed`, `deepen_cta_clicked` (aliases explícitos dos actuais `lead_cta_*` no contexto do CTA gratuito);
- `comment_intelligence_viewed`;
- `pro_cta_viewed`, `pro_cta_clicked`.

`conversion_entry_point` é preservado em todos. Nenhum evento dispara por rerender (IntersectionObserver + dedupe já existentes).

## Validação

- Screenshots desktop e mobile (375 e 390 px) dos três estados do mesmo relatório, verificando que a sticky não tapa conteúdo e que não há CTAs empilhados.
- Não-regressão: baseline sem email e sem créditos; Comment Intelligence gratuito e sem débito no `credit_ledger`; entitlement 9€ inalterado; 30d/90d e concorrentes inalterados; magic link/histórico inalterados; relatório Pro completo.
- `bunx tsgo --noEmit` e as suites de `src/components`, `src/lib/leads` e API do relatório.

## Riscos

- O novo endpoint de estado de acesso é mais uma superfície pública: devolve apenas um booleano, sem dados do lead.
- Dois testes falham já hoje por motivos pré-existentes (`LockGatePremium` removido; labels de leads no admin) e não serão mascarados nesta ronda.
- Se o cookie de captura estiver ausente num regresso cross-device antes do magic link, o utilizador vê o estado A e volta a submeter o email — comportamento idempotente já validado na Ronda 4.5.
