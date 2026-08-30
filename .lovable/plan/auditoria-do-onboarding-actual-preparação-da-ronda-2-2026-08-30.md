# Auditoria do onboarding actual — preparação da Ronda 2

Auditoria read-only. Nenhum ficheiro de código, schema, rota ou variável foi alterado.

## 1. Fluxo actual (landing → relatório)

| # | Passo | Componente | Rota | Campos | Validações | Grava | Requisito p/ continuar |
|---|---|---|---|---|---|---|---|
| 1 | Introdução do handle | `HeroActionBar` | `/` | username/URL Instagram | `normalizeInstagramHandle` (não vazio, formato) | nada | handle válido |
| 2a | Autenticado | — | `/` | — | sessão Supabase | nada | salta direct o para o passo 7 |
| 2b | Anónimo → modal entry | `OnboardingModal` (view `entry`) | `/` (modal) | email | regex simples client-side; `POST /api/onboarding/check-email` decide novo vs. existente | nada | email preenchido |
| 3 | **Passo 2 — qualificação** | `QualificationStepBody` | modal | `profile_ownership`, `goal` | ambos obrigatórios (client) | nada ainda (só draft em localStorage via `use-onboarding-draft`) | uma opção em cada |
| 4 | Passo 3 — final | `FinalStepBody` | modal | nome completo, email, password, `qualification` (select), consentimento RGPD, marketing opcional, honeypot `website` + `_t` | `unlockFormSchema` (Zod) + Zod server-side estrito | `POST /api/onboarding/start`: cria auth user (`admin.createUser`), upsert `leads`, cookie `lead_session`, créditos iniciais, email de acesso, enqueue de `report_requests` | conta criada |
| 5 | Login (email existente) | view `login` | modal | email + password | `supabase.auth.signInWithPassword` → `POST /api/onboarding/claim-existing` | cookie `lead_session` | sessão válida |
| 6 | Navegação | `onSuccess` | `/analyze/$username` | — | — | — | — |
| 7 | Análise | `analyze.$username.tsx` | `POST /api/analyze-public-v1` | handle, window, competidores | gate de cookie de lead → `ONBOARDING_REQUIRED` (402); saldo de créditos; entitlement Pro para 30d/90d/concorrentes | `analysis_snapshots`, `analysis_events`, `provider_call_logs`, `credit_ledger`, `lead_reports` | 1 crédito |
| 8 | Relatório | `report-redesign/v2` | `/analyze/$username`, `/reports/$snapshotId` | — | ownership por `lead_reports` | `product_events` | — |
| 9 | Level 2 (comentários) | `POST /api/public/unlock-comments` | — | `cache_key` | cookie de lead + `leadOwnsReport` + índice único de job activo + rate limit IP/global + soft cap | `comment_enrichment_jobs` | lead dono do relatório |

Marcos pedidos:
- **Handle**: passo 1 (hero), antes de qualquer coisa.
- **Nome**: passo 4 (final).
- **Email**: passo 2b (entry) e reconfirmado no passo 4.
- **`lead_session`**: só em `/api/onboarding/start` (ou `/claim-existing`), depois da criação do utilizador auth.
- **Lead criado/associado**: `/start` (upsert por `email_normalized`); também há `handle_new_user()` no signup auth.
- **Passo 2 actual**: entre email e formulário final — antes de qualquer valor entregue.
- **Providers**: só no passo 7, depois do cookie e da reserva de crédito.
- **Snapshot**: passo 7, dentro de `analyze-public-v1`.
- **Relatório**: passo 8.

## 2. Passo 2 actual em detalhe

Componente: `QualificationStepBody` em `src/components/onboarding/onboarding-modal.tsx` (~linha 1400), com `GridSelectField`.

Copy actual (`src/i18n/locales/pt/gate.json → onboarding.qualification`):

```text
PASSO 2 DE 3
Ajuda-nos a personalizar
Duas perguntas rápidas. A leitura do relatório adapta-se ao que escolheres.

Este perfil é…
  É o meu perfil pessoal / É o perfil da minha marca / É o perfil de um cliente /
  Estou a observar concorrência / Estou só a explorar

O que queres tirar daqui?
  Melhorar o conteúdo / Comparar com concorrentes / Preparar uma análise para um cliente /
  Crescer a audiência / Validar a presença da marca / Outro

Voltar        Continuar  →
Escolhe uma opção em cada pergunta para continuar.
```

Passo 3 tem ainda um terceiro select, `qualification` ("O que melhor descreve o teu contexto?": marca/empresa, marketing, consultor/agência, criador, curiosidade, outro).

