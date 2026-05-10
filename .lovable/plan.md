## Auditoria mobile (375px) — Admin CRM

Auditoria 100% **read-only**, baseada em leitura de código. O preview do admin exige Google Sign-in (allowlist) e não consegui passar o gate sem credenciais — por isso não foi possível tirar screenshots logados. Os achados abaixo derivam da inspeção dos componentes recém-alterados.

Se quiseres screenshots reais, faz login no preview com a tua conta admin e dou-te a captura por rota.

---

### 1. Status por rota

| Rota | Estado | Notas principais |
|---|---|---|
| `/admin/visao-geral` | OK c/ ressalvas | Funil compacto bem dimensionado; secções empilham; muitas cards verticais |
| `/admin/beta-leads` | OK | Acordeão mobile dedicado; chips wrap; search full-width |
| `/admin/beta-requests` | Tolerável | Tabela 10 colunas em `overflow-x-auto` (scroll horizontal pouco descoberto) |
| `/admin/automacoes` | Risco médio | TabsList sem scroll; nós/edges desenhados para vertical OK, mas tabs podem cortar |
| `/admin/email-lab` | OK | Stack vertical limpo; iframe 640px; tabela variáveis com scroll |
| `/admin/report-lab` | Risco alto | Selector de variantes `inline-flex` 3 botões pode estourar 375px; matrix densa |
| `/admin/sistema` | OK c/ ressalvas | Strip "modo execução" no topo aperta texto + botão "Abrir Sistema" |

---

### 2. Achados detalhados

#### Sidebar drawer (todas as rotas)
- `AdminSidebar` usa `md:hidden fixed inset-0 z-50` com backdrop e `aside` à largura `var(--admin-sidebar-width)` — abertura/fecho corretos, ESC funciona, click no backdrop fecha.
- `onNavigate={() => setOpen(false)}` em cada `Link` — boa prática.
- **OK** — fluxo abrir/fechar/navegar é sólido.

#### Topbar (`AdminTopbar`)
- Hambúrguer 40×40 (h-10 w-10) — tap target ≥44px iOS: **abaixo por 4px**.
- Botão "Procurar" mostra só ícone Search no mobile (`hidden sm:inline`), altura `h-8` (32px) — **tap target pequeno (P2)**.
- ExecutionModeBadge tem variante curta "Cache"/"Fresh" — bem.
- Risco de colisão se título for longo: `truncate` ativo, mas com hambúrguer + título + (Procurar + Badge) à direita, sobra pouco para o título. Em rotas com título de 1-2 palavras está OK.

#### Kanban board (`/admin/beta-leads`)
- `md:hidden` accordion com `KANBAN_COLUMNS` — uma coluna aberta por vez. **Bom UX mobile.**
- Toolbar: chips em `flex-wrap` + search full-width — **OK**.
- `LeadCard` herdado do desktop: precisa verificar se tem botões grandes o suficiente (não auditado em profundidade).

#### Lead Detail Sheet (`lead-detail-sheet.tsx`, 1514 linhas)
- `SheetContent` com `w-full sm:max-w-[520px]` — ocupa 100% no mobile. **OK.**
- Header sticky com avatar 48px + nome/email/handle + status badge: usa `flex items-start justify-between gap-3` com `min-w-0` e `truncate`. **OK** mas em ecrãs ≤320 pode apertar muito.
- KPI strip: `grid grid-cols-3 gap-3` — Views/Custo/Idade legíveis a 18px. **OK.**
- Tabs internas: `<div className="px-6 pt-3 overflow-x-auto">` com `TabsList inline-flex whitespace-nowrap` — **scroll horizontal funciona**.
- Padding `px-6` (24px) em mobile come 48px laterais — em 375 sobra 327 para conteúdo. Aceitável mas pesado; podia ser `px-4 sm:px-6`.

#### Automações (`/admin/automacoes`)
- `<TabsList className="mb-4">` com 4 TabsTriggers ("Fluxo", "Métricas", "Pessoas", "Templates") — **sem `overflow-x-auto`**. Em PT-PT cabe (~256-300px), mas qualquer rótulo mais longo no futuro corta. **P2.**
- `<FlowStages>` usa `mx-auto max-w-[820px] flex-col` — vertical, bom.
- `AutomationNode` usa `AdminCard accent-left` com `flex-col gap-3` — provavelmente OK; **não verificado no detalhe** se badges trigger/action partem para 2 linhas.

