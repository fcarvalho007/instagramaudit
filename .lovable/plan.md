## Objetivo
Inserir, no `EditorialIdentityCard`, uma faixa de 3 mini-cards entre a zona macro (gauge + título) e as colunas "O que já funciona / O que limita", replicando o mockup: **Gostos · média**, **Comentários · média** e **Ritmo · semana**, cada um com valor principal + subtítulo qualitativo.

## Dados (já existentes — zero scraping novo)
- `payload.content_summary.average_likes` → média de gostos por post
- `payload.content_summary.average_comments` → média de comentários
- `keyMetrics.postingFrequencyWeekly` → posts/semana (já passado ao card)
- `profile.followers` → para calcular % gostos/seguidores
- Quando algum valor estiver ausente, o respetivo mini-card é omitido (sem placeholders).

## Alterações

### 1. `src/components/report-redesign/v2/overview/editorial-identity-card.tsx`
- Estender `EditorialIdentityCardProps` com `averageLikes?: number` e `averageComments?: number`.
- Adicionar componente interno `MetricsStrip` (3 mini-cards em `grid-cols-1 sm:grid-cols-3 gap-3`):
  - **Gostos** (ícone `Heart`): `formatCompactNumber(avg)` + "por post"; subtítulo `(avg/followers*100).toFixed(2)%` dos seguidores. Se `followers=0`, subtítulo fallback "sem base de seguidores".
  - **Comentários** (ícone `MessageCircle`): valor inteiro + "por post"; subtítulo determinístico por bandas (`<1 → low`, `<5 → medium`, `>=5 → active`).
  - **Ritmo** (ícone `CalendarDays`): `ppw` formatado com vírgula decimal pt-PT + "posts/semana"; subtítulo por bandas (`>7 → excess`, `1–7 → good`, `<1 → low`).
- Inserir entre a Zona macro e a Zona acionável (`px-6 pb-6 -mt-2`).
- Tokens: usar `bg-surface-muted`, `text-content-primary` (valor), `text-content-secondary` (unidade), `text-content-tertiary` (subtítulo). Sem cores hardcoded; ícones em `text-accent-primary` com opacidade leve.
- Tipografia: eyebrow Inter uppercase para o label, valor em Inter SemiBold `tabular-nums`, subtítulo `text-xs`. Sem JetBrains Mono (regra do projeto).

### 2. `src/components/report-redesign/v2/report-overview-block.tsx`
- Passar `averageLikes={payload?.content_summary?.average_likes ?? undefined}` e `averageComments={payload?.content_summary?.average_comments ?? avgComments}` (já existe `avgComments` calculado a partir de `enriched.topPosts` como fallback).

### 3. i18n (já criadas em `report.json` pt/en sob `identity.metrics`)
Chaves: `likes_label`, `comments_label`, `rhythm_label`, `per_post`, `per_week`, `likes_subtitle`, `likes_subtitle_na`, `comments_{low,medium,active}`, `rhythm_{excess,good,low}`.

## Notas técnicas
- Formatação de números via `formatCompactNumber` (já no projeto) — respeita locale pt/en.
- Percentagem de gostos/seguidores: 2 casas decimais, separador conforme idioma.
- Mobile (375px): grid colapsa para 1 coluna; mini-cards mantêm padding `p-4` consistente com os restantes cards do Bloco 1.
- Sem alterações em backend, snapshots ou tipos partilhados.

## Checkpoint
- ☐ Mini-cards aparecem nos perfis com `content_summary` (cache + fresh).
- ☐ Em perfil sem `average_likes` (snapshots antigos), o card de gostos é omitido sem partir layout.
- ☐ Mobile 375px: três cards empilham, sem overflow.
- ☐ Tokens semânticos, zero `slate-*`, zero font-mono.
