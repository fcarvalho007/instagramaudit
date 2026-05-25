## Mudanças

### 1. `src/components/report-tier/tier-copy.ts`
Remover o item `"Exportação em PDF (em breve)"` da lista `comparison.columns.complete.items`. A exportação PDF não é parte estável da oferta paga; promete uma feature que não existe. Os restantes 5 itens da coluna mantêm-se.

### 2. `src/components/report-redesign/v2/overview/comparison-header.tsx`
Remover o badge "EM BREVE" do card "Adicionar outra rede" (linhas 93–96 — `<span>` decorativo roxo). O título continua a ler "Adicionar outra rede" + subtítulo "Facebook · TikTok · YouTube"; o `RoadmapInfoDialog` já explica o contexto ao clicar. Não substituir por outro badge — neste card o "em breve" não acrescenta valor e cria ruído na zona acima do gate. As chaves i18n `comparison.roadmap_card_badge` ficam órfãs mas são inofensivas; deixá-las (fora de âmbito limpar i18n não consumido).

Nota: este card **não** está no Block 1 público — está na barra auxiliar abaixo do `EditorialIdentityCard`. O badge a remover é apenas o "Em breve / Coming soon" do card de roadmap multi-rede. Não há outro "EM BREVE" no Block 1.

### 3. `src/components/report-enriched/report-enriched-competitors-cta.tsx`
- `title="Disponível em breve"` → `title="Disponível nas secções premium."`
- Texto do botão: `{ENRICHED_COPY.competitorsCta.cta} · em breve` → apenas `{ENRICHED_COPY.competitorsCta.cta}`.
- Adicionar um pequeno `<span>` neutro à direita / abaixo do CTA com `Disponível nas secções premium.` (texto, não badge promocional) para manter o sinal de "premium" sem prometer datas.
- Sem alterações em `ENRICHED_COPY` (campo `cta` continua "Adicionar concorrentes").
- Componente é renderizado em `report-shell.tsx` e `report-shell-v2.tsx` em variantes públicas — confirmado por grep.

### 4. `src/routes/app.reports.$id.tsx` (linhas 312–322)
- `aria-label="Regenerar PDF — funcionalidade disponível em breve"` → `aria-label="PDF indisponível neste momento"`.
- Texto do botão `Regenerar PDF — em breve` → `PDF indisponível neste momento`.
- Botão permanece `disabled` / `aria-disabled`. Sem outras mudanças (mensagens de `pdf_status` ficam como estão — descrevem estado real do snapshot, não promessa).

## Fora de âmbito

OpenAI, Apify, DataForSEO, cache, schemas, pricing logic, lead magnet, gates, checkout, sidebar admin, sidebar report, páginas legais, Block 2 (mantém-se como launch offer), Blocks 3–6 (mantêm-se premium/locked).

## i18n

Apenas o componente já internacionalizado (`comparison-header.tsx`) usa i18n; nada a mudar lá (apenas removo o JSX do badge). Os outros 3 ficheiros tocados são PT-only no estado actual — não introduzo i18n nova.

## Validação

- `bunx tsc --noEmit` verde.
- `bunx vitest run` verde.
- `rg -n "em breve|Em breve|EM BREVE|Coming soon|Regenerar PDF"` nos 4 ficheiros alterados → 0 ocorrências.
- Manual: report público sem badge "Em breve" no Block 1; CTA de concorrentes diz "Disponível nas secções premium"; coluna "Leitura completa" sem PDF; `/app/reports/$id` mostra "PDF indisponível neste momento".