# UX Experience 11A.1 — Cinematic Interaction & Form Audit (read-only)

Auditoria feita sobre o código real das superfícies de interacção. Nenhum ficheiro de produto foi alterado.

## A. Experience Scorecard

Escala: 1 (fraco) a 5 (excelente).

| Superfície | Clareza | Estética | Flow | Confiança | Diferenciação | Classificação |
|---|---|---|---|---|---|---|
| HeroActionBar | 5 | 4 | 5 | 4 | 4 | GOOD |
| AnalysisSkeleton | 4 | 5 | 4 | 4 | 5 | EXCELLENT |
| LoadingQualification | 4 | 3 | 4 | 4 | 2 | GOOD |
| ProfileRelationshipField / GridSelectField | 4 | 3 | 4 | 4 | 2 | GOOD |
| ConversionSheet desktop | 4 | 3 | 3 | 4 | 1 | GENERIC |
| ConversionSheet mobile | 4 | 3 | 3 | 4 | 1 | GENERIC |
| Estados form/submitting/done/error | 3 | 3 | 2 | 3 | 1 | INCONSISTENT |
| CheckoutAccountGate | 3 | 3 | 1 | 3 | 1 | FRICTION |
| OnboardingModal (checkout) | 2 | 3 | 1 | 3 | 1 | FRICTION |
| ReportPlanChooser | 3 | 4 | 2 | 3 | 2 | FRICTION |
| ReportPriorityForm | 4 | 4 | 2 | 3 | 3 | FRICTION |
| HumanDiagnosisUpsell | 4 | 5 | 2 | 2 | 4 | INCONSISTENT |
| BillingForm | 3 | 2 | 2 | 3 | 1 | GENERIC |
| OrderSummary | 4 | 3 | 4 | 4 | 1 | GOOD |
| CTA de pagamento | 5 | 4 | 4 | 5 | 3 | GOOD |
| PostPurchaseSuccessPanel | 3 | 3 | 3 | 2 | 1 | INCONSISTENT |

## B. Momentos genéricos

1. **ConversionSheet** — `DialogContent` shadcn cru (`sm:max-w-md`, backdrop `bg-black/80`, zoom-95 + slide-from-top, radius `sm:rounded-lg`). É o momento comercial mais importante do percurso gratuito e não tem qualquer sinal de identidade AuditProfiles: nenhum enquadramento do handle analisado, nenhum eco visual do relatório por trás, nenhum tratamento de superfície próprio.
2. **BillingForm** — `<input>` nativo com classes ad-hoc, fora do primitive `Input`, com focus ring diferente do resto do produto (`focus:ring-accent-primary/30` em vez do `focus-visible:ring-accent-luminous` do design system) e sem `focus-visible`.
3. **StepActions** — três ecrãs seguidos com o mesmo par "Voltar / Continuar". Nada indica progresso comercial nem consequência.
4. **PostPurchaseSuccessPanel** — painel de texto estático. O momento de maior recompensa do produto não tem qualquer revelação.
5. **Backdrop `bg-black/80`** em Dialog e Sheet: opaco e neutro, corta a ligação visual ao relatório que motivou a acção.

## C. Momentos já premium

1. **AnalysisSkeleton** — o "liquid analytics loader" (7 barras com gradientes, glow, droplets, fases sequenciais, `liq-phase-in`) tem assinatura real, respeita `prefers-reduced-motion` com fallback de escala estática, e anuncia progresso a leitores de ecrã (`sr_progress`, `aria-live="polite"`). É o melhor momento do produto.
2. **HeroActionBar** — micro-label + glifo Instagram + seta, barra branca com sombra profunda sobre fundo escuro, respiração de 4s desactivada em mobile e sob reduced-motion. Hierarquia correcta: um único campo, uma única acção.
3. **HumanDiagnosisUpsell** — bloco escuro/claro em duas metades, ancoragem 97€ vs 149€, tipografia Fraunces. Visualmente é o objecto mais bem resolvido do checkout (o problema é comercial e de posição, não estético).
4. **GridSelectField** — radios reais com `sr-only peer`, anel `peer-focus-visible`, alvos de 62–84 px. Comportamento acessível correcto.

## D. Fricções

