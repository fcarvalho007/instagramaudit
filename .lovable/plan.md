## Refinamentos finais — /admin/estudo-mercado

Foco: tirar arestas que ficaram da iteração anterior, sem mexer em lógica de servidor nem em schema.

### 1. Centralizar paleta dos gráficos
Criar `src/components/admin/v2/estudo-mercado/chart-palette.ts` com constantes nomeadas (positive / neutral / warning / negative / accent-primary / accent-secondary / accent-amber) derivadas dos tokens admin. Substituir os hex hardcoded em `admin.estudo-mercado.tsx`, `comment-mural.tsx`, `rating-ranking.tsx` e `block-heatmap.tsx` por esse módulo. Cumpre a regra global "never hardcode colors/fonts in components".

### 2. Tooltip Recharts temático
Criar `ChartTooltip` partilhado (`chart-tooltip.tsx`) — fundo branco, border `admin-border`, sombra subtil, fonte Inter tabular-nums. Aplicar nos 4 gráficos (intent diário modal, utilidade diária, intent diário pricing, % convicto diário).

### 3. Estado vazio nos gráficos diários
Quando `daily.length === 0` ou todos os valores forem zero, mostrar `<Empty>` em vez de renderizar um gráfico achatado. Aplica-se ao ModalTab e InterestTab.

### 4. Tabela de comentários de preços ligada a /admin/clientes
Na `InterestTab`, transformar a coluna `Email` em link interno para `/admin/clientes?email={email}` quando houver email (igual ao padrão usado noutros admins). Sem email continua "—".

### 5. Export CSV do mural
Adicionar botão "Exportar CSV" no `CommentMural` (lado direito da barra de filtros). Exporta o conjunto **filtrado** com colunas: `created_at_iso`, `source`, `language`, `author_email`, `author_name`, `handle`, `block`, `rating`, `intent`, `text`. Geração 100% client-side (Blob + download anchor), sem dependências novas.

### 6. Pequenos polish
- Heatmap: garantir tooltip nativo via `title` em cada célula com formato "Bloco · ⭐ N · X respostas".
- RatingRanking: alinhar números à direita e usar `tabular-nums`.
- PulseTab `3 sinais principais`: mostrar até 6 tokens em vez de 3 quando houver ≥30 comentários (sinaliza melhor mural maduro).

### Ficheiros tocados
- novo `src/components/admin/v2/estudo-mercado/chart-palette.ts`
- novo `src/components/admin/v2/estudo-mercado/chart-tooltip.tsx`
- edit `src/routes/admin.estudo-mercado.tsx`
- edit `src/components/admin/v2/estudo-mercado/comment-mural.tsx`
- edit `src/components/admin/v2/estudo-mercado/rating-ranking.tsx`
- edit `src/components/admin/v2/estudo-mercado/block-heatmap.tsx`

### Fora de âmbito
- Sem alterações em `market-study.functions.ts` nem em migrations.
- Sem alterações em /admin/visao-geral nem nos formulários públicos.
- Sem novas dependências.

### Checkpoint
- ☐ Paleta centralizada e hex substituídos
- ☐ Tooltip partilhado nos 4 gráficos
- ☐ Estados vazios em ModalTab e InterestTab
- ☐ Email da tabela pricing → link `/admin/clientes`
- ☐ Botão Exportar CSV no mural funcional
- ☐ Heatmap com `title`, RatingRanking com tabular-nums, Pulse com até 6 tópicos
- ☐ `tsc --noEmit` limpo