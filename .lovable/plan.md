
## Contexto

Vou actuar em duas zonas do relatório público (`/analyze/$username`, shell v2):

1. **`BlockFeedback`** (`src/components/report-redesign/v2/feedback/block-feedback.tsx`) — actual: eyebrow "COMO FOI ATÉ AQUI?" + 5 emojis + microcopy "Estamos em beta…". Funciona, mas é plano, sem hierarquia visual nem momento. Aparece a seguir ao bloco Overview.
2. **Fim do relatório free** — neste momento o último bloco (Benchmark ou último visível, conforme variante) termina e segue directamente para `<ReportMethodology />`. Não há fronteira visual nem promessa Premium.

A minha avaliação do print: o bloco actual de feedback está demasiado "form input" — emojis tipo iOS soltos sobre fundo cinza, sem moldura editorial, sem narrativa. Para o tom Iconosquare-meets-editorial do produto, faz sentido transformar este momento numa **pausa cinematográfica** dentro do relatório (não num inquérito).

---

## Parte A — Redesign do `BlockFeedback` (design directions)

Antes de implementar, gero **3 direcções visuais** para a forma idle do componente (estado `idle` — o pedido de opinião). Cada direcção mantém:

- mesma funcionalidade (5 ratings, hover label, comentário pós-clique, estados already/done/comment_sent/error);
- mesma escala/altura aproximada (não invadir os blocos adjacentes);
- paleta e tipografia já bloqueadas no projecto (Fraunces para um possível H eyebrow editorial, Inter para corpo, acentos `--primary` `#3772E5`);
- acessibilidade dos botões (aria-label, focus ring, teclado).

Variam em: composição, moldura/sem moldura, registo emocional, micro-animação, presença de elemento gráfico de pausa (linha, número de capítulo, glyph editorial), peso da microcopy.

Direcções que tenho em mente (a confirmar pelo gerador visual):

- **D1 · Editorial Interlude** — card branco largo com borda subtil, eyebrow "Pausa · pedido editorial", título Fraunces curto ("Como te soou até aqui?"), emojis maiores num "trilho" com baseline, microcopy à direita justificada. Sensação de página de revista.
- **D2 · Cinematic Strip** — faixa de largura total com gradiente muito subtil azul→branco, número grande "·02" em Fraunces à esquerda como marca de capítulo, emojis centrados com glow no hover, label do rating em fade. Sensação de "fim de cena".
- **D3 · Quiet Confidant** — bloco compacto centrado, sem moldura, mas com uma linha fina horizontal acima e abaixo, copy mais íntima ("Diz-nos numa cara."), emojis menores com micro-bounce sequencial à entrada (stagger), label monocromática. Sensação de pergunta pessoal, não de formulário.

Depois de gerar as 3, apresento-as via `ask_questions` (type prototype) e implemento a escolhida directamente no ficheiro do componente, sem mexer na lógica nem nos estados error/success.

Notas:
- A captura enviada cobre o alvo, por isso uso-a como screenshot de referência na geração.
- Não mudo o endpoint `/api/public/inline-feedback` nem o storageKey.
- Mantenho o componente reutilizável para os 4 `block`s (overview, diagnostic, performance, content), mesmo que neste momento só o `overview` esteja a ser renderizado.

---

## Parte B — Marcador de fim do relatório free + teaser Premium

Adiciono um **novo componente `ReportEndOfFreeBlock`** em `src/components/report-redesign/v2/end-of-free-block.tsx`.

Objectivos:
- Dar uma sensação clara de "fim do capítulo público" (não um CTA agressivo).
- Comunicar que há mais (Premium) mas marcado como **"em desenvolvimento"** — sem botão de pagamento, sem promessa de data, alinhado com a regra "não implementar pagamentos ainda".
- Manter tom editorial Iconosquare; sem glow neon, sem cinematic noise, sem dark navy.

Forma proposta:
- Faixa horizontal subtil (linha fina + glyph central) a marcar "Fim da leitura pública".
- Card único, branco, com:
  - Eyebrow Inter uppercase: `Próximo capítulo · em preparação`
  - Título Fraunces: `Há mais por trás deste perfil`
  - Parágrafo Inter curto explicando o que entra no Premium (3 bullets máx., texto editorial, sem listas técnicas) — copy a confirmar abaixo.
  - Badge discreta `Em desenvolvimento` (tom `--signal-warning` em baixa saturação ou `--accent-gold` muito subtil).
  - **Sem CTA clicável** nesta fase (porque está em desenvolvimento). Opcionalmente um link de texto "Avisa-me quando estiver pronto" → abre o mesmo modal/flow que o "Pricing interest" já existente (`src/components/pricing/pricing-interest-modal.tsx`), se confirmares; caso contrário fica só informativo.

Posicionamento em `report-shell-v2.tsx`:
- Renderizado **dentro de `<main>`**, depois do último `ReportBlockSection` visível e **antes de `<ReportMethodology />`**.
- Aparece tanto no caminho `gated` (dentro do `ReportLockGate` continua a haver paywall — neste caso o end-of-free aparece **antes** do gate, a seguir ao Overview, sinalizando "o resto é Premium") **como** no caminho normal não-gated (no fim do último bloco).
- Em variantes `lightweight` (public_mvp) o copy adapta-se para "esta é a leitura pública".

A decisão exacta sobre gated vs. não gated precisa de confirmação tua — ver perguntas abaixo.

---

## Perguntas antes de avançar

1. **Modal de interesse**: queres que o card de fim tenha um link "Avisa-me quando estiver pronto" ligado ao `PricingInterestModal` existente, ou fica puramente informativo nesta fase?
2. **Caso gated**: quando o utilizador está em gated (a maior parte do relatório bloqueada atrás de `ReportLockGate`), faz sentido também mostrar este "fim de leitura pública + Premium em desenvolvimento", ou aí preferes manter só o paywall actual e usar o novo bloco **só** nas variantes não gated?
3. **Direcções visuais do BlockFeedback**: queres que gere já as 3 direcções e te mostre, ou preferes ajustar primeiro os 3 conceitos (D1/D2/D3) que descrevi acima?

---

## Ficheiros que vou tocar (em build mode)

- `src/components/report-redesign/v2/feedback/block-feedback.tsx` — só o JSX do estado `idle`; lógica intacta.
- `src/components/report-redesign/v2/end-of-free-block.tsx` — novo.
- `src/components/report-redesign/v2/report-shell-v2.tsx` — inserir o novo bloco no sítio combinado.
- Possivelmente `src/i18n/locales/pt/report.json` (e EN) para a copy nova, se confirmares que segue a convenção i18n já usada no shell.

Sem alterações de schema, endpoints, providers ou tracking.
