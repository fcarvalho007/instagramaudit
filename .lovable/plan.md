

## Entendimento

**1. Landing → analyze → gate**: hero (`/`) → `/analyze/$username` → `<PublicAnalysisDashboard>` → `<ReportGateModal>` → `POST /api/request-full-report`.

**2. Análise pública**: `/api/analyze-public-v1` cacheia 24h em `analysis_snapshots`. Cada análise tem `id` reutilizável.

**3. Lifecycle do pedido**: `/api/request-full-report` valida payload + snapshot, faz upsert do `lead`, conta quota mensal, insere `report_requests` com `request_status='pending'`, dispara `runReportPipeline` em background, responde imediatamente ao cliente.

**4. PDF + Email**: orchestrator transita `pending → processing → completed | failed_pdf | failed_email`. Reutiliza `/api/generate-report-pdf` (idempotente) e `/api/send-report-email` (auth via `INTERNAL_API_TOKEN`, lock optimista em `delivery_status`).

**5. Porquê admin agora**: hoje **não há forma de ver** se um pedido falhou, em que passo, ou recuperá-lo. Sem isto, falhas (especialmente sandbox Resend) ficam invisíveis. Antes de monetização ou auth completa, é preciso uma camada operacional mínima para inspecionar e re-executar pedidos manualmente.

---

## Decisões-chave

**A. Acesso temporário — gate por token server-side**
Sem auth completa, a opção mais segura é reutilizar o `INTERNAL_API_TOKEN` que já existe nos secrets (foi adicionado para o pipeline). O fluxo:
- `/admin` carrega um ecrã de gate (input do token) se não houver cookie de sessão admin.
- Submit envia o token a `POST /api/admin/auth` (server route); se válido (compara com `process.env.INTERNAL_API_TOKEN`), seta cookie `admin_session` httpOnly, secure, signed via `useSession` do TanStack Start (com `password` derivado do mesmo token + sufixo).
- Todas as routes `/api/admin/*` validam essa session cookie server-side antes de devolver dados ou executar ações.
- **Sem credenciais hardcoded.** Sem nova lib.

**B. Routes**: `/admin` (lista + detail panel inline). Um único route file. Detail abre como Sheet/Drawer lateral (já existe componente shadcn).

**C. Server routes para dados e ações** (sem expor `supabaseAdmin` ao cliente):
- `POST /api/admin/auth` — valida token, seta session.
- `POST /api/admin/logout` — limpa session.
- `GET /api/admin/report-requests` — lista paginada com filtros (status, pdf_status, delivery_status, search).
- `GET /api/admin/report-requests/$id` — detalhe (join lead + snapshot reference).
- `POST /api/admin/regenerate-pdf` — chama `/api/generate-report-pdf` com `force=true`.
- `POST /api/admin/resend-email` — chama `/api/send-report-email` com `X-Internal-Token`.

Todas verificam session cookie. Reutilizam routes existentes — zero duplicação.

**D. Status model — apresentação calma**
Mapping pt-PT no client (sem alterar DB):
- `request_status`: pending → "Pendente", processing → "Em processamento", completed → "Concluído", failed_pdf → "Falhou (PDF)", failed_email → "Falhou (email)".
- `pdf_status`: not_generated/generating/ready/failed → "Por gerar"/"A gerar"/"Pronto"/"Falhou".
- `delivery_status`: not_sent/sending/sent/failed → "Por enviar"/"A enviar"/"Enviado"/"Falhou".
- Badges com variants: muted (pending), accent (processing), success (ready/sent/completed), danger (failed).

**E. UX**
- **Lista**: tabela `<Table>` com colunas: Data, Username, Lead (nome + email), Estado pedido, PDF, Email, Ações rápidas (botão "Detalhes"). Sort por created_at desc default. Filtros via search params (`status`, `pdf`, `email`, `q`).
- **Detail Sheet**: abre da direita. Mostra metadata, lead completo, snapshot id (link copy), timestamps, mensagens de erro (se houver), CTAs "Regenerar PDF" e "Reenviar email".
- **Feedback**: `useToast` (sonner já existe) para success/failure das ações. Sem `alert()`.

**F. Sem novas dependências.** Reutiliza shadcn Table, Sheet, Badge, Button, Input, Select, Toast.

---

## Ficheiros tocados