Persistência e uso:
- `leads.profile_ownership`, `leads.purpose`, `leads.qualification` (`build-start-payload.ts` deriva `qualification` de `profile_ownership` quando não é escolhida).
- Consumo: admin (`kanban-columns.ts`, `lead-context-labels.ts`, `lead-detail-sheet.tsx`, `leads-kanban.ts`), sync Brevo, e `editorial-patterns.ts` / `snapshot-to-report-data.ts` no tom do relatório.
- Analytics: `trackOnboardingEvent` → `POST /api/public/onboarding-event` → `product_events` (`onboarding_step_view` step 2, `onboarding_success`, `onboarding_abandon`, `onboarding_error`), lidos por `/api/admin/onboarding-funnel`.

Classificação:

| Pergunta | Classificação | Nota |
|---|---|---|
| "Este perfil é…" (`profile_ownership`) | **mover para depois** + simplificar | é exactamente a relação com o perfil; deve passar para o momento pós-valor e ficar por relatório, não por lead |
| "O que queres tirar daqui?" (`goal`/`purpose`) | **mover para depois** (opcional) ou eliminar do caminho crítico | não bloqueia nada técnico |
| `qualification` (select do passo 3) | **simplificar** | mantém-se para CRM, mas pode ser derivada da relação declarada, como já acontece hoje |
| Password | manter (obrigatória para área privada) | |
| Nome | simplificar (opcional; derivável do email) | |
| Telemóvel | eliminar (já não é recolhido) | |
| RGPD | manter | |

## 3. Relação entre utilizador e perfil analisado

Existe hoje `leads.profile_ownership` com valores `own_profile`, `brand_profile`, `client_profile`, `competitor_research`, `curiosity` — semanticamente equivalente ao pretendido, **mas guardado ao nível do lead**, não do relatório. Um lead que analise cinco perfis fica com uma única relação, a do primeiro registo.

Proposta conceptual (não implementada): `profile_relationship` ao nível do par lead↔relatório (`lead_reports` ou `report_requests`), com `owner | manages | client | competitor | research` e `relationship_source = 'user_declared'`.

Sobre `manages` vs `client`: para o modelo de leads actual a distinção não muda nenhuma regra (ambos caem em `consultant_agency`/`marketing_comms` no Kanban). Vale a pena mantê-los separados na UI porque diferenciam intenção comercial (gerir interno vs. serviço a terceiros), mas podem mapear para a mesma coluna de CRM.

## 4. Conta analisada vs. dados do lead

Risco confirmado, embora parcial:
- `lead_reports`/`report_requests` guardam correctamente o handle como objecto de análise;
- porém `leads.instagram_handle` guarda o handle analisado directamente na ficha do lead, e o admin apresenta-o como se fosse a conta da pessoa;
- métricas (followers, engagement, categoria, dimensão, score, problemas) vivem em `analysis_snapshots` e não são copiadas para `leads` — não há contaminação directa de métricas;
- a falsa qualificação vem da combinação `leads.instagram_handle` + `profile_ownership` derivado de um único momento: quem analisa um concorrente aparece como dono de uma conta grande.

Separação futura: **ANALYZED ACCOUNT DATA** fica só em `analysis_snapshots`/`lead_reports`; **DECLARED RELATIONSHIP** passa a ser um campo declarado por relatório. Sem alterações de schema nesta ronda.

## 5. Reutilização

| Área | Classificação |
|---|---|
| Introdução de username (`HeroActionBar`, `normalize-handle`) | REUTILIZAR SEM ALTERAÇÕES |
| Baseline anónimo (`PUBLIC_BASELINE_NO_EMAIL` em `analyze-public-v1`) | REUTILIZAR SEM ALTERAÇÕES (basta activar) |
| Passo 2 (qualificação) | REUTILIZAR COM ADAPTAÇÃO (mover para pós-valor, 1 pergunta) |
| `GridSelectField` | REUTILIZAR SEM ALTERAÇÕES |
| `OnboardingModal` (entry/final/login) | REUTILIZAR COM ADAPTAÇÃO (entrada passa a ser pós-relatório) |
| Consentimentos RGPD/marketing | REUTILIZAR SEM ALTERAÇÕES |
| `POST /api/onboarding/start` | REUTILIZAR COM ADAPTAÇÃO (aceitar `cache_key`/snapshot já existente e a relação declarada) |
| `lead_session` + `lead-cookie.server` | REUTILIZAR SEM ALTERAÇÕES |
| Ownership (`lead_reports`, `leadOwnsReport`) | REUTILIZAR COM ADAPTAÇÃO (associar snapshot anónimo ao lead no momento do registo) |
| `POST /api/public/unlock-comments` | REUTILIZAR COM ADAPTAÇÃO (depende de ownership pré-existente) |
| Área privada `/app/reports` | REUTILIZAR SEM ALTERAÇÕES |
| Autenticação password + `claim-existing` | REUTILIZAR SEM ALTERAÇÕES |
| Email do relatório | REUTILIZAR SEM ALTERAÇÕES |
| Campo de relação por relatório | AINDA NÃO EXISTE |
| Ponte "snapshot anónimo → lead" | AINDA NÃO EXISTE |
| Modal/drawer de desbloqueio pós-valor | AINDA NÃO EXISTE (mas `report-lock-gate` e `unlock-modal` servem de base) |