1. **CheckoutAccountGate + OnboardingModal (P0).** Confirmado em 11A: o Estado B tem `report_capture_session` mas não `lead_session`, logo o gate dispara e volta a pedir email + nome + password. Do ponto de vista narrativo, o produto reinicia: o utilizador passa de "estou a desbloquear o meu relatório" para "estou a criar uma conta". É a maior quebra de flow do produto.
2. **Passo 1 reabre a decisão de preço.** O utilizador clicou "Desbloquear Análise Pro (9€)" e o primeiro ecrã do checkout mostra três preços, um deles 8× superior, com badge "Melhor valor" a apontar para fora da decisão que ele acabou de tomar. Seguido de `ConfirmUnlockCard` que repete os 6 benefícios já lidos no Pro Gate.
3. **Passo 2 bloqueante sem contrapartida.** `nextDisabled={reportGoals.length === 0}` obriga a uma escolha que não altera o relatório entregue (metadata apenas).
4. **Passo 3 interrompe a compra com outra compra.** O upsell substitui o produto (`setSelectedProduct`), muda o `return_path` e descarta packs escolhidos. A copy diz "Relatório completo incluído"; o sistema faz substituição.
5. **BillingForm pede morada/CP/localidade** a um consumidor de 9€, com regex de CP exclusivamente português, e pede o email do zero quando o servidor já conhece `leads.email`.
6. **ConversionSheet — transição form → done.** O corpo é substituído inteiro sem transição; em desktop o foco salta para um `div tabIndex={-1}`, em mobile não salta de todo. O utilizador acabou de submeter e a superfície muda de assunto (aparece uma pergunta nova de relação) sem transição nem hierarquia de "primeiro a confirmação, depois o extra".
7. **Estado de erro do ConversionSheet** volta a `phase: "form"` sem devolver foco ao campo de email — em mobile o erro pode ficar fora do viewport com o teclado aberto.
8. **PostPurchaseSuccessPanel afirma "Relatório desbloqueado"** apenas com base em `?status=success`, antes da confirmação do webhook. Com Multibanco isto pode ser falso durante horas.
9. **`window.location.assign`** no botão de sucesso força reload completo em vez de navegação de router — perde-se a continuidade percebida.

## E. Motion opportunities

Inventário actual:

| Elemento | Trigger | Duração | Easing | Finalidade | Veredicto |
|---|---|---|---|---|---|
| `hero-bar-breathe` | permanente (≥640px) | 4 s loop | ease-in-out | atrair olhar ao input | manter |
| `hero-hint-arrow` | permanente | CSS hero-dark | — | apontar ao campo | manter |
| Loader `liq-*` (bar/droplet/shimmer/glow) | loading | 3–3.2 s loop | ease-in-out | vida durante espera | manter |
| `liq-phase-in` | mudança de fase | 400 ms | ease-out | progressão narrativa | manter |
| Dialog open/close | abertura | 200 ms | default | entrada | refinar (zoom-95 + duplo slide = stacking) |
| Sheet open/close | abertura | 500 / 300 ms | ease-in-out | entrada | refinar (500 ms é lento para bottom sheet) |
| `GridSelectField` | selecção | 150 ms `transition-colors` | default | feedback | refinar (só cor muda) |
| `ReportPlanChooser` / `ReportPriorityForm` | selecção | `transition` / `transition-all` sem duração | default | feedback | refinar (duração indefinida) |
| `Loader2 animate-spin` | submitting | contínuo | linear | espera | manter |
| Transição de passo do checkout | `setStep` | **nenhuma** | — | — | oportunidade |
| form → done no ConversionSheet | submit | **nenhuma** | — | — | oportunidade |
| LoadingQualification entrada | +3 s | **nenhuma** (aparece de golpe) | — | — | oportunidade |
| Sucesso de pagamento | mount | **nenhuma** | — | — | oportunidade |

Oportunidades por ordem de valor:
1. Entrada da `LoadingQualification` — fade + rise de 8 px, 250 ms, para não interromper o loader.
2. `form → done` no ConversionSheet — cross-fade curto (180 ms) + o bloco de confirmação a entrar primeiro, a pergunta de relação 120 ms depois.
3. Transição de passo do checkout — deslize horizontal curto (200 ms), direccional (avanço/recuo).
4. Sucesso de pagamento — uma revelação única (checkmark que desenha + título), 350 ms, uma só vez.
5. Selecção de choice control — mudança de estado com sombra/escala mínima além da cor, ≤150 ms.

