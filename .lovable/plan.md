## Plano · Refinamento do header

Alinhar `src/components/layout/header.tsx` com o mockup: três blocos em `space-between`, navegação em pílula centrada com estado activo, e hierarquia clara nas acções à direita.

### 1. Estrutura
- Manter `flex justify-between` em três blocos: marca · pílula de nav · acções.
- Altura mantém-se em `h-16 md:h-20`.

### 2. Marca (esquerda)
- Manter `BrandMark` mas reforçar com `shadow-[0_4px_14px_-4px_rgba(99,102,241,0.45)]` para o efeito "saltar" da superfície (sombra colorida subtil).
- Nome em Fraunces 20px (`text-xl`).
- **Remover** o separador + tagline `INSTAGRAM BENCHMARK` (passa a viver no subtítulo do hero, como pedido). Eliminar a chave `brand_subtitle` dos JSON `pt/en/header.json`.

### 3. Navegação em pílula (centro · desktop ≥ lg)
- Container: `inline-flex items-center gap-1 rounded-full bg-surface-muted/60 border border-border-subtle px-1.5 py-1.5`.
- Item activo: chip branco `bg-surface-base text-content-primary shadow-[0_1px_3px_rgba(15,23,42,0.08)] rounded-full px-4 py-1.5 text-sm font-medium`.
- Itens inactivos: `text-content-secondary hover:text-content-primary px-4 py-1.5 text-sm`.
- Itens propostos: **Analisar · Como funciona · Preços · Exemplos**.
  - "Analisar" → `/` (activo quando `pathname === "/"`).
  - **Pergunta aberta**: as outras 3 secções ainda não existem como rotas nem como âncoras na home. Proponho criá-las como âncoras (`/#como-funciona`, `/#precos`, `/#exemplos`) apontando para secções já existentes da landing (`ProductPreviewSection`, etc.) — se preferires rotas dedicadas, faço noutra task. Se não houver secção correspondente ainda, escondo o item para não criar link morto.
- Detecção de activo via `useRouterState({ select: s => s.location.pathname })`.

### 4. Acções (direita) — três níveis
1. **Tema** (`Moon`): `size="icon"` ghost, utilitário.
2. **Entrar / A minha conta**: `variant="ghost"` sem fundo (mantém-se).
3. **Analisar agora**: `variant="primary"` com gradient da marca + `shadow-[0_8px_24px_-8px_var(--accent-primary)]` + seta. Único elemento a cor no header.
- **Remover** `LanguageSwitcher` do header (passa para o footer — já lá existe lógica de idioma, só preciso garantir o componente visível).

### 5. Mobile (< lg)
- Visível: logo + botão `Analisar agora` (compacto, sem texto longo — usar `sm:inline-flex` no texto e ícone-only no telemóvel) + hambúrguer.
- Drawer já existente: actualizar lista para os 4 novos itens + Entrar + `LanguageSwitcher` no fundo (mantém-se aqui).

### 6. Footer
- Adicionar `LanguageSwitcher` numa linha discreta do `Footer` (canto direito da barra inferior), para compensar a remoção do topo.

### 7. i18n
- Acrescentar chaves em `pt/header.json` e `en/header.json`:
  - `nav.how_it_works`, `nav.pricing`, `nav.examples`.
- Remover `brand_subtitle`.

### Ficheiros a tocar
- `src/components/layout/header.tsx` (refactor principal)
- `src/components/layout/footer.tsx` (adicionar `LanguageSwitcher`)
- `src/i18n/locales/pt/header.json`
- `src/i18n/locales/en/header.json`

### Checkpoint
- ☐ Pílula central renderiza com estado activo no item correcto
- ☐ Logo com sombra colorida subtil
- ☐ Apenas o CTA "Analisar agora" usa cor
- ☐ Language switcher removido do topo e presente no footer
- ☐ Tagline `INSTAGRAM BENCHMARK` removido
- ☐ Mobile colapsa para logo + CTA + hambúrguer
- ☐ Sem links mortos (decisão final sobre Como funciona / Preços / Exemplos confirmada)

**Antes de avançar:** confirma se queres âncoras para secções da landing, rotas novas, ou esconder os itens que ainda não têm destino.