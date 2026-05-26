
## Objetivo

Concluir o Bloco 1 com refinamentos pontuais de UX/visual no novo `IndexBlock`. Sem novas features, sem dados inventados, sem mexer no resto do card.

## Refinamentos

### 1. Visual do "Como foi calculado"
- Trocar o `<details>` com border discreto por uma versão com **fundo `bg-surface-muted/50`** quando aberto (alinha com o estilo do mockup, que mostra o painel num bloco visualmente destacado).
- Ícone chevron passa a rodar com `transition-transform duration-200` (já está, mas confirmar timing).
- Padding interno mais generoso (`px-3.5 py-3` em vez de `px-3 py-2`) para respirar.

### 2. Régua de estágios — micro-polish
- Alinhamento vertical das labels com os segmentos da barra: usar `justify-around` em vez de `justify-between` para centrar cada label no segmento correspondente (atualmente as duas pontas tocam o topo/fundo, criando desalinhamento visual com a barra).
- Aumentar altura mínima da barra para 96–112px (atualmente herda altura do conteúdo das labels) para dar peso visual.
- Marcador "esta marca · 41" passa a usar o glyph `▸` separado por classe para não quebrar com fontes sem esse caractere — usar `<span aria-hidden>▸</span>` + texto, e cair para `›` em ambientes sem suporte.

### 3. Microcopy pt-PT — afinar tom
- Subtítulo "abaixo": passar de "{pp} pp abaixo da referência de envolvimento do escalão" para **"{pp} pp abaixo do envolvimento típico do escalão"** (menos jargão, mais legível).
- Subtítulo "acima": idem, "acima do envolvimento típico do escalão".
- Micro-linha: passa de "Índice comparativo, construído a partir de 3 sinais do perfil." para **"Índice comparativo, calculado a partir de 3 sinais observados no perfil."** (verbo mais preciso — não "construído"; reforça "observados", que casa com a postura editorial honesta).
- Espelhar em en.

### 4. Estados-limite
- Se `value === 0` ou se faltam scores válidos (e.g. perfil sem posts): mostrar `—` em vez de `0` e ocultar a régua. Hoje renderiza `0` o que sugere falsamente "pior leitura possível".
- Se `tier === null` E `postsAnalyzed` ausente E `cadenceWindowDays` ausente: ocultar a linha de "amostra" no painel de método (em vez de mostrar um separador vazio com `· · ·`).

### 5. Acessibilidade
- Adicionar `aria-expanded` controlado ao `<summary>` via `useState` (o `<details>` nativo não expõe `aria-expanded` aos screen readers em alguns motores).
- `aria-label` da régua passa a incluir o estágio em pt/en, não a chave técnica (`progress`).

### 6. QA visual
- Capturar screenshot do card em desktop (1280px) e mobile (375px) via browser tools.
- Verificar que a coluna esquerda não rebenta com `min-w-0` do `<div className="flex-1 ...">` à direita.
- Confirmar que o `<details>` colapsa/expande corretamente sem layout shift no veredicto à direita.

## Ficheiros tocados

- `src/components/report-redesign/v2/overview/editorial-identity-card.tsx` (só `IndexBlock`)
- `src/i18n/locales/pt/report.json` e `.../en/report.json` (ajustar microcopy)

## Fora de scope

- Sinal de consistência (Fase 3).
- Mediana de escalão real (Fase 3).
- Veredicto, MetricsStrip, bullets.
- Backend.

## Checkpoint

☐ Painel "Como foi calculado" com `bg-surface-muted/50` quando aberto
☐ Régua com `justify-around` e altura mínima 96–112px
☐ Microcopy "envolvimento típico do escalão" em pt + en
☐ `value === 0` → renderiza `—` e oculta régua
☐ Linha de amostra ausente quando os três campos faltam
☐ `aria-expanded` controlado no toggle do método
☐ Screenshots desktop + 375px verificados