| Ficheiro | Acção | Locked? |
|---|---|---|
| `src/routes/admin.tsx` | Criar — route principal com gate + lista + detail sheet | Não |
| `src/routes/api/admin/auth.ts` | Criar — POST valida token, seta session | Não |
| `src/routes/api/admin/logout.ts` | Criar — POST limpa session | Não |
| `src/routes/api/admin/report-requests.ts` | Criar — GET lista paginada com filtros | Não |
| `src/routes/api/admin/report-requests.$id.ts` | Criar — GET detalhe | Não |
| `src/routes/api/admin/regenerate-pdf.ts` | Criar — POST chama PDF route | Não |
| `src/routes/api/admin/resend-email.ts` | Criar — POST chama email route | Não |
| `src/lib/admin/session.ts` | Criar — helpers `requireAdminSession`, `setAdminSession`, `clearAdminSession` (usa `useSession` do TanStack runtime) | Não |
| `src/lib/admin/labels.ts` | Criar — mappings pt-PT para os 3 status fields + variant resolver | Não |
| `src/components/admin/admin-gate.tsx` | Criar — formulário de entrada do token | Não |
| `src/components/admin/request-list.tsx` | Criar — tabela + filtros | Não |
| `src/components/admin/request-detail-sheet.tsx` | Criar — Sheet com detalhes + actions | Não |
| `src/components/admin/status-badge.tsx` | Criar — badge tipado para os 3 statuses | Não |

**Locked files**: nenhum. `app-shell.tsx` está locked mas o admin **não** vai usar Header/Footer públicos — terá layout próprio dentro do route (mais clean para uso operacional).

---

## Schema

**Zero alterações ao DB.** Tudo cabe nas tabelas existentes (`report_requests`, `leads`, `analysis_snapshots`).

---

## Fluxo de acesso

```
GET /admin
  ├─ se cookie admin_session válido → mostra lista
  └─ senão → mostra <AdminGate />
        └─ submit token → POST /api/admin/auth
              ├─ token === process.env.INTERNAL_API_TOKEN → seta session, redirect /admin
              └─ inválido → erro inline pt-PT
```

```
Acção "Regenerar PDF" no detail sheet
  └─ POST /api/admin/regenerate-pdf { report_request_id }
        ├─ valida session cookie
        ├─ POST /api/generate-report-pdf { report_request_id, force: true }
        ├─ devolve novo pdf_status
        └─ client mostra toast + invalida query
```

```
Acção "Reenviar email"
  └─ POST /api/admin/resend-email { report_request_id }
        ├─ valida session cookie
        ├─ POST /api/send-report-email com X-Internal-Token
        ├─ devolve novo delivery_status
        └─ client mostra toast + invalida query
```

**"Reprocessar pedido"** fica **fora de v1** — risco de ambiguidade (reset de `request_status` + chamada ao orchestrator) preferível avaliar quando houver mais sinal.

---

## Copy pt-PT (impessoal)

- Gate: "Acesso restrito" / "Token de acesso" / "Entrar"
- Lista vazia: "Sem pedidos registados."
- Filtros: "Estado do pedido" / "Estado do PDF" / "Estado do email" / "Procurar por username ou email"
- Acções: "Regenerar PDF" / "Reenviar email" / "Copiar ID do snapshot"
- Toasts: "PDF regenerado com sucesso." / "Não foi possível regenerar o PDF." / "Email reenviado com sucesso." / "O envio do email falhou."

---

## Validação dos guardrails

| Guardrail | Estado |
|---|---|
| Sem alterações ao landing/dashboard público | ✅ |
| Sem auth completa (apenas gate por token) | ✅ |
| Sem roles/permissions | ✅ |
| Sem pagamentos / settings / analytics | ✅ |
| Sem novas libs | ✅ |
| Sem credenciais hardcoded (usa env secret) | ✅ |
| Locked files intactos | ✅ |
| Copy pt-PT impessoal | ✅ |
| Reutiliza routes PDF/email existentes | ✅ |
| Future-ready (auth real, mais filtros, audit log) | ✅ |

---

## Checkpoints

- ☐ `/admin` route criada com gate + lista + detail sheet
- ☐ Acesso temporário via `INTERNAL_API_TOKEN` server-side, sem hardcode
- ☐ Session cookie httpOnly + signed (TanStack `useSession`)
- ☐ Lista com colunas: data, username, lead, request_status, pdf_status, delivery_status
- ☐ Filtros: status pedido, status PDF, status email, search username/email
- ☐ Detail sheet: metadata + lead + snapshot ref + timestamps + mensagens de erro
- ☐ Acção "Regenerar PDF" reutiliza `/api/generate-report-pdf` (force=true)
- ☐ Acção "Reenviar email" reutiliza `/api/send-report-email` (com token)
- ☐ Status badges com mapping pt-PT calmo
- ☐ Feedback via toasts (sonner) — sem `alert()`
- ☐ Sem auth completa, payments, analytics, settings, roles
- ☐ Locked files intactos

