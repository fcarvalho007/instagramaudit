## Refactor LeadDetailSheet → estrutura tabbed (UI only)

Inspirado no `InscritoModal` do CRM Webinar (UX), sem importar tipos/lógica desse projeto. Nenhuma alteração de schema, providers, endpoints ou comportamento das ações.

### Estado actual

`src/components/admin/v2/beta-leads/lead-detail-sheet.tsx` (1369 linhas) é um drawer single-scroll com 7 secções verticais:
1. Header (avatar, nome, email, handle, badge de status)
2. KPI strip (views, custo, idade)
3. Perfil (propriedade, objetivo, origem, consentimento)
4. Relatório (tracker + estado + 5 botões: Abrir, Copiar link, Enviar link, Pedir feedback, Gerar)
5. Inteligência comercial (intent, próximo passo, selector de status)
6. Feedback beta (`FeedbackBetaSection`)
7. Timeline (`TimelineSection`)
8. Notas + grid de ações (Instagram, Copiar email, WhatsApp, Contactado, Arquivar)

Sub-componentes já isolados: `ProgressTracker`, `TimelineSection`, `SendLinkButton`/`Dialog`, `FeedbackRequestButton`/`Dialog`, `GenerateReportDialog`, `FeedbackBetaSection`. Estado e handlers vivem no componente raiz.

### Mudanças

**Apenas em `lead-detail-sheet.tsx`** — todos os sub-componentes, dialogs, fetches, handlers e props (`open`, `onOpenChange`, `lead`, `onUpdate`, `onRefresh`) ficam intactos.

**1. Header sticky (sempre visível, fora dos tabs)**
- Avatar + nome + email + `@handle` + badge de coluna + linha "Criado · Contactado".
- KPI strip (Views/Custo/Idade) abaixo do header — referência permanente.
- `position: sticky; top: 0` com fundo branco e divisor inferior.

**2. Barra de tabs**
- Usar `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent` de `@/components/ui/tabs` (shadcn já presente).
- 5 abas pt-PT: **Resumo · Relatório · Feedback · Comunicação · Histórico**.
- `TabsList` com `overflow-x-auto`, `scrollbar-thin`, `whitespace-nowrap`, `gap-1`. A 411px (viewport actual do utilizador) cabem 5 chips compactos sem partir o layout do drawer.
- Tokens `--admin-*` apenas; sem cores hardcoded.

**3. Conteúdo por tab** (apenas reorganização, sem nova lógica)

| Tab | Conteúdo |
|---|---|
| **Resumo** | Secção Perfil (propriedade/objetivo/origem/consentimento) + bloco Inteligência comercial (sinal de intenção + "próximo passo sugerido" + selector de status) + Notas internas (Textarea + contador + Guardar) + grid de ações secundárias (Instagram, Copiar email, WhatsApp, Contactado, Arquivar). |
| **Relatório** | `ProgressTracker` + DetailRows (Estado, PDF, Última interação) + 5 botões existentes (Abrir, Copiar link, `SendLinkButton`, `FeedbackRequestButton`, Gerar). Empty state se `!lead.handle`. |
| **Feedback** | `FeedbackBetaSection` tal como está. |
| **Comunicação** | Vista filtrada do `timeline` apenas com eventos de comunicação: `report_link_sent`, `feedback_requested`, `feedback_started`, `email_failed`, `email_bounced`. Reutiliza o item visual de `TimelineSection` (extrair pequeno `TimelineItem` interno se necessário, sem mudar o componente exportado). Empty state pt-PT: "Sem comunicações registadas." Sem novos botões de envio. |
| **Histórico** | `TimelineSection` completo, com agrupamento de eventos `report_viewed` consecutivos do mesmo handle (agregar em "X visualizações" com timestamp do mais recente, expansível inline). Lógica de agrupamento puramente visual, dentro do componente. |

**4. Tab inicial inteligente**
- `useState<TabKey>('resumo')` resetada quando `lead.id` muda.
- Default: `resumo`. Se a lead chegou via deep-link com hint (não existe ainda) ficaria fácil aplicar — não implementar.

**5. Dialogs (`GenerateReportDialog`, `SendLinkDialog`, `FeedbackRequestDialog`)**
- Continuam ao nível do `Sheet` (fora dos `TabsContent`) para sobreviverem a mudanças de tab. Já é o padrão actual.

**6. `SheetContent`**
- Manter `w-full sm:max-w-[520px]`. Mudar `overflow-y-auto` → `flex flex-col` no root; header sticky no topo, `Tabs` ocupa o resto com `flex-1 min-h-0` e cada `TabsContent` faz o próprio scroll (`overflow-y-auto`). Garante que tabs ficam sempre visíveis.

### Restrições respeitadas

- Sem alterações em endpoints (`/api/admin/lead-timeline`, `generate-beta-report`, `send-report-link`, `send-feedback-request`).
- Sem novos providers, sem schema changes, sem novas ações.
- Todas as ações actuais preservadas e acessíveis nos novos sítios.
- pt-PT, AO90. Tokens `--admin-*` apenas. Sem `slate-*`. Sem cores hardcoded novas (mantém os inline styles já existentes para a cor da coluna Kanban, que vem de `KANBAN_COLUMNS`).
- Mobile-first: tabs com scroll horizontal a 411px sem cortar o drawer.

### Ficheiros tocados

- `src/components/admin/v2/beta-leads/lead-detail-sheet.tsx` — único.

### Validação

1. `bunx tsc --noEmit` → 0 erros.
2. `bunx vitest run` → manter 163/163 (não há testes deste componente).
3. Manual em `/admin/beta-leads`:
   - Abrir lead → header + KPIs visíveis, 5 tabs presentes.
   - **Resumo**: estado comercial editável, notas guardam.
   - **Relatório**: 5 botões aparecem nas mesmas condições; Send link / Pedir feedback / Gerar abrem dialogs e completam o fluxo igual ao actual.
   - **Feedback**: secção renderiza com/sem feedback.
   - **Comunicação**: lista filtrada renderiza; empty state quando vazio.
   - **Histórico**: timeline completa com `report_viewed` agrupados.
   - 411px: tabs scrollam horizontalmente, sem overflow do drawer.
   - Network: nenhum POST extra além dos já existentes.

### Assunções

- Eventos considerados "comunicação": `report_link_sent`, `feedback_requested`, `feedback_started`, `email_failed`, `email_bounced` (os dois últimos só aparecem se existirem; sem inventar tipos novos).
- Agrupamento de `report_viewed` é puramente visual, mantém a contagem real de eventos.
- A 411px o drawer é full-width (`w-full`); 5 tabs cabem com chips compactos + scroll horizontal de fallback.
- Não criar novos sub-ficheiros — refactor cabe num único ficheiro mantendo organização interna.