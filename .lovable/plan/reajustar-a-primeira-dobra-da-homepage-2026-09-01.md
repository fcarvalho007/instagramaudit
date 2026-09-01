# Reajustar a primeira dobra da homepage

Auditei o hero em 1440, 1280 e 390 px. A dobra tem quatro problemas reais, mais um
desvio de copy face ao que tinha sido decidido antes.

## O que está errado (verificado)

1. **Seta sobre o texto.** A seta cyan está posicionada `absolute -top-7 left-5` por
   cima da barra e cai exactamente em cima do microlabel "INSERIR PERFIL PÚBLICO DO
   INSTAGRAM", atravessando as letras.
2. **Subtítulo numa linha forçada.** O parágrafo tem `lg:whitespace-nowrap`, pelo que em
   desktop se estende muito para lá da largura da barra de input e desalinha o bloco
   esquerdo.
3. **Pré-visualização espremida.** Na coluna direita (`0.9fr`) o cartão fica estreito:
   "37 / 100" quebra em duas linhas e "FREQUÊNCIA DE PUBLICAÇÃO" fica cortado na borda
   direita.
4. **Título e subtítulo invisíveis em mobile.** A 390 px, aos 2,5 s ainda não há título;
   aos 3 s só estão reveladas as três primeiras palavras. A animação por palavra
   (`BlurRevealText`) arranca demasiado tarde e é lenta, deixando a primeira dobra
   praticamente vazia no primeiro instante — foi confirmado com dois snapshots.
5. **Copy revertida.** Está "Analisar gratuitamente" e "Introduz um perfil público e vê
   engagement, conteúdos com melhor desempenho e oportunidades de melhoria.", quando o
   acordado era "Analisar grátis" e "Diagnóstico profissional para melhorar a presença
   digital.".

## Correcções propostas

- **Seta:** mover para depois do microlabel (inline, à direita do texto, com pequena
  rotação para apontar à barra) ou descê-la para dentro da margem entre label e barra,
  garantindo zero sobreposição a 1280/1440.
- **Subtítulo:** remover o `whitespace-nowrap`, limitar a `max-w-[46ch]` e reduzir
  ligeiramente em desktop para caber numa linha natural sem esticar a coluna.
- **Grelha:** passar a `lg:grid-cols-[1fr_0.95fr]` com `gap` maior e dar largura mínima
  ao cartão de pré-visualização, para que o score fique numa linha e os KPIs não sejam
  cortados; validar em 1280, 1440 e 1728.
- **Reveal:** encurtar o stagger (80 ms → 35 ms) e o delay inicial, e garantir que o
  título fica visível quase de imediato em mobile (o subtítulo entra logo a seguir).
  Mantém-se o respeito por `prefers-reduced-motion`.
- **Copy pt/en:** repor "Analisar grátis" / "Analyse for free" e o subtítulo no singular
  "Diagnóstico profissional para melhorar a presença digital." / "Professional
  diagnostics to improve your digital presence.".

## Ficheiros

- `src/components/landing/hero-section.tsx` (grelha, subtítulo, larguras)
- `src/components/landing/hero-action-bar.tsx` (posição da seta)
- `src/components/landing/blur-reveal-text.tsx` (timing do reveal)
- `src/i18n/locales/pt/landing.json` e `src/i18n/locales/en/landing.json` (copy)

Sem alterações a lógica de submissão, analytics, rotas ou ao resto da landing.

## Validação

Screenshots antes/depois em 390, 768, 1280, 1440 e 1728 px, verificação de ausência de
overflow horizontal e de que título, subtítulo, barra e preview estão todos visíveis no
primeiro segundo.
