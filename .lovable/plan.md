
# Redesenhar Hero V2 para o mockup

O mockup mostra um hero card compacto e horizontal com 3 zonas claras, diferente do layout vertical atual.

## Diferenças mockup vs. atual

| Zona | Mockup | Atual |
|---|---|---|
| **Esquerda** | Avatar + @handle + nome + badges (INSTAGRAM, Ativo) + bio + data + "12 posts / 29 dias" | Avatar + handle + nome + bio (vertical, sem data inline) |
| **Centro** | 4 KPIs: Seguidores, **Taxa de Engagement** (PRINCIPAL, mid-tier badge), **+X% vs benchmark**, Publicações | 3 KPIs: Seguidores, Publicações, A seguir (sem engagement nem benchmark) |
| **Direita** | RELATÓRIO label + 3 botões stacked: Exportar PDF (primário), Partilhar, Configurar | Ícones pequenos no top bar |
| **Footer** | Comparar concorrentes PRO · Facebook/TikTok/YouTube EM BREVE · data | Comparar concorrentes como cards separados abaixo do hero |

## Alterações planeadas

### 1. `report-hero-v2.tsx` — Reestruturação do layout

- **Layout 3 colunas** (md+): perfil (flex-1) | métricas (4 KPIs centrados) | ações (shrink-0)
- **KPIs novos no centro**: Seguidores, Taxa de Engagement (com label "PRINCIPAL" e badge "mid-tier: X,XX%"), Delta vs Benchmark (+X%), Publicações
- **Ações na direita**: Label "RELATÓRIO", botão primário "Exportar PDF", botão outline "Partilhar", botão outline "Configurar" (ou settings link)
- **Metadata inline** abaixo do bio: ícone calendário + data, "12 posts / 29 dias" em verde
- **Footer integrado**: linha com "Comparar com concorrentes PRO →" à esquerda e "Facebook · TikTok · YouTube EM BREVE" à direita + data

### 2. `report-shell-v2.tsx` — Integrar footer no hero

- Mover o `ComparisonHeader` para dentro do hero card como footer, em vez de ser um componente separado
- Simplificar: linha única compacta em vez de 2 cards

### 3. Dados

- Aceder a `result.data.keyMetrics.engagementRate`, `.engagementBenchmark`, `.engagementDeltaPct` diretamente no hero
- Calcular tier label a partir de `result.data.keyMetrics.engagementBenchmark` (ex: "mid-tier: 5,10%")

## Ficheiros a alterar

1. `src/components/report-redesign/v2/report-hero-v2.tsx` — layout principal
2. `src/components/report-redesign/v2/report-shell-v2.tsx` — mover ComparisonHeader para dentro do hero

## Ficheiros que NÃO são tocados

- Rotas (locked), tokens, PDF pipeline, Supabase schema, `comparison-header.tsx` (mantido como está, só muda onde é rendered)

## Validação

- `bunx tsc --noEmit`
- `bunx vitest run`
- Screenshot visual do hero a 1460px
