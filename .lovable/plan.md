
Auditoria do Pipeline (`/admin/beta-leads`) e da página de Automações (`/admin/automacoes`). Foco em **bugs reais** + **refinamento de filtros e organização do kanban** + **exposição correta de informação de lead-magnet**. Sem schema novo. Sem mexer em backend de envio de emails.

## Bugs encontrados

### Pipeline / Kanban / Tabela

1. **Custo em moeda errada (`LeadCard`).** O backend devolve `report_cost_usd` (USD) mas o card mostra `€{lead.report_cost_usd.toFixed(2)}`. Trocar prefixo para `$` e adicionar tooltip "custo provider" — ou converter na origem usando uma constante. Decisão: manter raw USD e mostrar `$X.XX` com tooltip "custo provider (USD)".

2. **`USER_TYPE_ACCENT` desalinhado dos enums.** O mapa usa chaves PT (`marca/agencia/freelancer/criador/estudante`) mas os valores vindos do unlock são `creator/brand/agency/consultant/ecommerce/student`. Resultado: badge sempre cai em `neutral` e mostra a string crua em inglês. Substituir pelas chaves reais e usar `USER_TYPE_LABELS` de `@/lib/unlock-flow` para o texto visível.

3. **`reportStatusAccent` mostra status técnico cru.** `lead.report_status` aparece como `pending` / `ready` / `completed`. Mapear para labels pt-PT (`Em curso`, `Pronto`, `Falhou`, etc.) e remover ramo morto `pending_review`.

4. **`confirm()` nativo no drag-and-drop do Kanban.** Quebra estilo e bloqueia em mobile. Substituir por `ConfirmDialog` (já existe em `confirm-dialog.tsx`) ou por toast com `Acção: Desfazer` (preferido — menos fricção).

5. **Optimistic update incompleto em `beta-leads.tsx > handleUpdate`.** Quando o estado vai para `arquivado`, `archived_at` não é refletido localmente. Quando se altera `commercial_status`, `last_interaction` também devia mexer para o card subir nas listas ordenadas. Adicionar esses campos ao `setQueryData`.

6. **Mobile accordion fica vazio se o chip esconder a primeira coluna.** `openMobileSection` é fixado em `KANBAN_COLUMNS[0]?.key` e nunca se ajusta a `visibleColumns`. Se o utilizador filtrar por "Com feedback", o accordion abre uma secção que já não existe na lista. Fix: re-sincronizar com `visibleColumns[0]?.key` quando o chip muda.

7. **Filtros divergentes Pipeline ↔ Tabela.** A `LeadsTable` usa `matchesChip` + `matchesQuery` de `lead-filter-chips.ts`; o `KanbanBoard` reimplementa busca à mão e ignora os helpers. Resultado: comportamento sutilmente diferente (ex.: tabela inclui `name` mesmo se vazio com OR, kanban também — mas amanhã divergem). Fix: consolidar tudo via `matchesChip`/`matchesQuery`.

8. **Estado vazio com filtros activos não tem CTA "Limpar filtros" no Kanban.** A tabela tem-no; o kanban deixa colunas com "Sem leads" sem indicar que existe um filtro a esconder dados. Fix: faixa fina por cima do board "X de Y contactos · Limpar filtros" (mesma copy que a tabela).

9. **Cards não ordenados por interação dentro da coluna.** O backend devolve `leads` ordenado por `created_at desc`, mas dentro de cada coluna do Kanban os cards aparecem por essa mesma ordem em vez de `last_interaction desc`. Fix: ordenar `colLeads` por `last_interaction desc`.

10. **Emoji 📞 no `LeadCard`** quebra a regra de design (sem emoji decorativo). Substituir por `Phone` (lucide) com `text-admin-text-tertiary` + tooltip "Contactado em <data>".

11. **Tipo "sem nome" inconsistente.** `LeadCard` mostra `lead.name || lead.email`; `LeadsTable` mostra `lead.name || "—"`; `PeopleTab` mostra `l.name || "(sem nome)"`. Unificar para `lead.name?.trim() || "Sem nome"` em todo o lado, com fallback para email só quando email é a única identidade visível.

12. **Notes sheet** abre em qualquer lead sem nome com header "Notas — {email}" — ok, mas perde-se o contexto do estado. Mostrar também nome + estado actual no header.

### Automações

13. **Eyebrow "Pipeline · Automações"** em `automation-flow-page.tsx` confunde porque "Pipeline" é o nome do CRM noutra página. Trocar para `Ciclo de vida · Automações`.

14. **`PeopleTab` link "Beta Leads"** (resíduo). Trocar para `Pipeline`.

15. **`PeopleTab` mensagem de erro** ainda diz "Verifica a sessão de admin" (mesmo padrão que já corrigimos noutros sítios). Aplicar o mesmo bloco de erro tipado (HTTP/code + botão Tentar de novo / Iniciar sessão).

16. **`PeopleTab` query staleTime + Pipeline refetchInterval** divergem (30s vs 30s mas com semânticas diferentes). Alinhar: ambos `staleTime: 15_000` + `refetchInterval: 30_000`. Ajuda a manter contagens em sintonia entre tabs.

17. **Templates "Editar (em breve)"** devia ter `aria-disabled` + tooltip explícita; funcional, mas hoje só usa `disabled` sem texto acessível claro.

