Plano de remate da emergência das caixas brancas do `/admin`

Contexto verificado agora

Os componentes críticos já foram refeitos com inline styles + hex literais no turno anterior:

- `src/components/admin/v2/admin-card.tsx` — `#FFFFFF`, borda `#D3D1C7`, radius 16, sombra dupla, variantes `default`, `flush`, `accent-left`, `hero` (gradiente esmeralda)
- `src/components/admin/v2/admin-page-header.tsx` — H1 36px `#2C2C2A`, eyebrow mono `#5F5E5A`, linha gradiente
- `src/components/admin/v2/admin-section-header.tsx` — barra temática + título uppercase, hex de accent local
- `src/components/admin/v2/admin-info-tooltip.tsx` — botão "i" inline + tooltip Radix dark
- Variants `hero` confirmadas em `revenue-section.tsx` e `metrics-section.tsx` (cartão MRR)

Falta cumprir três pedidos do prompt de emergência:

1. canvas creme inequívoco
2. gap 56px inline em todas as 6 rotas (em vez de `gap-14`)
3. validação visual real

Implementação técnica

1. Forçar canvas creme `#FAF9F5` no layout `/admin`
- Editar `src/routes/admin.tsx`.
- Adicionar `style={{ backgroundColor: "#FAF9F5", minHeight: "100vh" }}` ao wrapper `<div className="admin-v2 min-h-screen">` para garantir contraste com cartões brancos, mesmo se o token `--admin-neutral-50` falhar.
- Manter classe `.admin-v2` para tipografia.

2. Substituir `gap-14` por inline `gap: 56` nas 6 rotas
- Ficheiros:
  - `src/routes/admin.visao-geral.tsx` (linha 36)
  - `src/routes/admin.receita.tsx` (linha 48)
  - `src/routes/admin.clientes.tsx` (linha 34)
  - `src/routes/admin.relatorios.tsx` (linha 51)
  - `src/routes/admin.perfis.tsx` (linha 60)
  - `src/routes/admin.sistema.tsx` (linha 61)
- Mudança em cada: `<div className="flex flex-col gap-14">` → `<div className="flex flex-col" style={{ gap: 56 }}>`.

3. Validação obrigatória
- Correr `bunx tsc --noEmit`.
- Abrir preview em `/admin/visao-geral` via browser tool.
- Login Google (utilizador faz se gate aparecer) — alternativa: confirmar visualmente apenas após sessão activa.
- Tirar screenshot e validar os 7 pontos do critério:
  1. canvas `#FAF9F5`
  2. H1 36px com linha divisora
  3. cada secção em caixa branca distinta com borda `#D3D1C7` e radius 16
  4. ~56px entre caixas
  5. cartão MRR com gradiente verde-claro
  6. tooltips "i" visíveis
  7. sombra subtil
- Se algum cartão ainda parecer flat, inspeccionar `<div>` raiz do `AdminCard` no DOM e capturar `computed background-color`, `border`, `box-shadow`, `opacity`, `display`, e qualquer regra a sobrepor com `!important`.

Ficheiros a editar
- `src/routes/admin.tsx`
- `src/routes/admin.visao-geral.tsx`
- `src/routes/admin.receita.tsx`
- `src/routes/admin.clientes.tsx`
- `src/routes/admin.relatorios.tsx`
- `src/routes/admin.perfis.tsx`
- `src/routes/admin.sistema.tsx`

Ficheiros a NÃO editar (locked ou fora de escopo)
- `src/styles.css`, `src/styles/tokens.css`, `LOCKED_FILES.md`
- componentes `/report/example`
- cockpit legado
- conteúdo das tabs (texto, mock data, gráficos)

Notas
- Componentes `AdminCard`, `AdminPageHeader`, `AdminSectionHeader`, `AdminInfoTooltip` já estão à prova de tokens — não vão ser tocados de novo.
- Não vou instalar `@radix-ui/react-tooltip` directamente: o `AdminInfoTooltip` usa o wrapper shadcn já existente em `@/components/ui/tooltip` (que por baixo é Radix). Funciona igual.
- O ponto 7 do prompt original ("não fazer") fica respeitado.

Checkpoint
☐ Forçar canvas `#FAF9F5` inline em `admin.tsx`
☐ Trocar `gap-14` por `gap: 56` inline em 6 rotas
☐ Correr `bunx tsc --noEmit`
☐ Abrir `/admin/visao-geral` na preview e tirar screenshot
☐ Validar os 7 pontos do critério visual
☐ Se falhar, recolher computed styles do `AdminCard` no DOM