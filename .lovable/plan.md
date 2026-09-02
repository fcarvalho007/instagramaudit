# CONVERSION UX 10A — Auditoria de onboarding, captura de email e qualificação anónima

Ronda read-only. Nenhum ficheiro de produto foi alterado. Todas as afirmações abaixo estão confirmadas por leitura de código nesta ronda.

## A. Inventário de componentes

| Componente | Onde é montado | Trigger | Finalidade | Campos | Obrigatório | Persistência | Destino | Estado |
|---|---|---|---|---|---|---|---|---|
| `HeroActionBar` (`src/components/landing/hero-action-bar.tsx`) | homepage | escrita do handle | entrada anónima | username | sim | nenhuma (evento `instagram_handle_submitted`) | `/analyze/$username` | PUBLIC ACTIVE |
| `AnalysisSkeleton` (`src/components/product/analysis-skeleton.tsx`) | `analyze.$username` (l.377), `reports.$snapshotId`, `dev-loading-preview` | estado `loading` | loader de 4 fases (22 s de guião) | nenhum | — | nenhuma | — | PUBLIC ACTIVE |
| `InstantAuditBar` (`src/components/product/instant-audit-bar.tsx`) | `analyze.$username` (l.699) | Estado A pronto | cabeçalho informativo; CTA só se `leadCaptured` | nenhum | — | eventos de funil | abre `ConversionSheet` | PUBLIC ACTIVE |
| `ConversionSheet` (`src/components/conversion/conversion-sheet.tsx`) | `analyze.$username` (l.776) | gate de publicações, sidebar, `StickyFreeCtaBar`, `InstantAuditBar` | captura de email pós-valor + arranque do Nível 2 | email, opt-in marketing, (pós-submit) relação | email sim; resto não | `/api/public/lead-capture` → `leads` + `lead_reports`; `/api/public/report-relationship` → `lead_reports.profile_relationship` | fica na página, Estado B | PUBLIC ACTIVE |
| `OnboardingModal` (`src/components/onboarding/onboarding-modal.tsx`, 1375 l.) | `analyze.$username` (l.398) e `CheckoutAccountGate` (l.142) | em `analyze` só quando a API devolve `ONBOARDING_REQUIRED` (l.292); no checkout, sempre | conta + password + qualificação | email, nome, password, qualificação, relação, consentimentos | sim | `/api/onboarding/start`, `/check-email`, `/claim-existing` → `leads` (`user_type`, `profile_ownership`, `qualification`), Supabase Auth | sessão `lead_session` | FALLBACK em `/analyze` (inatingível com `PUBLIC_BASELINE_NO_EMAIL=true`); ACCOUNT/CHECKOUT ACTIVE no checkout |
| `GridSelectField` (`src/components/onboarding/grid-select-field.tsx`) | apenas dentro do `OnboardingModal` (l.1325, `name="profile_relationship"`) | passo de qualificação | grelha de rádios com ícones | 1 escolha | sim nesse passo | via `start` | — | ACCOUNT ACTIVE, reutilizável |
| `CheckoutAccountGate` (`src/components/checkout/checkout-account-gate.tsx`) | rotas de checkout sem `lead_session` | falta de sessão | conta antes de pagar | delega no modal | sim | idem | checkout | ACCOUNT/CHECKOUT ACTIVE |
| `QualificationForm` (`src/components/checkout/qualification-form.tsx`) | passos de checkout | pós-pagamento/briefing | objectivo + posse | `objective`, `profile_ownership` | opcional | metadata do pedido | checkout | ACCOUNT ACTIVE, **taxonomia divergente** (`mine/my_brand/client/competitor`) |
| `unlock-flow.ts` (`GOALS`, `USER_TYPES`, `PRICING_PREFERENCES`, password, GDPR) | schema partilhado | — | funil antigo de unlock | — | — | — | — | LEGACY (mantido por compatibilidade) |

## B. Fluxos activos vs legacy

- **PUBLIC ACTIVE**: homepage → `AnalysisSkeleton` → Estado A → `ConversionSheet` (email) → Estado B. Sem password, sem gate antes do valor.
- **ACCOUNT/CHECKOUT ACTIVE**: `CheckoutAccountGate` + `OnboardingModal` (3 passos com password) + `QualificationForm`.
- **FALLBACK**: `OnboardingModal` em `/analyze` só reage a `ONBOARDING_REQUIRED`; hoje é código morto na prática, mas é uma rede útil se o kill-switch da baseline gratuita for desligado.
- **LEGACY**: `unlockFormSchema` (nome+password+GDPR+goal+user_type+pricing), `PROFILE_OWNERSHIPS`, `GOALS`, `USER_TYPES` — já não definem a UX pública.

## C. Reconciliação histórica (o que reaproveitar)

O “passo de qualificação → reutilizar, 1 pergunta” e o “ConversionSheet → email apenas” não são contraditórios: o que foi abandonado foi **o funil de 3 passos antes do valor**, não a taxonomia nem os componentes.

- Reaproveitar: `PROFILE_RELATIONSHIPS` (5 opções, PT/EN), `RELATIONSHIP_TO_QUALIFICATION` (derivação CRM), `GridSelectField` (radio semantics, `focus-visible`, ícones, grelha 2/4 col.), endpoint `/api/public/report-relationship`.
- Não reaproveitar: stepper de 3 passos, password no fluxo público, `goal`/`user_type`/`pricing_preference`, draft em `localStorage` do onboarding.
- Duplicado a assinalar: a taxonomia de posse do `QualificationForm` do checkout não corresponde a `PROFILE_RELATIONSHIPS`; a pergunta de relação existe hoje em dois sítios com markup diferente (grelha com ícones no modal, botões planos no `ConversionSheet`).