## Refinamento de filtros e organização Kanban

18. **Conjunto de chips actual** (`Todos / Em análise / Com relatório / Com feedback / Potencial / Arquivados`) está magro. Adicionar:
    - **Novos hoje** — `created_at >= hoje 00:00`
    - **Sem mexer há 7 dias** — `last_interaction < hoje-7d` e `commercial_status != arquivado`
    - **Lead-magnet activo** — leads com sequência lead-magnet em curso (ver §22)
    - **Aceitou marketing** — `marketing_consent = true`

    Reagrupar visualmente em 2 famílias com separador vertical: `Estado` (chips originais) · `Atenção` (novos chips temporais/operacionais).

19. **Toolbar do Kanban** ganha:
    - Contador `X de Y contactos` (igual à tabela)
    - Botão `Limpar filtros` quando há filtro/pesquisa activos
    - Persistência de chip+query em `?chip=...&q=...` (querystring) — iguala Pipeline e Tabela e permite partilha de URL.

20. **Ordenação dentro da coluna** controlada por dropdown "Ordenar por": `Última interação ↓` (default), `Criado ↓`, `Nome A-Z`. Um único valor partilhado entre Kanban e Tabela.

21. **Atalho de archive seguro.** Botão "Arquivar" no menu do card mostra toast com "Arquivado · Anular" (5s) em vez de mover silenciosamente. Reduz medo de arrastar.

## Lead-magnet — informação visível e organizada

22. **Estado do lead-magnet exposto na ficha do lead.**
    - Backend: estender `/api/admin/leads-kanban` (sem schema novo) para devolver, por lead, contagem e último timestamp de eventos `welcome_beta_sent`, `report_summary_sent`, `lead_magnet_sequence_skipped` (já gravados em `product_events`). Devolver:
      ```
      lead_magnet: {
        status: "active" | "completed" | "skipped" | "none",
        last_event_at: string | null,
        last_event_type: string | null,
        sent_count: number
      }
      ```
    - `EnrichedLead` ganha `lead_magnet`.
    - `LeadCard`: badge pequeno `Lead-magnet · activo/completo/saltado` (cor info/success/neutral). Tooltip = "Última: <data>".
    - `LeadsTable`: nova coluna opcional "Lead-magnet" com mesma pill.
    - `PeopleTab`: cada item mostra micro-pill se `status = active`.
    - `LeadDetailSheet` → tab "Comunicações" já existe; acrescentar bloco "Lead-magnet" com lista cronológica dos 3 events.

23. **Templates de lead-magnet destacados.** Em `TemplatesTab`, agrupar por categoria: `Lead-magnet (sequência inicial)` · `Operacionais (link/feedback)` em vez de grid plano. Permite ler a sequência como história.

## Ficheiros tocados

- `src/components/admin/v2/beta-leads/lead-card.tsx` — fix moeda, USER_TYPE_ACCENT, status labels, emoji, archive toast, badge lead-magnet.
- `src/components/admin/v2/beta-leads/kanban-board.tsx` — chips agrupados, contador, ordenação, sync mobile accordion, usar matchesChip/matchesQuery, querystring, drop sem `confirm()`.
- `src/components/admin/v2/beta-leads/leads-table.tsx` — chips agrupados, querystring, coluna lead-magnet.
- `src/lib/admin/lead-filter-chips.ts` — novos chips (Novos hoje / Inactivos 7d / Lead-magnet / Marketing) + grouping.
- `src/lib/admin/kanban-columns.ts` — adicionar `lead_magnet` ao `EnrichedLead`.
- `src/routes/api/admin/leads-kanban.ts` — agregação de events lead-magnet.
- `src/routes/admin.beta-leads.tsx` — `validateSearch` aceita `chip`/`q`/`sort`; optimistic patch completo.
- `src/components/admin/v2/automacoes/automation-flow-page.tsx` — eyebrow.
- `src/components/admin/v2/automacoes/people-tab.tsx` — copy "Pipeline", erro tipado, staleTime alinhado, micro-pill lead-magnet.
- `src/components/admin/v2/automacoes/templates-tab.tsx` — agrupar por categoria + `aria-disabled`.
- `src/components/admin/v2/beta-leads/lead-detail-sheet.tsx` — secção "Lead-magnet" na tab Comunicações.

## Validação

- `bunx tsc --noEmit`
- `bunx vitest run` (focar `lead-magnet-sequence.test.ts` para garantir que a query nova não parte semântica)
- Manual:
  - mover card → toast com Anular, sem `confirm()` nativo
  - filtrar por "Novos hoje" → contador "X de Y", "Limpar filtros" visível, querystring `?chip=novos_hoje`
  - mobile: trocar chip → primeira coluna válida abre automaticamente
  - badge user_type aparece em pt-PT (`Marca`, `Criador`, etc.), nunca "neutral" cru
  - custo no card aparece como `$X.XX` com tooltip
  - lead com sequência lead-magnet activa mostra badge no card e na tabela
  - automações: eyebrow "Ciclo de vida · Automações", PeopleTab link "Pipeline"

## Fora deste plano

- Multi-select / bulk actions
- Edição inline de templates (continua "em breve")
- Conversão automática USD→EUR no UI (precisa câmbio diário)
- Schema changes