Regra transversal: **nenhuma superfície deve ter duas animações a competir**. Se o loader está activo, a qualificação entra sozinha. Se o `done` está a entrar, a pergunta de relação espera.

Falha de cobertura confirmada: `prefers-reduced-motion` está tratado apenas em `hero-dark.css`, `tilt-card`, `scroll-indicator`, `hero-action-bar`, `dark/reveal`, `animated-counter`, `score-orbit-background` e `analysis-skeleton`. **Não existe fallback global** — qualquer motion novo em Dialog/Sheet/checkout tem de trazer o seu próprio.

## F. Modal / Sheet recommendations

| Critério | Estado actual | Recomendação |
|---|---|---|
| Tamanho desktop | `sm:max-w-md` | manter (largura de leitura correcta) |
| Posição | centrado | manter |
| Entrada | zoom-95 + slide-from-left-1/2 + slide-from-top-48% | reduzir a um só vector (fade + rise 8 px) |
| Saída | inverso, 200 ms | 150 ms |
| Backdrop | `bg-black/80` | escurecer menos (≈60 %) e considerar leve blur para manter o relatório visível por trás — reforça "isto é sobre a tua auditoria" |
| Radius | `sm:rounded-lg` | subir para `rounded-2xl`, coerente com os cards do relatório |
| Headline | `font-display text-xl` | acrescentar o handle analisado como eyebrow (endowment honesto) |
| Largura de leitura | ok | manter |
| Espaço vertical | denso mas correcto | manter |
| Close affordance | X do primitive | manter; garantir `aria-label` em pt |
| Foco inicial | desktop 80 ms → email; mobile intencionalmente nenhum | correcto — manter a decisão mobile |
| Escape | nativo Radix | manter |
| Teclado mobile | `max-h-[92dvh]` + `overflow-y-auto`, blur no submit | manter; garantir scroll-into-view do erro |
| Scroll interno | ok | manter |
| Transição entre estados | inexistente | ver E.2 |

**Resposta à pergunta central:** hoje parece um modal genérico de biblioteca. As três alterações que mais mudam esta percepção são o backdrop (deixar ver o relatório), o radius/superfície coerente com os cards, e o handle presente na headline.

## G. Form / field recommendations

- **Informação já conhecida pedida outra vez:** email no `CheckoutAccountGate` (já dado no ConversionSheet) e `invoice_email` no `BillingForm` (o servidor já usa `leads.email` como `customerEmail`). Ambos evitáveis.
- **Placeholder usado como label:** nenhum caso crítico — `HeroActionBar` tem `aria-label`, `ConversionSheet` e `BillingForm` têm label visível. O `HeroActionBar` é o único sem label visível, mas o micro-label acima cumpre a função.
- **Esforço desnecessário:** morada, código postal e localidade obrigatórios para um consumidor de 9€; regex de CP só português bloqueia compradores estrangeiros.
- **Primitives:** `BillingForm` não usa `Input`/`Label`; tem `focus:ring` em vez de `focus-visible:ring` e token de anel diferente do resto do produto.
- **Estados em falta:** nenhum campo tem estado `success`; o `BillingForm` não tem `disabled` durante `submitting` (só o botão fica desactivado); não há `aria-invalid` nem `aria-describedby` nos campos de facturação, ao contrário do ConversionSheet que os faz bem.
- **Autocomplete:** `BillingForm` usa `organization` no campo "Nome ou empresa" — para particulares devia ser `name`. `tax_id` com `autoComplete="off"` está correcto.
- **Touch targets:** `BillingForm` `py-2.5` + `text-base` ≈ 44 px — no limite, aceitável. Botão "Agora não" da qualificação (`text-xs`, sem padding) fica abaixo de 44 px — a corrigir.

## H. Choice-control recommendations

| Controlo | default | hover | focus | pressed | selected | disabled | success |
|---|---|---|---|---|---|---|---|
| relationship (GridSelectField) | ok | ok | anel `peer-focus-visible` ok | ausente | só cor + peso | n/a | n/a |
| plans (ReportPlanChooser) | ok | borda | `focus-visible:ring` ok | ausente | borda + ring + check | n/a | n/a |
| goals (ReportPriorityForm) | ok | borda + fundo | **ausente** (input `sr-only` sem `peer-focus-visible`) | ausente | borda + ring + ícone→check + badge "Principal" | n/a | n/a |
| upsell (HumanDiagnosisUpsell) | botão/link | ok | herdado do Button | ok | n/a (acção imediata) | `disabled` ok | n/a |

