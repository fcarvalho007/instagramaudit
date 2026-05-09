## Email Template Lab — pré-visualização read-only de 4 templates

### Descoberta

Templates já existem em `src/lib/email/templates/` como renderers puros que devolvem `{ subject, text, html }`:

| Template | Renderer | Endpoint que usa | Estado |
|---|---|---|---|
| Pedido recebido | `renderRequestReceived` | `src/lib/beta.functions.ts` (submissão de pedido beta) | **Wired** |
| Relatório pronto | `renderReportReady` | `src/routes/api/admin/send-report-link.ts` | **Wired** |
| Pedido de feedback | `renderFeedbackRequest` | `src/routes/api/admin/send-feedback-request.ts` | **Wired** |
| Follow-up comercial | `renderCommercialFollowup` | nenhum endpoint (apenas testes) | **Orphan** |

Cada renderer tem `SUBJECT`, `PREHEADER` e `HEADLINE` declarados. Alguns expõem `.subject` como propriedade da função. Inputs estão tipados (`RequestReceivedInput`, `ReportReadyInput`, `FeedbackRequestInput`, `CommercialFollowupInput`).

A área `/admin/*` segue o padrão `src/routes/admin.<slug>.tsx` com componentes em `src/components/admin/v2/<slug>/`. `AdminPageHeader`, `AdminCard`, `AdminSectionHeader` e tokens `--admin-*` já existem. CRM Webinar não é importado — apenas o padrão UX (lista + preview + meta).

### Mudança proposta

**Ficheiros novos:** 2 · **alterados:** 0 (nada locked).

#### `src/components/admin/v2/email-lab/email-lab-page.tsx` (novo)
Página cliente-side, sem `useQuery`, sem fetch — chama os 4 renderers diretamente com sample data fixa:

```ts
const SAMPLE = {
  firstName: "Frederico",
  instagramHandle: "frederico.m.carvalho",
  reportUrl: "https://example.com/analyze/frederico.m.carvalho",
  feedbackUrl: "https://example.com/feedback/example",
  pricingOption: "monthly",
};
```

Catálogo declarativo de 4 entradas (`key`, `title` pt-PT, `wired: boolean`, `wiredAt: string | null` descrevendo o ficheiro do endpoint, `render()`). Layout em duas colunas (≥lg) ou stack (mobile-first):

- **Coluna esquerda — lista de templates** (cards verticais clicáveis): título, badge `Wired` (verde) ou `Orphan` (cinza/âmbar), subject truncado.
- **Coluna direita — detalhe do template selecionado**:
  - Bloco "Meta": nome interno (`request_received`, `report_ready`, `feedback_request`, `commercial_followup`), subject, preheader (se existir), wiring (caminho do endpoint ou "Não está ligado a nenhum endpoint").
  - Bloco "Variáveis de exemplo": tabela `chave → valor` apenas com as variáveis usadas por aquele template.
  - Tabs `Texto` / `HTML`:
    - **Texto**: `<pre>` com `text`, `whitespace-pre-wrap`, `font-mono` (admin permite mono), `max-h-[480px] overflow-auto`.
    - **HTML**: `<iframe srcDoc={html} sandbox="" className="w-full h-[640px] rounded border" title="..." />` para conter estilos do email e evitar quebrar o layout admin. `sandbox=""` bloqueia scripts e navegação.
- Banner topo "Modo visualização — nenhum email é enviado a partir desta página." (mesmo padrão do `/admin/automacoes`).

Estado local: `useState` com a key selecionada (default: `request_received`).

Sem chamadas Resend, sem mutações, sem fetch.

#### `src/routes/admin.email-lab.tsx` (novo)
Rota fina:
```tsx
import { createFileRoute } from "@tanstack/react-router";
import { EmailLabPage } from "@/components/admin/v2/email-lab/email-lab-page";

export const Route = createFileRoute("/admin/email-lab")({
  component: EmailLabPage,
});
```

### Sample data por template (tabela mostrada na UI)

- `request_received` → `firstName`, `instagramHandle`
- `report_ready` → `firstName`, `instagramHandle`, `reportUrl`
- `feedback_request` → `firstName`, `instagramHandle`, `reportUrl`, `feedbackUrl`, `reportViewed: true`
- `commercial_followup` → `firstName`, `instagramHandle`, `pricingOption: "monthly"`, `reportUrl`

### Restrições respeitadas

- Sem schema, sem tabela `email_templates`, sem mutações, sem chamadas a Resend.
- Sem alterações aos templates ou a rotas públicas.
- Sem importar nada do CRM Webinar; apenas o padrão UX foi reaproveitado.
- Tokens `--admin-*` exclusivamente; pt-PT/AO90.
- Mobile-first (stack a 411px; lado-a-lado a partir de `lg`).
- `iframe sandbox=""` isola o HTML do template.

### Validação

1. `bunx tsc --noEmit` → 0 erros.
2. `bunx vitest run` → 163/163.
3. Manual em `/admin/email-lab`:
   - Página carrega; banner read-only visível.
   - 4 templates listados na ordem pedida.
   - Cada um tem badge Wired/Orphan correto (Pedido recebido, Relatório pronto, Pedido de feedback = Wired; Follow-up comercial = Orphan).
   - Tabs Texto/HTML alternam preview.
   - HTML preview contido no `iframe`, sem quebrar layout, sem horizontal scroll a 411px.
   - Variáveis de exemplo refletem o `SAMPLE` acima.

### Fora de âmbito (próxima fase)

- Editar `subject` / corpo a partir do admin (requer tabela `email_templates`).
- Enviar email de teste para si próprio (precisa endpoint + Resend).
- Last-known event por template (precisa query a `product_events` ou `email_send_log`).
- Suporte a múltiplos sample profiles e A/B variants.