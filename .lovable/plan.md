# Plano — Cards "Melhor / Pior publicação" do Bloco 1

## Objetivo

1. Refinar o design dos dois cards detalhados (Melhor / Pior) — mais elegantes, mais editoriais, mantendo coerência com o resto do Block 1 (Ocean Breeze: navy / ocean / cyan / aquas, sem dark, sem neon).
2. Garantir que a miniatura mostra a **imagem real do post** (não o ícone de formato) sempre que houver thumbnail disponível.

Escopo restrito ao componente `DetailedPostCard` em `src/components/report-redesign/v2/report-post-comparison.tsx`. Não toca em métricas, dados, scatter, hero comparativo, AI reading ou copy estrutural.

---

## 1. Redesign visual dos cards (frontend-only)

Mudanças no `DetailedPostCard` (linhas 842–960):

- **Imagem em destaque**: aumentar a thumb de `w-[88px] aspect-square` para `w-[120px] sm:w-[132px] aspect-[4/5]` (proporção mais próxima do feed Instagram, mais cinematográfica). Remover o gradiente colorido por trás — passa a ser `bg-surface-muted` neutro só visível enquanto a imagem carrega.
- **Chip de formato sobre a imagem**: manter, mas em cápsula `bg-content-primary/85` (navy translúcido) + texto branco, canto superior esquerdo, tipografia eyebrow Inter (não font-mono). Adicionar pequeno ícone Lucide ao lado do label (Carrossel / Reel / Imagem), tamanho `size-3`.
- **Faixa superior tonal**: substituir a `border-t-2` colorida por uma faixa interna de 4 px com gradiente sutil (`from-accent-primary/15 to-transparent` para best, `from-signal-warning/15 to-transparent` para worst) acima do header. O resto do card mantém o card branco unificado (mesma sombra que os outros cards do bloco).
- **Header refinado**: badge "Melhor publicação" / "Pior publicação" passa a inline-flex com fundo `bg-accent-primary/8` / `bg-signal-warning/8`, padding `px-2 py-0.5`, radius `rounded-full`, eyebrow Inter SemiBold. Data alinhada à direita, `text-xs text-content-tertiary`.
- **Métrica primária**: adicionar a engagement rate da própria publicação como número grande Inter SemiBold tabular-nums `text-lg` no topo da coluna direita (ex: `0,15 %`), seguido do chip `+68 % vs média` (mantido). Cria hierarquia visual coerente com o hero do bloco.
- **Caption**: subir para `text-[13px]`, `leading-[1.45]`, `line-clamp-3`. Se vazia, exibe placeholder em itálico `text-content-tertiary`.
- **Rodapé likes/comments**: separar com `divide-x divide-border-subtle`, ícones `size-3.5`, números `text-sm tabular-nums`. Adicionar terceiro slot opcional só se `post.format === "Reel"` com views (se existir no payload — caso contrário não renderiza, sem placeholder).
- **Hover state**: o card inteiro ganha `transition-shadow hover:shadow-md` e a thumb `group-hover:scale-[1.02] transition-transform`. Sem animações fora deste envelope.
- **Acessibilidade**: o `<img>` recebe `alt={t("posts.thumb_alt", { format, date })}` em vez de `alt=""`.

Tokens / cores: tudo via `text-accent-primary`, `text-signal-warning`, `text-content-*`, `border-border-*`, `bg-surface-*`. Zero cores hardcoded. Tipografia: Inter (já é o default deste card — Fraunces continua reservada a H1/H2 do bloco).

## 2. Garantir imagem real (não ícone)

Verificação + ajuste mínimo:

- O componente já tenta renderizar `thumbUrl` e cai para o ícone quando `onError` dispara. O ícone aparecer significa que a `img` falhou (CDN do IG expira) ou que `thumbnailUrl` veio vazio.
- Ação: no `DetailedPostCard`, trocar o `src={thumbUrl}` direto pelo proxy estável `/api/public/ig-thumb?url=<encoded>` quando o URL vier do CDN do IG (host `*.cdninstagram.com` ou `*.fbcdn.net`), mantendo o URL direto quando já for do Supabase Storage (`thumbnail_storage_url`).
- Garantir o atributo `referrerPolicy="no-referrer"` no `<img>` (algumas variantes do CDN do IG bloqueiam requests com referrer).
- Manter o fallback do ícone como rede de segurança (sem alteração de comportamento), só com a estética nova.

Antes de implementar, confirmo se o endpoint `/api/public/ig-thumb` existe na branch atual. A listagem em `src/routes/api/public/` mostra que **não existe**. Duas opções:

- **A (preferida, sem novo backend)**: usar apenas `referrerPolicy="no-referrer"` + `crossOrigin="anonymous"` no `<img>`. Em muitos casos resolve o problema dos thumbnails do IG quando o URL ainda não expirou. Não precisa de novo endpoint.
- **B (mais robusto, fora de escopo desta UI task)**: criar o endpoint proxy `/api/public/ig-thumb` (server route que faz fetch do CDN do IG e devolve a imagem). Isto é trabalho de backend e deve ser pedido num prompt separado.

Recomendo seguir com **A** neste prompt (mantém o trabalho na camada de apresentação, conforme regra "UI changes stay frontend"). Se mesmo assim os thumbnails continuarem a falhar para muitos posts, abrimos depois um prompt dedicado ao proxy.

## 3. Fora de escopo

- Não mexer no scatter, no hero, no premium reveal, no AI reading nem na copy de títulos/subtítulos do bloco.
- Não criar novos endpoints nem alterar `snapshot-to-report-data.ts` ou `pick-thumbnail.ts`.
- Não alterar tokens globais nem `src/styles/tokens-light.css`.

## Ficheiros tocados

- `src/components/report-redesign/v2/report-post-comparison.tsx` — só o `DetailedPostCard` e, se necessário, uma chave i18n nova (`posts.thumb_alt`, `posts.no_caption_placeholder`) em `src/i18n/locales/{pt,en}/report.json`.

## Checkpoint

- ☐ DetailedPostCard com thumbnail maior, proporção 4:5, sem gradiente colorido
- ☐ Chip de formato sobre a imagem em navy translúcido + ícone
- ☐ Faixa tonal superior (gradient) em vez de border colorida
- ☐ Engagement rate como métrica primária no card
- ☐ `referrerPolicy="no-referrer"` no `<img>` para reduzir falhas do CDN IG
- ☐ Alt text descritivo
- ☐ Zero cores hardcoded, zero font-mono, Inter em tudo
- ☐ `tsc --noEmit` limpo
