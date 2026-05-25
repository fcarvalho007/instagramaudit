## Avaliação visual — /analyze/$username

Foco exclusivo em refinamentos de **design** (hierarquia, densidade, ritmo, tipografia, cor, tokens). Sem alterações a lógica de dados, providers ou copy estrutural.

Auditei `report-shell-v2.tsx`, `report-overview-block.tsx`, `editorial-identity-card.tsx`, `report-block-section.tsx`, `report-hero-v2.tsx` e os tokens (`tokens-light.css`, `report-tokens`). Identifiquei 8 áreas com retorno visual alto e baixo risco.

---

### 1. Hero do relatório — densidade e hierarquia

**Problema:** Hero acumula avatar, handle, métricas, fonte, datas, ações e badges no mesmo plano visual. KPIs grandes competem com o nome do perfil.

**Refinamento:**
- Reduzir KPI font-size em ~10% e aumentar peso do nome/handle (Fraunces 600 → 700).
- Separar metadata (fonte, snapshot date, expires) numa linha terciária com `.text-eyebrow-sm` + `text-content-tertiary`.
- Espaço vertical entre identidade e KPIs: `gap-8 → gap-10` em desktop.
- Botões de ação alinhados à direita com `gap-2` em vez de empilhados.

---

### 2. Bloco 01 · Editorial Identity Card

**Problema:** Após restauro, o card tem 3 zonas (gauge, métricas, sinais) com pesos visuais semelhantes. Falta hierarquia clara entre "pontuação" (verdict) e "evidência" (métricas/sinais).

**Refinamento:**
- `ScoreGauge` ganha mais respiração: card lateral próprio com `bg-surface-muted/40` em vez de inline.
- `MetricsStrip` em grid 3-col com divisores verticais `border-r border-border-default/40` em vez de gap puro — leitura de "tabela" em vez de "cartões soltos".
- `BulletColumn` strengths/limits com ícone alinhado ao topo (não centrado), bullets com `leading-relaxed` e padding interno reduzido `p-5 → p-4`.
- Tom: trocar `bg-tint-success`/`bg-tint-warning` por `border-l-2` colorida + fundo branco — coerente com estética Iconosquare clean.

---

### 3. Section frames — ritmo entre blocos

**Problema:** `ReportFramedBlock` repete o mesmo cartão branco em todos os blocos. Sem variação tonal, os 6 blocos viram uma parede uniforme.

**Refinamento:**
- Aplicar `tone` alternada já existente (canvas / soft-blue) mas com diferença mais percetível: `soft-blue` ganha border `border-accent-primary/15` + tint de fundo `#F4F7FE`.
- Espaçamento entre `ReportBlockSection`: aumentar `pt-12 → pt-16` em desktop.
- Cada section ganha um divisor horizontal subtil `border-t border-border-default/60` no topo, com o número/título do bloco "encavalitado".

---

### 4. Sidebar de navegação dos blocos

**Problema:** Sidebar tem boa estrutura mas estados ativo/inativo são pouco distintos.

**Refinamento:**
- Item ativo: barra lateral esquerda `border-l-2 border-accent-primary` + `bg-accent-primary/5` + `text-content-primary font-semibold`.
- Item inativo: `text-content-secondary` sem fundo.
- Avatar+handle no topo da sidebar: aumentar avatar para 48px, handle em Fraunces 18px.
- Sticky offset: garantir `top-24` para não colar ao header.

---

### 5. Tipografia de métricas e KPIs

**Problema:** Algumas métricas usam tamanhos próximos demais; valores e labels misturam-se.

**Refinamento (sem tocar em tokens globais, só uso):**
- Valor da métrica: `text-2xl md:text-3xl font-semibold tabular-nums`.
- Label: `.text-eyebrow-sm text-content-tertiary mt-1` (uppercase, tracking).
- Variação contextual (∆ vs benchmark): `text-xs font-medium` com cor `signal-success` ou `signal-warning`, nunca neon.
- Garantir `tabular-nums` em **todos** os números públicos (auditar `MetricsStrip`, `report-kpi-grid-v2`, `report-overview-cards`).

---

### 6. Insight boxes (AIInsightBox)

**Problema:** Insights aparecem após cada chart com o mesmo peso visual que o chart — competem pela atenção.

**Refinamento:**
- `AIInsightBox` ganha tratamento "anotação editorial": fundo `surface-muted/60`, border-left 2px na cor de ênfase, ícone discreto, padding `p-4` em vez de `p-6`.
- Tipografia: `text-sm leading-relaxed text-content-secondary` (não primary).
- Margem superior reduzida `mt-4 → mt-3` para colar mais ao chart que comenta.

---

### 7. Methodology / footer pós-blocos

**Problema:** `ReportMethodology` aparece sem separação clara dos 6 blocos.

**Refinamento:**
- Wrap em `bg-surface-muted` full-bleed com `py-16`.
- Heading em Fraunces, body em Inter `text-sm text-content-secondary`.
- Disclaimers e fontes em grid 2-col em desktop.

---

### 8. Mobile (375–414px)

**Problema:** Tabs sticky no mobile + hero geram muito chrome antes do primeiro conteúdo.

**Refinamento:**
- `ReportBlockTopTabs`: reduzir altura para `h-12`, fontes `text-xs`, scroll horizontal com fade nos lados.
- Hero mobile: empilhar KPIs em grid 2x2 com `gap-3`, esconder metadata terciária atrás de um disclosure.
- `ReportFramedBlock`: padding lateral `px-4` em mobile (atualmente `px-5/6`).

---

### Detalhes técnicos (para a fase build)

Ficheiros a tocar (apenas presentation):
- `src/components/report-redesign/v2/report-hero-v2.tsx`
- `src/components/report-redesign/v2/overview/editorial-identity-card.tsx`
- `src/components/report-redesign/v2/report-block-section.tsx`
- `src/components/report-redesign/v2/report-block-nav.tsx`
- `src/components/report-redesign/v2/report-overview-cards.tsx` / `report-kpi-grid-v2.tsx`
- `src/components/report/ai-insight-box.tsx`
- `src/components/report-redesign/report-framed-block.tsx`
- `src/components/report-redesign/report-methodology.tsx`

Regras a respeitar:
- Tokens semânticos apenas (`content-*`, `surface-*`, `border-*`, `accent-*`, `signal-*`). Sem hex inline.
- Fonts: Fraunces (H1/H2 editoriais) + Inter (tudo o resto). Nada de JetBrains Mono em UI pública.
- Sem mexer em `/report.example` (locked).
- Sem alterar componentes locked nem lógica de `snapshot-to-report-data`.
- Mobile-first; testar 375px e 1366px.

---

### Como queres avançar?

Posso aplicar os 8 refinamentos numa única passagem, ou **fasear por prioridade**:
- **Fase A (alto impacto):** 1 (Hero) + 2 (Bloco 01) + 3 (Ritmo entre blocos).
- **Fase B (polimento):** 4 (Sidebar) + 5 (Tipografia métricas) + 6 (Insights).
- **Fase C (responsivo + fecho):** 7 (Methodology) + 8 (Mobile).

Recomendo **faseado A → B → C** para conseguires validar visualmente entre fases. Diz-me se aprovas tudo, só a Fase A, ou se queres ajustar prioridades.