Recomendações:
1. Acrescentar anel `peer-focus-visible` ao `ReportPriorityForm` — é o único choice control sem indicação de foco visível.
2. Adicionar estado `pressed` (escala 0.99 ou sombra reduzida, ≤100 ms) aos três controlos.
3. `relationship` seleccionado depende quase só de cor — acrescentar um indicador não-cromático (check discreto no canto, como já faz o plan chooser).
4. Manter o feedback abaixo de 150 ms; hoje o `transition` sem duração explícita no plan chooser e no goals form deixa a duração ao browser.

## I. Microcopy recommendations

Problemas encontrados:
- Sequência `Continuar → Continuar → Continuar → Confirmar e pagar`: os três primeiros não descrevem consequência.
- "Voltar" no passo 1 significa sair do checkout (`backLabel={search.return ? "Voltar" : "Cancelar"}`) — ambíguo.
- "Relatório desbloqueado" antes da confirmação do webhook: promessa que pode ser falsa.
- "Obter relatório completo" (passo 1) vs "Desbloquear Análise Pro" (CTA de origem): muda de vocabulário no primeiro ecrã depois do clique — quebra de continuidade narrativa.

Sugestões (sem inventar acções):
- Passo 1 → **"Ir para pagamento"** (ou fundir com a facturação, como recomendado em 11A).
- Passo 4 → manter **"Confirmar e pagar"** (é o melhor CTA do produto).
- Passo 1 título → **"Desbloquear a Análise Pro"**, alinhado com o CTA de origem.
- Sucesso → **"A confirmar o pagamento"** enquanto o webhook não chega; "Relatório desbloqueado" só depois.
- "Agora não" (qualificação) está bem — honesto e sem culpa. Manter tal e qual.
- ConversionSheet `submit` → deve nomear o que se recebe ("Ver a auditoria completa"), não a acção mecânica.

## J. Signature moments (3–5)

Princípios de design apenas; nada a implementar nesta ronda.

1. **O loader como leitura em curso.** Já é assinatura. Princípio: o loader deve terminar *no* relatório, não ser substituído por ele — a última fase do loader e o topo do relatório devem partilhar o mesmo enquadramento.
2. **A revelação da auditoria (Estado A).** Princípio: o primeiro card deve aterrar antes do resto, com um único movimento de subida, para que o veredicto seja lido primeiro. Uma revelação, não uma cascata.
3. **Protected preview → desbloqueio.** Princípio: o desfoque deve dissolver-se *no sítio*, sem recarregar a secção. O utilizador tem de ver o mesmo objecto a abrir-se, não um objecto novo a aparecer.
4. **A entrada do ConversionSheet.** Princípio: a superfície deve nascer do relatório (backdrop translúcido, o handle presente, o mesmo radius dos cards), não pousar por cima dele.
5. **A confirmação de pagamento.** Princípio: uma marca de confirmação que se desenha uma vez, seguida do regresso ao relatório sem reload. A recompensa é voltar ao objecto, não ler um painel.

## K. Itens que NÃO devem ser alterados

- O loader `liq-*` e a sua estrutura de 4 fases, incluindo o fallback de reduced-motion.
- A decisão de **não** dar foco automático no mobile (ConversionSheet e Sheet) — evita abrir o teclado sem intenção.
- `aria-live="polite"` + `sr_progress` no skeleton.
- A regra de uma pergunta única, não bloqueante, com "Agora não" na qualificação anónima.
- A dedupe de qualificação por handle em `sessionStorage`.
- Marketing opt-in não pré-seleccionado.
- O anel `focus-visible` do `Button` e o padrão `sr-only peer` do `GridSelectField`.
- "Confirmar e pagar" com cadeado.
- A ausência de contadores/urgência artificial em todo o produto.

## L. Gatilhos comportamentais — leitura honesta

