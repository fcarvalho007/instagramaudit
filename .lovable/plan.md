## Plano — Redesign do editor de templates de email + WYSIWYG

Ficheiro principal: `src/components/admin/v2/automacoes/template-editor.tsx`.
Nada muda no backend, no `wrapHtml`, no `email_template_overrides`, nas variáveis disponíveis, nem nos restantes templates/UIs.

---

### 1. Escolha técnica do WYSIWYG

Os templates atuais são **simples por design**: o cartão branco, header e footer são aplicados automaticamente pelo `wrapHtml`; o admin só edita o conteúdo interior. Um drag-and-drop block-builder estilo Unlayer/GrapesJS seria sobre-engenharia e quebraria a shell partilhada.

A solução certa é um **editor rich-text focado com toolbar** baseado em **Tiptap** (`@tiptap/react` + `@tiptap/starter-kit` + `@tiptap/extension-link`):
- produz HTML limpo e compatível com email (`<p>`, `<h2>`, `<ul>`, `<a>`, `<strong>`, `<em>`, `<hr>`)
- suporta inserção de variáveis no cursor (`{{firstName}}` etc.)
- mantém retrocompatibilidade com o `body_html` já guardado (carrega via `editor.commands.setContent(html)`)
- ~120 KB gzipped, peso aceitável numa página admin

### 2. Refazer o editor em 4 zonas

**A. Sticky toolbar** (topo do painel esquerdo, sempre visível ao fazer scroll):
- Negrito · Itálico · H2 · H3 · Lista · Lista numerada · Link (popover com URL) · Linha horizontal · Limpar formatação · "Undo / Redo"
- Botão dropdown "Inserir variável" → lista das `data.variables`; insere no cursor com background subtil para se ler como token, mesmo em modo HTML

**B. Tabs por modo de edição** (acima do editor, abaixo da toolbar):
- **Visual** (Tiptap) — modo principal
- **HTML** (textarea mono, igual ao atual; útil para colar HTML pronto)
- **Texto simples** (substitui o `body_text` atual)
- Mudança entre tabs sincroniza o conteúdo (HTML <-> visual); texto simples é independente

**C. Cabeçalho do template** (cartão acima da toolbar, agrupa metadados):
- Assunto · Preheader · Headline em grelha 3 colunas (desktop) / stack (mobile)
- Cada input com **contador de caracteres** e marca subtil quando o Gmail/Apple Mail vão truncar:
  - Assunto: cinza até 60, âmbar 60–78, vermelho ≥78
  - Preheader: cinza até 90, âmbar 90–120, vermelho ≥120
- Headline mantém-se input simples

**D. Painel de preview redesenhado** (lado direito, sticky a partir de `lg:`):
- **Inbox card** no topo a simular a vista de inbox (linha "InstaBench • Assunto — Preheader") com avatar e timestamp fictício
- Toggle **Desktop (600px) / Mobile (375px)** para o iframe
- Iframe mantém-se com `srcDoc` + debounce 400ms já existente
- Indicador de "atualizado há Xs" em vez do "a atualizar…" pulsante

### 3. Barra de ações fixa no fundo (sticky bottom bar)

Substitui os botões soltos no header. Sempre visível ao editar:
- Esquerda: pill de estado (`● Não guardado` / `✓ Guardado` / `● Override ativo desde DD/MM`)
- Direita: `Repor predefinido` (secundário, ghost) + `Guardar alterações` (primário, escuro)
- `Repor` abre **modal de confirmação** com diff resumido (substitui `confirm()` nativo)
- `Ctrl/Cmd+S` faz save quando dirty

### 4. Hierarquia visual e espaçamento

- Header da página passa a ter: breadcrumb pequeno + título + chip de categoria + chip "wired/unwired"; meta info (key, override, autor, data) move-se para um popover "Info do template" para reduzir ruído visual
- Grid passa de 1:1 fixo para `lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]` (editor um pouco mais largo que preview, alinhado com a prática de tools tipo Stripe/Resend)
- Padding interno dos `AdminCard` consistente a `p-5`
- Bordas e cinzas usam tokens admin já existentes (`--admin-border-default`, `--admin-surface-elevated`, `--admin-text-*`)
- Tipografia: títulos `text-[14px] font-semibold`, eyebrow `text-eyebrow-sm`, hints `text-[11px] text-admin-text-tertiary` — mantém-se a regra de pt-PT e o mínimo 11px só em hints/labels

### 5. Variáveis disponíveis

- Continuam visíveis como chips, **mas dentro de um popover** "Inserir variável" na toolbar — liberta espaço no formulário
- Quando inseridas no editor visual, ficam com background `bg-accent-primary/10` e padding inline para distinguir do texto livre (apenas no editor; o HTML guardado mantém-se `{{var}}` literal)

### 6. O que vai mudar concretamente

Ficheiros:
- **edit**: `src/components/admin/v2/automacoes/template-editor.tsx` (reescrito)
- **novo**: `src/components/admin/v2/automacoes/template-editor/rich-text-editor.tsx` (wrapper Tiptap)
- **novo**: `src/components/admin/v2/automacoes/template-editor/toolbar.tsx`
- **novo**: `src/components/admin/v2/automacoes/template-editor/inbox-preview-card.tsx`
- **novo**: `src/components/admin/v2/automacoes/template-editor/reset-confirm-dialog.tsx`

Deps a instalar: `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/extension-link`, `@tiptap/extension-placeholder`.

### Fora de scope (não tocar)

- Endpoints `/api/admin/email-templates/...`
- `wrapHtml`, `email_template_overrides`, registo de history
- Outros templates (`commercial-followup`, `feedback-request`, etc.)
- A página `email-lab` (`src/components/admin/v2/email-lab/`)
- Tokens globais, sidebar, navegação admin

### Validação

- `bunx tsc --noEmit`
- Smoke manual em `/admin/automacoes/templates/welcome_beta`:
  - editar texto no modo visual → HTML atualizado e preview redesenhado renderiza
  - alternar Visual ↔ HTML mantém conteúdo
  - inserir `{{firstName}}` no cursor
  - Cmd+S guarda
  - Reset abre modal e remove override

Aprovas?