#### Overview funil (`BetaConversionFunnel`)
- Linha: `w-[160px]` label + bar `flex-1` + `w-[88px]` count, com `max-sm:w-[120px]` e `max-sm:w-[72px]`.
- A 375 com padding do AdminCard: 343px disponíveis − 120 − 72 − 24 (gaps) = **127px para a barra**. Aceitável mas apertado. Descrição em 2 linhas (`line-clamp-2`) ajuda.
- Linha inferior "↓ X% conversão" tem `ml-[160px] max-sm:ml-[120px]` — **OK**.

#### Email Lab
- `lg:grid-cols-[280px_1fr]` colapsa para 1 coluna em mobile — **OK**.
- iframe `height: 640px` — alto mas legível.
- Tabela de variáveis em `overflow-x-auto` — OK.

#### Report Lab — **PRINCIPAL RISCO**
- Linha 281: selector de variantes `<div className="inline-flex rounded-xl border ... p-1">` com 3 botões `px-4 py-2 text-sm` (≈110-130px cada). Total ≈ 330-390px + padding parent → **muito provável overflow horizontal a 375px**. **P1.**
- Linha 333: `grid grid-cols-1 lg:grid-cols-3 gap-6` — colapsa. OK.
- `BlockAccessMatrix` (linhas 694, 797) usa `overflow-x-auto` interno — funciona mas pouco descoberto em mobile.

#### Beta Requests (tabela)
- 10 colunas dentro de `overflow-x-auto`. A 375px o scroll horizontal é a única forma de ver Status/Fonte. **Funciona mas não tem hint visual de scroll.** Considerar versão card mobile (como Kanban) ou shadow indicador. **P1.**

#### Sistema — ExecutionModeStrip
- `flex items-center justify-between gap-4` com texto `truncate` + link "Abrir Sistema" `shrink-0`. A 375px cabe mas o texto fica muito truncado. Aceitável.

#### Command Palette
- shadcn `CommandDialog` é responsive por defeito (modal centrado). **OK.**
- Atalho ⌘K não está acessível em mobile (sem teclado físico) → o utilizador depende do botão "Procurar" da topbar (que é só ícone). Tap target 32px de altura. **P2.**

---

### 3. Lista priorizada de issues

**P0 (bloqueante para beta externa):** nenhum identificado.

**P1 (corrigir antes do beta):**
- **report-lab**: selector de variantes `inline-flex` provoca overflow horizontal em 375px. Trocar por `flex flex-wrap gap-2` ou `grid grid-cols-3` com `text-xs sm:text-sm`.
- **beta-requests**: tabela densa sem indicador de scroll. Adicionar shadow lateral (gradiente nas extremidades) **ou** versão mobile em cards (preferível).

**P2 (refinamento, não-bloqueante):**
- **topbar**: aumentar tap targets — hambúrguer para `h-11 w-11` (44px) e botão "Procurar" para `h-10 px-3` com label visível pelo menos como `Pesquisar` curto, ou `aria-label` melhor + ícone maior (18px).
- **lead-detail-sheet**: trocar `px-6` por `px-4 sm:px-6` no header e tabs para ganhar 16px laterais.
- **automacoes**: envolver `TabsList` em `<div className="overflow-x-auto -mx-4 px-4">` para futuro-proof.
- **lead-detail-sheet** header: status badge à direita pode descer se nome longo — considerar `flex-wrap` ou mover badge para baixo do nome.

---

### 4. Próximos passos sugeridos

Posso preparar um **prompt de implementação** focado em P1 (report-lab + beta-requests) sem tocar em business logic. Confirma se queres avançar nessa direção, ou se preferes que eu valide visualmente primeiro fazendo login no preview (precisas dar acesso ou validar manualmente e enviar screenshots).

☐ Aprovar este audit  
☐ Decidir: corrigir P1 agora vs apenas registar  
☐ Decidir: validação visual no browser (precisa de login)
