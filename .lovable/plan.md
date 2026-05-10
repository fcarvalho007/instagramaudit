## Refinar `/admin/email-lab` para alinhar com mockup

Alvo: `src/components/admin/v2/email-lab/email-lab-page.tsx` + `src/lib/admin/email-template-registry.ts`. Sem mudanças de schema, sem envio real, sem novos providers. Tokens admin existentes (`--admin-accent-*`, `--admin-success-*`, `--admin-warning-*`, `--admin-border-*`, `--admin-surface-*`).

---

### 1. Categorização (registry)

Adicionar `category: "operacional" | "conta" | "comercial"` a cada `EmailTemplateEntry`.

| Template | Categoria |
|---|---|
| request_received | operacional |
| report_ready | operacional |
| feedback_request | operacional |
| personal_area_saved | conta |
| welcome_beta | conta |
| report_summary | comercial |
| commercial_followup | comercial |

Labels pt-PT: "Operacionais" · "Conta e área pessoal" · "Comercial".

---

### 2. Header

Substituir `AdminPageHeader` simples por header com:
- Eyebrow "LABORATÓRIO · EMAIL" (`.text-eyebrow-sm`).
- H1 "Templates de email" + subtítulo actual.
- Acções alinhadas à direita:
  - `Recarregar wiring` (secundário) — invalida cache local + força re-render (sem fetch real).
  - `Enviar teste` (primário, escuro) — abre sheet/dialog que valida email do admin e mostra aviso "Modo visualização — envio real chega em sprint dedicado". Mantém banner de read-only intacto.

---

### 3. KPIs (4 cards)

Linha de cards entre header e banner, derivados do registry (sem nova query):

| KPI | Fonte |
|---|---|
| Total | `EMAIL_TEMPLATES.length` |
| Ligados | `filter(wired).length` com cor success |
| Sem trigger | `filter(!wired).length` com cor warning |
| Último teste | placeholder "—" + tooltip "Disponível quando o envio de teste for activado" (sem dados ainda) |

Componente novo local `EmailLabKpis` ou reutilizar `AdminStat` se já existe.

---

### 4. Banner

Manter `ReadOnlyBanner` mas ajustar copy a:
> "Modo visualização. Nenhum email é enviado a partir desta página. Os envios reais continuam a acontecer em Leads e nas automações operacionais."

---

### 5. Coluna esquerda (lista)

- Search input no topo: filtra por `title` ou `internalName` (estado local).
- Templates agrupados por categoria com cabeçalho `.text-eyebrow-sm` + contagem (`OPERACIONAIS · 3`).
- Card por template com:
  - Ícone por categoria (ex. lucide `CheckCircle2`, `MessageCircle`, `Send`, `User`, `Sparkles`, `FileText`, `DollarSign`).
  - Título.
  - Linha 2: `internalName` em mono `text-[11px]`.
  - Linha 3 (preview do subject): `rendered.subject` em texto secundário, line-clamp-1.
  - Badge canto superior direito: `LIGADO` (success) ou `SEM TRIGGER` (warning).
  - Footer micro: "último envio há —" (placeholder por enquanto).
- Estado seleccionado: borda 1.5px `--admin-accent-500`, fundo `accent/06`, ponto pulsante (animate-pulse) à esquerda do título.
- Estado "sem trigger": borda dashed `--admin-warning-500/60`.

---

### 6. Painel direito

- Header: título + badge `LIGADO/SEM TRIGGER` + sub-linha `internalName · categoria` + acções inline:
  - `Ver HTML` → abre iframe-rendered HTML em nova janela (`window.open` com Blob URL).
  - `Copiar` → `navigator.clipboard.writeText(rendered.html)` + feedback "Copiado".
  - `Enviar teste` → mesmo dialog do header.
- Tabs: `Pré-visualização` · `Variáveis` · `Wiring` (substituem o toggle HTML/Texto). Tab `Pré-visualização` mantém escolha html/text como sub-toggle interno.
- Pré-visualização: meta-rows `SUBJECT`, `PREHEADER`, `PARA` (placeholder `{{email}} → admin@…`) + frame com chrome macOS (3 dots + barra "Inbox · Mira") em torno do iframe HTML.
- Variáveis: tabela actual (mantida).
- Wiring: meta-row `wiredAt` + nota explicativa do trigger.

---

### 7. Linguagem

- `Wired` → `Ligado`.
- `Orphan` → `Sem trigger`.
- Subjects/preheaders já em pt-PT, sem mudanças.

---

### 8. Out of scope (desta task)

- Envio real de teste (precisa endpoint dedicado + auth + provider).
- Histórico de envios "último teste" (precisa tabela ou query a `email_send_log` se existir; não há agora).
- Persistência de filtros/ordem.
- Edição inline de templates.

Estes ficam documentados no painel "Enviar teste" como nota e no KPI "Último teste" como placeholder com tooltip.

---

### Checklist
☐ Adicionar `category` ao registry  
☐ Refactor `email-lab-page.tsx` em sub-componentes (`EmailLabHeader`, `EmailLabKpis`, `TemplateList`, `TemplateDetail`)  
☐ Search local + agrupamento + ícones por categoria  
☐ Card states: seleccionado (azul + pulse) / sem trigger (dashed amber)  
☐ Tabs Pré-visualização / Variáveis / Wiring  
☐ Frame macOS com chrome para preview HTML  
☐ Acções `Ver HTML` / `Copiar` / `Enviar teste` (dialog placeholder)  
☐ Labels pt-PT: LIGADO / SEM TRIGGER  
☐ Mobile: lista colapsa para topo, detalhe abaixo (`grid-cols-1 lg:grid-cols-[320px_1fr]`)  
☐ Sem alterar tokens, sem hardcode de cores, sem mexer nos renderers