## 6. UX actual

- Passos antes do primeiro valor: **4** (handle → email → 2 perguntas → formulário completo) + espera do provider.
- Campos obrigatórios antes de qualquer valor: **6** (email, ownership, goal, nome, password, RGPD) + o select `qualification`.
- Cliques mínimos: ~10-12.
- Fricção máxima: pedir password antes de qualquer prova de valor; duas perguntas de qualificação sem contexto; email pedido duas vezes.
- Abandono provável: passo 2 (perguntas percebidas como questionário) e passo 3 (password).
- Reutilizável para o futuro desbloqueio: `Dialog` do `OnboardingModal`, `report-lock-gate.tsx`, `unlock-modal.tsx`, `pricing-feedback-sheet.tsx` (padrão de sheet contextual).

## 7. Compatibilidade com o novo modelo

Tecnicamente viável sem reescrever a arquitectura. Blocos reais identificados:

1. **Ownership do snapshot anónimo** — `unlock-comments` e `/app/reports` dependem de `lead_reports`, que só é escrito quando há lead na altura da análise. É preciso uma associação retroactiva por `cache_key` no momento do registo.
2. **Contabilidade de créditos** — hoje o crédito é reservado no gate de lead; no baseline anónimo não há lead nem reserva. É preciso decidir se o baseline anónimo é grátis (e como se protege por IP) ou se debita ao registar.
3. **Abuso do baseline anónimo** — sem email, o único travão são os caps Apify/ScrapeCreators e a cache de 24h; falta rate limiting por IP no baseline.
4. **Relação declarada por relatório** — campo inexistente (secção 3).
5. **Sequência de UI** — `analyze.$username.tsx` abre o modal em `ONBOARDING_REQUIRED`; com baseline anónimo esse ramo deixa de disparar e o convite passa a ser pós-relatório.

Nenhum destes é estrutural: são adaptações localizadas.

## Alterações mínimas para a Ronda 2

1. Activar `PUBLIC_BASELINE_NO_EMAIL=true` e adicionar rate limiting por IP ao baseline anónimo.
2. Criar a ponte de reclamação: no registo, associar o `cache_key`/snapshot visto anonimamente ao novo lead em `lead_reports`.
3. Mover a pergunta de relação para o momento pós-valor, com uma só pergunta contextual ("Qual é a tua relação com @handle?").
4. Adicionar `profile_relationship` + `relationship_source` ao nível do relatório e derivar a `qualification` do CRM a partir dela.
5. Deixar de escrever o handle analisado como se fosse a conta do lead no admin (apresentação, não schema).
6. Reduzir o registo pós-valor a email + password + RGPD + a pergunta de relação.

## Ficheiros/componentes afectados na Ronda 2

`src/components/landing/hero-action-bar.tsx`, `src/routes/analyze.$username.tsx`, `src/components/onboarding/onboarding-modal.tsx`, `src/lib/leads/build-start-payload.ts`, `src/lib/unlock-flow.ts`, `src/lib/leads/qualification.ts`, `src/routes/api/onboarding/start.ts`, `src/routes/api/onboarding/claim-existing.ts`, `src/routes/api/analyze-public-v1.ts`, `src/routes/api/public/unlock-comments.ts`, `src/lib/credits/lead-reports.server.ts`, `src/components/product/report-lock-gate.tsx`, `src/i18n/locales/{pt,en}/gate.json`, migração para `profile_relationship`, e superfícies admin (`kanban-columns.ts`, `lead-context-labels.ts`, `lead-detail-sheet.tsx`).

## Nota sobre a copy casual sugerida

A abordagem proposta encaixa: uma pergunta única, contextualizada com o handle já analisado, sem barra de progresso e sem linguagem de formulário. Mapeamento directo para os valores propostos:

```text
Só para personalizarmos melhor a análise:
Qual é a tua relação com @handle?

○ É a minha conta          → owner
○ Trabalho com esta conta  → manages
○ É de um cliente          → client
○ É um concorrente         → competitor
○ Estou apenas a explorar  → research
```

READY FOR ONBOARDING ROUND 2
