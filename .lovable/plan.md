## Objetivo
Simplificar o hero — menos ruído no card de pré-visualização, menos opções no formulário, e dar à preview cara de "ecrã de computador" em vez de tablet.

## Alterações

### 1. `src/components/landing/hero-report-preview.tsx`
**Remover:**
- Badge `scoreCaption` ("Preview · Dados ilustrativos") no canto superior direito do header.
- Toda a tira de chips temporais (chip activo "Últimas 12 publicações" + 4 chips bloqueados 30/60/90/365 dias). A linha inteira sai porque sem os bloqueados o chip activo fica órfão. *(Confirmar: a instrução cita "60 dias / 90 dias"; assumo remoção total da tira para ficar realmente simples — se quiseres manter 30 e 365, digo.)*
- KPI `costPerPost` ("Custo/post 134"). Passa a haver **2 KPIs** em grid de 2 colunas (em vez de 3).

**Renomear KPIs (i18n):**
- `engagement`: "Engagement" → **"Taxa de Engagement"** (EN: "Engagement rate")
- `frequency`: "Posts/sem" → **"Frequência de Publicação"** (EN: "Posting frequency")

**Transformar em chrome de desktop ("computador"):**
- Substituir o header actual por uma barra de janela tipo browser:
  - 3 traffic-light dots à esquerda (vermelho/amarelo/verde, semânticos só visualmente)
  - Pill central com URL fake `auditprofiles.com/report/preview` (Inter, tabular, `text-xs`, cor `--hero-fg-subtle`)
  - Sem badge à direita
- Borda exterior ligeiramente mais espessa (1.5px) e raio mantido em `rounded-2xl`; sombra inalterada.
- Mantém o glow ambiente e o fade mask em mobile.

### 2. `src/components/landing/hero-action-bar.tsx`
- **Remover** o botão "Adicionar até 2 concorrentes para comparar" e todo o bloco de progressive reveal (`competitorsOpen`, inputs `competitor1`/`competitor2`, validação `competitorError`). O submit deixa de enviar `competitors` — `pendingNav.competitors` passa a `[]` sempre, a navegação para `/analyze/$username` deixa de incluir `search.vs`.
- **Substituir** o `personalHint` (texto longo sobre perfis pessoais) por uma linha curta de dois itens com check icon:
  - "Oferta de 2 relatórios grátis"
  - "Acesso apenas a dados públicos"
  
  Render como pequena lista inline (mesma família visual da trust row do hero), `text-xs`, cor `--hero-fg-subtle`.

  *Nota:* a trust row do `HeroSection` ("2 relatórios grátis · Só dados públicos · Conta gratuita") fica **duplicada** com esta nova linha. Proposta: **remover a trust row do `HeroSection`** já que a nova micro-linha por baixo do input cobre a mesma promessa de forma mais próxima do CTA. Confirma se queres isto ou se preferes manter as duas.

### 3. `src/i18n/locales/pt/landing.json` e `.../en/landing.json`
- `hero.previewMock`: remover `scoreCaption`, `sampleActive`, `windowsLocked.*`. Renomear `kpis.engagement` e `kpis.frequency`. Remover `kpis.costPerPost`. Adicionar `previewMock.urlBar` = `"auditprofiles.com/report/preview"`.
- `actionBar`: remover `addCompetitors`, `competitorsLabel`, `remove`, `competitor1Placeholder`, `competitor1Aria`, `competitor2Placeholder`, `competitor2Aria`, `errors.competitorInvalid`, `personalHint`. Adicionar `trustInline.freeReports` = `"Oferta de 2 relatórios grátis"` / `trustInline.publicData` = `"Acesso apenas a dados públicos"`.
- Se confirmares a remoção da trust row do hero, eliminar também `hero.trust.*`.

## Risks
- Onboarding modal espera só `handle` — sem `competitors` é seguro, sem regressão de comportamento.
- Remover `competitorInvalid` exige limpar import/uso. Sem impacto fora do hero.
- O analyze route aceita ausência de `?vs=` (já é o caso quando o user não abre concorrentes).
- Mudar grid de 3 para 2 colunas pode reduzir densidade visual da preview — compensado pela barra de browser que ocupa mais "peso" no topo.

## Validation
- `bunx tsc --noEmit`
- Verificação visual 1440×900 e 390×844 (chrome de browser não estoura em mobile)
- Submeter handle válido → onboarding modal abre, sem `?vs=` na navegação subsequente

## Checkpoint
☐ Confirmar: remover **toda** a tira de chips temporais (não só 60/90)?
☐ Confirmar: remover a trust row do `HeroSection` (evitar duplicação com a nova micro-linha sob o input)?
☐ Confirmar copy PT/EN dos novos KPIs e da micro-linha?
