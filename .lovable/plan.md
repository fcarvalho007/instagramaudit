Plano de correção de emergência para as caixas brancas do `/admin`

Objetivo: eliminar a dependência de tokens Tailwind/CSS nos componentes críticos do admin v2 e forçar renderização visual inequívoca com `style={{ ... }}` e hex literais diretos.

Escopo aprovado pelo teu pedido:
- `AdminCard`
- `AdminPageHeader`
- `AdminSectionHeader`
- `AdminInfoTooltip`
- validação visual por screenshot real da `/admin/visao-geral`

Notas importantes:
- O anexo `EMERGENCY-fix-cards.md` não está disponível no ambiente de ficheiros; só aparecem outros anexos. Vou aplicar literalmente a estratégia descrita na tua mensagem.
- Isto contraria a regra normal do projeto de não hardcodar cores, mas é uma correção de emergência explicitamente pedida para remover a dependência de tokens.
- Não vou tocar nos ficheiros locked (`src/styles.css`, `src/styles/tokens.css`, `LOCKED_FILES.md`, etc.).

Implementação técnica

1. Refazer `src/components/admin/v2/admin-card.tsx`
- Remover dependência visual de classes como `bg-admin-surface`, `border-admin-border`, `text-admin-text-primary` e `shadow-[var(--shadow-admin-card)]`.
- Manter a API atual (`variant`, `accent`, `className`, `style`, `children`, `as`) para não partir chamadas existentes.
- Aplicar inline styles base:
  - `backgroundColor: "#FFFFFF"`
  - `border: "1px solid #D3D1C7"`
  - `borderRadius: "16px"`
  - `boxShadow: "0 1px 2px rgba(44,44,42,0.06), 0 8px 24px rgba(44,44,42,0.08)"`
  - `color: "#2C2C2A"`
  - `padding: "24px"` por defeito
- Preservar variantes:
  - `flush`: `padding: 0`
  - `accent-left`: `borderLeft: "3px solid ..."`
  - `hero`: fundo claro explícito com gradiente inline, sem tokens Tailwind
- Preservar `style` externo no fim para permitir overrides intencionais existentes.

2. Refazer `src/components/admin/v2/admin-page-header.tsx`
- Substituir texto, linha inferior e espaçamentos principais por inline styles com hex diretos.
- Manter classes apenas para layout utilitário quando não afetam cor/fundo/borda crítica.
- Cores propostas:
  - título: `#2C2C2A`
  - subtítulo/eyebrow: `#5F5E5A`
  - linha inferior: `linear-gradient(to right, rgba(44,44,42,0.18), transparent)`

3. Refazer `src/components/admin/v2/admin-section-header.tsx`
- Remover dependência de `text-admin-*` no título e subtítulo.
- Usar inline styles para:
  - barra temática
  - título uppercase
  - subtítulo secundário
- Manter `ACCENT_500` se já resolve para hex/valores estáveis; se necessário, substituir por mapa local de hex literais.

4. Refazer `src/components/admin/v2/admin-info-tooltip.tsx`
- Remover dependência de classes `border-admin-*`, `text-admin-*`, `bg-admin-*`, `ring-admin-*` no trigger/conteúdo.
- Aplicar inline styles no botão:
  - fundo branco
  - borda cinzenta visível
  - texto cinzento
  - tamanho 16x16
- Aplicar inline styles no tooltip content:
  - fundo `#2C2C2A`
  - texto `#FFFFFF`
  - sombra explícita

5. Garantir canvas e espaçamento da `/admin/visao-geral`
- Confirmar que o wrapper `.admin-v2` continua a dar canvas creme.
- Se o screenshot ainda não mostrar contraste suficiente, ajustar só o wrapper da rota/admin layout com inline `backgroundColor: "#F1EFE8"`, sem mexer em tokens locked.
- O espaçamento de 56px já aparece como `gap-14` nas páginas; se Tailwind falhar nessa classe, trocar nos wrappers principais por `style={{ gap: 56 }}` apenas nas rotas/admin afetadas.

Validação obrigatória

1. Correr build/typecheck ou comando equivalente disponível para apanhar erros de JSX/TypeScript.
2. Abrir a preview na rota `/admin/visao-geral`.
3. Fazer login se o gate aparecer e a sessão não estiver ativa.
4. Tirar screenshot real.
5. Critério visual de aceitação:
   - caixas brancas claramente visíveis
   - bordas cinzentas visíveis
   - secções envolvidas por cartões
   - canvas creme visível entre cartões
   - 56px de espaço vertical entre secções principais
6. Se falhar:
   - inspecionar um `<AdminCard>` no DOM
   - recolher `computed background-color`, `border-color`, `box-shadow`, `padding`, `display`, `opacity`
   - reportar esses valores antes de novas alterações.

Ficheiros a editar
- `src/components/admin/v2/admin-card.tsx`
- `src/components/admin/v2/admin-page-header.tsx`
- `src/components/admin/v2/admin-section-header.tsx`
- `src/components/admin/v2/admin-info-tooltip.tsx`
- opcional, só se necessário após screenshot: `src/routes/admin.tsx` ou rotas admin específicas para forçar canvas/gap inline

Ficheiros a não editar
- `src/styles.css`
- `src/styles/tokens.css`
- `LOCKED_FILES.md`
- ficheiros de relatório locked
- pipeline Apify/DataForSEO

Checkpoint
☐ Refazer componentes críticos com inline styles e hex literais
☐ Preservar API pública dos componentes para não partir o admin
☐ Confirmar build/typecheck
☐ Abrir `/admin/visao-geral` na preview
☐ Tirar screenshot real de validação
☐ Se falhar, recolher computed styles do `<AdminCard>`