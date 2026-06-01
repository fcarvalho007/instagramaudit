## Objetivo

Refinar o card **Frequência de publicação**: calendário sempre visível com células retangulares (mais compacto), e corrigir a linguagem do bloco "Ritmo por dia da semana" para tom de analista terceiro (sem "tu", sem "Concentras-te").

## Ficheiros a tocar

- `src/components/report-redesign/v2/overview/frequency-card.tsx`
- `src/i18n/locales/pt/report.json`
- `src/i18n/locales/en/report.json`

## 1 · Calendário sempre visível + células retangulares

`src/components/report-redesign/v2/overview/frequency-card.tsx`:

- **Remover o toggle**: apagar o estado `const [calendarOpen, setCalendarOpen] = useState(false)`, o `<button>` com `Esconder/Mostrar` (linhas ~648–675) e o wrapper `{calendarOpen && (...)}`. O cabeçalho do calendário (eyebrow `CALENDÁRIO · 30 DIAS` + sub-linha `X dias com publicação`) passa a ser um simples `<div>` não-interativo.
- **Células retangulares**:
  - Cells dos dias: trocar `aspect-square` por `aspect-[5/3]` (~h ≈ 60% da largura), mantendo `rounded-md` e os mesmos `gap-1 md:gap-1.5`. Padding cells idem.
  - Mantém os 7 dias por linha (grid alignment semanal preservado — os "buracos" no início/fim ficam como padding vazio, como já está, porque sem esses padding o calendário deixa de ler como calendário). Resultado: a grelha encolhe verticalmente ~40% sem sacrificar a leitura semanal.
- **Manter** legenda (sem post / 1 post / 2 posts) e cabeçalhos dos dias da semana.
- **Limpar i18n não utilizado**: as chaves `frequency.calendar.toggle_show` e `frequency.calendar.toggle_hide` deixam de ser referenciadas — removo-as do PT e EN.

## 2 · Linguagem agnóstica (analista, não 2ª pessoa)

Princípio: somos uma ferramenta de diagnóstico externa. Não tratamos por "tu", não assumimos que o leitor é o gestor do perfil. Reportamos o que os dados mostram.

`weekly_rhythm.interpretation_*` — reescrita em PT e EN:

PT (atual → novo):
- `interpretation_with_quiet_one`:
  `"Concentras-te à <b>{{peak}}</b>. <b>{{quiet}}</b> é o vazio — esteve {{count}} dia sem publicação."`
  → `"Publicação concentrada à <b>{{peak}}</b>. <b>{{quiet}}</b> é o ponto mais fraco — {{count}} dia sem publicação."`
- `interpretation_with_quiet_other`:
  `"Concentras-te à <b>{{peak}}</b>. <b>{{quiet}}</b> é o vazio — esteve {{count}} dias sem publicação."`
  → `"Publicação concentrada à <b>{{peak}}</b>. <b>{{quiet}}</b> é o ponto mais fraco — {{count}} dias sem publicação."`
- `interpretation_peak_only`:
  `"Concentras-te à <b>{{peak}}</b>. Os restantes dias estão equilibrados."`
  → `"Publicação concentrada à <b>{{peak}}</b>. Restantes dias da semana equilibrados."`
- `interpretation_uniform`: já está em tom impessoal, mantém.

EN (atual → novo):
- `interpretation_with_quiet_one`:
  `"You concentrate on <b>{{peak}}</b>. <b>{{quiet}}</b> is the void — {{count}} day without posts."`
  → `"Posting concentrated on <b>{{peak}}</b>. <b>{{quiet}}</b> is the weak point — {{count}} day without posts."`
- `interpretation_with_quiet_other`:
  → `"Posting concentrated on <b>{{peak}}</b>. <b>{{quiet}}</b> is the weak point — {{count}} days without posts."`
- `interpretation_peak_only`:
  → `"Posting concentrated on <b>{{peak}}</b>. Remaining weekdays are balanced."`
- `interpretation_uniform`: mantém.

## Fora de scope (sinalizar, não corrigir agora)

Vi outras strings com 2ª pessoa pelo relatório (`Esta leitura foi útil?`, `Obrigado pelo teu sinal.`, `O teu clique ajuda…`, `Guarda a tua visão geral…`, `Continuar a explorar`). **Não toco neles neste prompt** — o pedido foca-se no card de frequência. Posso abrir um prompt seguinte com uma varredura completa pt-PT/EN para tom de analista agnóstico, se aprovares.

## Checkpoint

- ☐ Aprovas remover por completo o toggle "Esconder" (calendário sempre visível)?
- ☐ Aprovas células `aspect-[5/3]` (retangulares horizontais), mantendo a grelha de 7 colunas por semana?
- ☐ Aprovas a reescrita "Publicação concentrada à <Sexta>. <Quarta> é o ponto mais fraco — 4 dias sem publicação."?
- ☐ Passar a Build Mode?
