## Objetivo

Tornar `/admin/estudo-mercado` mais visual e prático. Hoje todos os tabs parecem variações do mesmo KPI strip e a caixa "Comentários recentes" mostra apenas texto solto, sem autor, sem hora, sem agregação. Vou reorganizar cada um dos 4 tabs para responder às perguntas que tu fazes de facto:

1. Quem disse o quê (e quando)?
2. Qual o emoji/voto mais escolhido?
3. Como evolui no tempo?

Mantenho a stack atual (TanStack Query + recharts + AdminCard) e os endpoints existentes em `src/server/admin/market-study.functions.ts` — todas as mudanças são aditivas, sem migração de DB.

---

## Mudanças por tab

### 1. Pulso do produto — comentários com identidade

Substituo a caixa "Comentários recentes (livres)" por um **Mural de comentários** muito mais rico:

- Cada item passa a ter: emoji do voto (1-5) · bloco · **email/nome do autor** (resolvido via `inline_report_feedback.snapshot_id → report_requests → leads`, ou direto via `beta_feedback.lead_id`, ou `pricing_interest.email`) · **data e hora HH:mm** · idioma detectado (PT / EN / outro, heurística simples por palavras-chave).
- Filtros no topo do mural: **Origem** (Inline / Modal beta / Modal preços / Todos) · **Idioma** (PT / EN / Todos) · search box.
- Acima do mural, novo bloco **"3 sinais principais"**: quando há ≥10 comentários no período, mostra 3 chips com os tokens mais frequentes (após stopwords pt+en) e a contagem. Quando há <10, mostra apenas "amostra ainda pequena" (mantém o tom editorial atual).
- Os 4 KPI tiles em cima mantêm-se mas a métrica "Janela" passa a mostrar também o número absoluto de comentários no período (mais útil que repetir "30d").

### 2. Emojis por bloco — deixa de parecer Pulso

Hoje este tab é uma tabela quase idêntica ao Pulso. Vou separar claramente em duas peças visualmente distintas:

- **Ranking de votos no período** (peça nova, em cima): tabela ordenada por frequência das opções 1⭐ → 5⭐, com barra horizontal proporcional, contagem absoluta, % do total, e sparkline com a evolução diária dessa opção. Responde diretamente ao "saber qual é o mais votado".
- **Heatmap por bloco × emoji** (substitui a tabela atual): grelha compacta com blocos nas linhas e 1-5 nas colunas, cada célula colorida pela intensidade (count). Mantém a coluna "média" à direita. Muito mais visual que a tabela atual com 5 colunas de números.
- Filtro extra "Bloco" (todos / overview / diagnostic / performance / content) que filtra também o ranking.
- Mantenho "Últimos comentários inline" no fundo, mas usando o mesmo componente de mural do tab 1 (autor + hora + idioma).

### 3. Modal beta — gráficos a sério

- Mantenho KPI strip (utilidade média, intenção sim/talvez, opt-in, janela).
- **Novo gráfico "Respostas ao longo do tempo"**: stacked bar diário por intenção (Sim / Talvez / Não / Indeciso) usando recharts. Mostra picos e dias secos.
- **Novo gráfico "Utilidade média por dia"**: linha simples com a média móvel de `usefulness_score`.
- "Intenção de compra" e "Preferência de pricing" passam de listas para **donut + lista** lado a lado, com cores consistentes com a paleta admin.
- "Respostas livres" passa a ser o mesmo componente de mural (autor + hora + idioma + score + intent badge).

### 4. Intenção de compra (pricing modal) — perceber data, hora e gráfico

- KPI strip mantém-se.
- **Novo gráfico "Respostas por dia"**: stacked bar Sim/Talvez/Não. Idêntico em comportamento ao do Modal beta, para consistência visual.
- **Gráfico "% sim convicto vs dia"**: linha que mostra se a convicção está a subir ou a descer com o tempo.
- "Intenção de pagar" e "Perceção do preço por plano" passam a barras horizontais empilhadas (não listas), com legenda barato/justo/caro coloridas.
- Tabela de comentários no fundo: plano · would_pay · fairness · email · **data + hora HH:mm** · comentário. Ordenável por data. Linka o email para uma pesquisa no /admin/clientes.