| Gatilho | Uso actual | Veredicto |
|---|---|---|
| Curiosity gap | preview de publicações com métricas ocultas e miniaturas desfocadas | bem calibrado — mostra evidência real |
| Commitment / consistency | qualificação no loading precede o pedido de email | bom, mas perde-se no checkout, onde o gate reinicia |
| Endowment | "esta é a tua auditoria" existe no relatório; **ausente no ConversionSheet e no checkout** | oportunidade |
| Specificity | benefícios listados no sheet e no gate Pro | bom |
| Loss of progress | não utilizado | correcto — não introduzir |
| Social/professional proof | não utilizado no funil | correcto enquanto não houver prova real |
| Price anchoring | 97€ vs 149€ no upsell; packs com preço unitário riscado | legítimo, mas o anchoring do upsell aparece no meio de uma compra de 9€ — posição errada, não valor errado |
| Cognitive ease | violado nos passos 1–3 do checkout (3 decisões antes de pagar) | corrigir |

**Nenhum dark pattern detectado.** Sem urgência falsa, sem opt-out escondido, sem consentimento pré-marcado, sem preços enganosos. O único risco de honestidade é o "Relatório desbloqueado" antes da confirmação do webhook — não é manipulação, é uma afirmação prematura, e deve ser corrigida.

## M. Motion scale recomendada (a aplicar mais tarde)

```text
feedback imediato   100–150 ms   ease-out      selecção, pressed, hover
transição de UI     180–240 ms   ease-out      modal, passo, troca de estado
revelação           250–400 ms   ease-out      qualificação a entrar, sucesso, unlock
ambiente            3–4 s loop   ease-in-out   loader, respiração do hero
```

Regras: uma animação por evento; nada acima de 400 ms fora do ambiente; `prefers-reduced-motion` reduz tudo a mudança de estado instantânea, mantendo apenas opacidade.

## N. Design system

| Primitive | Estado |
|---|---|
| Button | usado consistentemente; `CheckoutPrimaryButton` é uma extensão legítima |
| Input | **não usado** no `BillingForm` nem no `HeroActionBar` (este último é intencional — carácter do hero) |
| Checkbox | usado no ConversionSheet; **não usado** no `ReportPriorityForm` (input nativo `sr-only`, aceitável para card-select) |
| radio / choice | três implementações distintas: `GridSelectField`, `ReportPlanChooser`, `ReportPriorityForm` |
| Dialog / Sheet | usados; sem carácter próprio |
| Alert | não usado — erros são `div role="alert"` ad-hoc em três estilos diferentes |

Recomendação: unificar **comportamento** (foco, estados, semântica ARIA, erro) numa base partilhada de choice control e alinhar o `BillingForm` ao primitive `Input`; deixar o **carácter visual** livre por superfície (hero, upsell e loader devem continuar distintos).

## O. Prioridades

**P0 — CONVERSION**
1. Remover o `CheckoutAccountGate` do percurso Estado B (aceitar `report_capture_session`) — já coberto em 11A/O.1.
2. Deixar de afirmar desbloqueio antes da confirmação do webhook.
3. Reduzir a facturação a nome + email pré-preenchido; NIF/morada atrás de "quero factura com NIF".
4. Alinhar vocabulário do passo 1 com o CTA de origem e substituir os "Continuar" genéricos.

**P1 — EXPERIENCE**
5. ConversionSheet com identidade própria: backdrop translúcido, radius 2xl, handle na headline.
6. Transição `form → done` e entrada da `LoadingQualification`.
7. Transição direccional entre passos do checkout.
8. Foco de volta ao campo de email no erro do ConversionSheet, com scroll-into-view em mobile.

**P2 — POLISH**
9. `peer-focus-visible` no `ReportPriorityForm`; estado `pressed` nos três choice controls; indicador não-cromático no relationship.
10. `BillingForm` sobre o primitive `Input`, com `aria-invalid`/`aria-describedby` e `autoComplete="name"`.
11. Reduzir o stacking de entrada do Dialog e encurtar o Sheet de 500 ms para ~240 ms.
12. Alvo de toque do "Agora não".

**LATER**
13. Revelação assinada do sucesso de pagamento e regresso por router (sem `window.location.assign`).
14. Dissolução in-place do protected preview no momento do desbloqueio.
15. Base partilhada de choice control e componente único de erro inline.

READY FOR CHECKOUT CRO + EXPERIENCE IMPLEMENTATION