## D. Problemas do `ConversionSheet` (classificação)

**KEEP** — um único campo obrigatório, marketing opt-in separado e desligado por omissão, sem password, relação sempre saltável, fail-soft na qualificação, dedupe de analytics, blur do campo para fechar o teclado mobile, Sheet em mobile / Dialog em desktop.

**POLISH**
1. O botão de submit é um `<button>` cru em vez do `Button` do design system (inconsistência de estado/foco).
2. Sem foco programático no campo de email ao abrir, e sem `aria-describedby` a ligar `microcopy`/erro ao input.
3. O painel `done` muda de conteúdo sem mover o foco nem anunciar título novo; só o parágrafo de estado tem `role="status"`.
4. Estado `submitting` sem `aria-busy`; erro de rede não distingue offline de 5xx.
5. A promessa do Nível 2 vive só em `subcopy`; não há lista curta e literal do que o email desbloqueia (publicações, formatos, conversas).
6. Sem persistência do email escrito se o utilizador fechar por engano.

**REUSE FROM OLD ONBOARDING** — substituir a lista de botões planos da pergunta de relação pelo `GridSelectField` (ícones + rádios reais) em variante compacta.

**REMOVE** — nada. Não há passwords, campos supérfluos nem promessas que o Estado B não cumpra.

## E. Pergunta durante o loading (avaliação técnica)

É viável **sem acoplar** o pipeline: `AnalysisSkeleton` é puramente visual e `load()` em `analyze.$username` já corre independente; a pergunta seria um bloco dentro do loader com `setTimeout` de 2,5–3 s, e o `setState({status:"ready"})` desmonta tudo. Cache hit rápido (<2,5 s) nunca chega a mostrar a pergunta. Recomendação: **uma pergunta, a de relação** (taxonomia já existente), um clique, “Agora não”, nunca modal, nunca bloqueante, e supressão por sessão para não reaparecer em refresh.

## F. Persistência anónima recomendada (mínima)

Separar os dois planos:
- **Estado UX** (“já mostrei/já respondi”): `sessionStorage`, chave `ib:relq:<handle>` → `asked|answered|skipped`. Sem cookie novo, sem servidor.
- **Dado de negócio** (“a resposta”): guardar em `sessionStorage` como *pending answer* por handle e só o enviar para `/api/public/report-relationship` **depois** da captura de email, quando já existe `lead_id` + `cache_key`. Não criar lead nem conta para armazenar qualificação.

Implicação de privacidade: não persistir a resposta server-side enquanto for anónima. Se no futuro se quiser sinal agregado antes do email, usar apenas um evento de funil sem PII em `product_events` (o endpoint `/api/public/funnel-event` já existe e só guarda hash truncado de IP) — mas isso exige adicionar o tipo de evento à allowlist.

## G. Uma pergunta vs rotação

Recomendação: **Opção A — uma pergunta canónica**. A relação com o perfil é a única resposta com consumidor real hoje (`lead_reports.profile_relationship` + derivação para `leads.qualification`) e é comparável entre todos os visitantes. A Opção B destrói comparabilidade; a Opção C só faz sentido quando houver segunda e terceira perguntas com consumidor definido — a arquitectura proposta (registo de perguntas + chave por handle) deixa a porta aberta sem a lançar.

## H. Modelo de dados já existente a reutilizar

- `lead_reports.profile_relationship` + `relationship_source` (por relatório, correcto para “pertence ao handle, não ao utilizador”).
- `leads.qualification` (derivada), `leads.instagram_handle` (só quando `owner`).
- `product_events` para funil anónimo.
- Nenhuma tabela, coluna ou taxonomia nova é necessária.

## I. Alterações mínimas recomendadas (para uma ronda 10B de implementação)

1. Extrair uma variante compacta de `GridSelectField` (mesma origem, sem terceiro markup) e usá-la na pergunta de relação do `ConversionSheet`.
2. Adicionar ao `AnalysisSkeleton` um slot opcional para a pergunta não bloqueante, com atraso de 2,5–3 s e “Agora não”.
3. Guardar a resposta pendente em `sessionStorage` por handle; enviar após a captura de email.
4. `ConversionSheet` deixa de repetir a pergunta quando existe resposta pendente/respondida para o mesmo handle.
5. Polish de acessibilidade do `ConversionSheet` (foco inicial, `aria-describedby`, `aria-busy`, foco no estado `done`) e uso do `Button` do design system.
6. Alinhar (ou documentar explicitamente como distinta) a taxonomia de posse do `QualificationForm` do checkout.
7. Manter o `OnboardingModal` intacto como caminho de conta/checkout e como fallback de `ONBOARDING_REQUIRED`.

Os quatro conceitos ficam separados: **qualificação anónima** (loader, sessionStorage), **captura de lead** (`ConversionSheet`, email), **autenticação** (checkout/área privada), **consentimento de marketing** (checkbox própria).

READY FOR CONVERSION & ANONYMOUS QUALIFICATION IMPLEMENTATION