---

## Mudanças server-side (`market-study.functions.ts`)

Tudo via `supabaseAdmin`, sem nova RLS:

1. **`getMarketStudyPulse`** — devolve `comments: Array<{ source, text, rating?, block?, intent?, authorEmail, authorName, language, createdAt }>` (até 50). Resolve email via 3 joins (inline → snapshot → request → lead; beta_feedback → lead; pricing_interest → email direto). Adiciona `topTokens: Array<{ token, count }>` (top 3, calculado em memória com stopwords PT+EN).
2. **`getMarketStudyBlocks`** — adiciona `ratingTotals: Record<1..5, number>`, `ratingDaily: Array<{ day, r1, r2, r3, r4, r5 }>` (1 ponto por dia da janela) e `heatmap: Array<{ block, counts: Record<1..5, number> }>`. Mantém payload antigo para compatibilidade.
3. **`getMarketStudyModal`** — adiciona `daily: Array<{ day, yes, maybe, no, unsure, avgUsefulness }>`. Estende `freeText` com `authorEmail` e `authorName` (join `leads`).
4. **`getPricingInterest`** — adiciona `daily: Array<{ day, sim, talvez, nao, convictionRate }>`. `comments` passa a incluir `createdAt` formatado ISO (já está) e fica pronto para ordenação.

Helper partilhado novo `detectLanguage(text)` em `src/lib/admin/lang-detect.ts` — heurística leve baseada em set de palavras-chave PT vs EN, devolve "pt" | "en" | "other".

Helper `tokenize(texts, { stopwords })` em `src/lib/admin/topics.ts` para o "3 sinais principais".

---

## Componentes novos / partilhados

- `src/components/admin/v2/estudo-mercado/comment-mural.tsx` — usado em Pulso, Emojis por bloco (rodapé) e Modal beta (rodapé). Recebe lista normalizada `Comment[]` + filtros internos.
- `src/components/admin/v2/estudo-mercado/rating-ranking.tsx` — tabela de ranking 1-5 com barra + sparkline.
- `src/components/admin/v2/estudo-mercado/block-heatmap.tsx` — heatmap bloco × emoji.
- `src/components/admin/v2/estudo-mercado/daily-stack-chart.tsx` — wrapper recharts para stacked bar diário (reutilizado por Modal beta e Pricing).
- `src/components/admin/v2/estudo-mercado/donut-chart.tsx` — donut + legenda para intenção/pricing.

Tudo usa tokens semânticos (`--admin-*`), Inter para números (tabular-nums), respeita as cores de paleta: blue #3772E5 (positivo), amber #BA7517 (alerta), neutro `admin-text-secondary`. Sem dark navy, sem slate, sem font-mono em chips public-facing.

---

## Fora de scope

- Sem migração de DB. Não adiciono colunas a `inline_report_feedback` (continua a não ter `lead_id` direto — uso o join via snapshot).
- Sem IA — tokenização e deteção de língua são heurísticas determinísticas.
- Não toco em `/admin/visao-geral` nem nos formulários do site público.

---

## Checkpoints

- ☐ `getMarketStudyPulse` devolve `comments` com email/nome/idioma e `topTokens`.
- ☐ `getMarketStudyBlocks` devolve `ratingTotals`, `ratingDaily` e `heatmap`.
- ☐ `getMarketStudyModal` devolve `daily` e join de email/nome em `freeText`.
- ☐ `getPricingInterest` devolve `daily`.
- ☐ Tab Pulso mostra mural rico + "3 sinais principais" quando ≥10 comentários.
- ☐ Tab Emojis por bloco mostra ranking de votos + heatmap (não parece o Pulso).
- ☐ Tab Modal beta tem gráfico diário stacked + utilidade ao longo do tempo + donuts.
- ☐ Tab Intenção de compra tem gráfico diário + linha de convicção + tabela com hora HH:mm.
- ☐ Filtros idioma (PT/EN/Todos) + origem funcionam no mural.
- ☐ Tipos passam `bunx tsc --noEmit` sem erros.
