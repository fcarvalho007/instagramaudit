
Dois pedidos relacionados (cleanup da CRM). Faço-os no mesmo plano porque tocam nos mesmos ficheiros (sidebar, topbar, sheet do contacto, rota beta-requests). Se preferires separar, basta dizer.

## Fase 1 — Pedidos dentro da ficha do contacto

Hoje a tab "Relatório" do `LeadDetailSheet` mostra apenas o último relatório (campos vindos do `EnrichedLead`). O utilizador quer ver **todos** os `report_requests` do contacto com handle, data, estado, snapshot, email, PDF e ação de abrir.

### Backend
- `src/routes/api/admin/report-requests.ts`
  - Adicionar suporte a `?lead_id=<uuid>` (filtro `.eq("lead_id", id)`).
  - Sem alterações de schema, RLS ou auth — continua a usar `requireAdminSession()`.

### UI
- `src/components/admin/v2/beta-leads/lead-detail-sheet.tsx`
  - Renomear a tab `"Relatório"` para `"Relatórios"`.
  - Acima do bloco atual (que continua a mostrar o estado do último), adicionar uma lista de todos os pedidos:
    - `useQuery` com chave `["admin","lead-reports", lead.id]`, chama `adminFetch("/api/admin/report-requests?lead_id=...&pageSize=100")`.
    - Linhas com: handle (`@username`), data (`formatDate(created_at)`), badge de `request_status`, badge de `pdf_status`, badge de `delivery_status`, e botões:
      - **Abrir relatório** → `/analyze/$username` (novo separador) quando `instagram_username` existir.
      - **Abrir snapshot** → `/admin/report-preview/snapshot/$snapshotId` quando `analysis_snapshot_id` existir.
    - Estado vazio: `"Ainda não existem relatórios associados a este contacto."`
    - Estado loading: skeleton curto. Estado erro: `AdminCallout` com retry.
  - Manter ações actuais (Copiar link, Enviar link, Pedir feedback, Gerar relatório) — continuam relevantes para o último relatório.

### Navegação
- `src/components/admin/v2/admin-sidebar.tsx`: a rota `/admin/beta-requests` já não está no sidebar — manter assim. Adicionar apenas um link discreto a partir do sheet ("Ver na fila completa →") opcional.
- A rota `/admin/beta-requests` mantém-se acessível por URL directo (utilitário).

## Fase 2 — Remover "Beta" da CRM principal

Substituições puramente de copy (sem mexer em rotas, tabelas, eventos ou colunas).

### Topbar
- `src/components/admin/v2/admin-topbar.tsx`
  - `"/admin/beta-requests": "Pedidos (utilitário)"` → `"Pedidos de relatório"`.
  - Confirmar `"/admin/beta-leads"` continua como `"Contactos"` (já corrigido).

### Sheet do contacto
- `src/components/admin/v2/beta-leads/lead-detail-sheet.tsx`
  - Linha `"Consentimento beta"` → manter o label mas mostrar como pequeno badge `"Origem: Beta"` apenas quando `lead.beta_consent === true` (passa a sinalização secundária, não secção principal).

### Página de pedidos
- `src/routes/admin.beta-requests.tsx`
  - `<AdminPageHeader title="Beta Requests" …>` → `title="Pedidos de relatório"`, subtítulo: `"Fila utilitária — para gestão diária usa a ficha do contacto."`

### O que NÃO muda
- Nomes de ficheiros, rotas (`/admin/beta-leads`, `/admin/beta-requests`), tabelas (`beta_feedback`), eventos, colunas (`beta_consent`, `beta_consent_at`), `request_source = "beta_form"`.
- `PeopleTab` e a Visão Geral mantêm a lógica actual.

## Validação

- `bunx tsc --noEmit`
- `bunx vitest run`
- Manual:
  - abrir contacto com >=1 relatório → tab "Relatórios" lista todos com badges e botões funcionais;
  - abrir contacto sem relatórios → mensagem de estado vazio;
  - sidebar não tem "Beta" como conceito primário;
  - topbar e header da página `/admin/beta-requests` mostram "Pedidos de relatório";
  - `/admin/beta-leads` continua a chamar-se "Contactos".

## Ficheiros previstos

- `src/routes/api/admin/report-requests.ts` (filtro `lead_id`)
- `src/components/admin/v2/beta-leads/lead-detail-sheet.tsx` (lista de relatórios + copy)
- `src/components/admin/v2/admin-topbar.tsx` (label)
- `src/routes/admin.beta-requests.tsx` (header)
