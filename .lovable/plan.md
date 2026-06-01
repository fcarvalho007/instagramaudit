## Objetivo

Aproximar o fecho do relatório público ao mockup: um cartão de teaser premium mais "comercial" (preço + CTA forte) seguido, em proximidade visual, de uma faixa fina de feedback. Mantém-se o gating atual (estado B — lead capturado, sem premium).

## Onde mexer

- `src/components/report-redesign/v2/end-of-free-block.tsx` — refundir conteúdo + visual.
- `src/components/report-redesign/v2/feedback/end-feedback-strip.tsx` — **novo** ficheiro: variante compacta da `BlockFeedback` para o fecho.
- `src/components/report-redesign/v2/report-shell-v2.tsx` — encostar a nova strip imediatamente abaixo do `ReportEndOfFreeBlock`, partilhando o mesmo wrapper (`section#lead-magnet-card`), sem section própria com `py-16`.
- `src/i18n/locales/pt/report.json` + `en/report.json` — chaves novas para o teaser e para a strip.

Não mexer em: `BlockFeedback` original (continua a servir o feedback do Bloco 1), `PremiumInterestDialog`, gating do relatório, restantes blocos.

## Cartão de teaser (refinado)

Layout (mantém `max-w-3xl`, fundo branco, ring suave — alinhado com o resto do report light):

```text
                    FIM DA LEITURA PÚBLICA              (eyebrow, Inter caps)
              Há mais por trás deste perfil             (H2 Fraunces italic)
   No relatório completo entra a análise temporal, a    (Inter 15px)
   leitura editorial do ritmo e o confronto detalhado
                  com os concorrentes.

      [👥 Concorrentes]  [📊 Posição no escalão]  [📄 +5 secções]

                          7€   ̶1̶9̶€̶                     (Fraunces 48px + struck)
              Preço de lançamento · sobe para 19€        (caption ocean)
                       após a beta

           [ Garantir preço de lançamento  → ]           (botão primário cheio)

   🔔  Entras na lista e avisamos-te quando abrir ·
              pagamento único, sem subscrição
```

Decisões:
- Pílula "Premium · em desenvolvimento" e botão-link "Avisa-me quando estiver pronto" → **removidos** (substituídos pela CTA primária).
- Hairline com glyph central (Sparkles) → **removido** (o fecho ganha presença sozinho; a strip de feedback vem a seguir).
- 3 chips de features com ícones (`Users`, `BarChart3`/`TrendingUp`, `FileText`) num tom neutro com ring fininho — coerentes com os chips já existentes no header.
- Preço grande em Fraunces (não Inter) para criar âncora editorial; 19€ riscado em Inter `tabular-nums`. Preço HARDCODED por agora (`7` / `19`), mas extraído para constantes no topo do ficheiro para futura ligação a config.
- CTA principal: botão sólido `bg-accent-primary` (ocean blue), label "Garantir preço de lançamento", abre o mesmo `PremiumInterestDialog` (reuso integral). `trackEvent` com `source_component: "end_of_free_teaser"` e `metadata.cta: "guarantee_launch_price"`.
- Footnote com `Bell` icon, `text-content-tertiary`, mesmo style que o resto do report.

## Faixa de feedback (nova, compacta)

`EndFeedbackStrip` — variante "linha única" da `BlockFeedback`:
- Fundo `bg-amber-50/40` com ring `ring-amber-200/50` (faixa quente, contrasta subtilmente com o branco do cartão acima).
- Conteúdo numa linha (em mobile quebra para 2 linhas):
  - À esquerda: `Esta leitura foi útil?` (Inter 14px medium).
  - Centro: 4 emojis horizontais (😔 😐 🙂 😍) — botões circulares pequenos (h-9 w-9).
  - À direita: caption `beta · ajuda-nos a afinar` (Inter caps, `text-content-tertiary`).
- Lógica de submissão: reusa `/api/public/inline-feedback` com `block: "overview"` (mesmo endpoint, mesmo localStorage key family — adiciona sufixo `:end` para não colidir). 4 valores mapeados para rating 1/2/4/5 (salta o 3 neutro do meio — o mockup mostra 4 emojis, não 5).
- Estados pós-clique colapsa para uma linha: `Obrigado pelo teu sinal.` no mesmo container, sem CTA de comentário (para não competir com o teaser logo acima).
- Sem padding vertical grande — o objetivo é proximidade ao cartão de teaser (gap ~12px).

## Aproximação visual ("proximidade")

No `report-shell-v2.tsx`, substituir:

```tsx
{unlocked && !premiumUnlocked && (
  <section id="lead-magnet-card">
    <ReportEndOfFreeBlock />
  </section>
)}
```

por:

```tsx
{unlocked && !premiumUnlocked && (
  <section id="lead-magnet-card" className="mt-12 sm:mt-16">
    <ReportEndOfFreeBlock />
    <EndFeedbackStrip
      handle={result.data.profile.username}
      snapshotId={snapshotId ?? null}
      className="mt-3 sm:mt-4"
    />
  </section>
)}
```

E remover o `py-16 sm:py-20` interno do `ReportEndOfFreeBlock` (margem fica agora na `section` envolvente) para os dois componentes encostarem com `mt-3/4` controlado.

## i18n (chaves novas)

```jsonc
"end_of_free": {
  "eyebrow": "Fim da leitura pública",
  "title": "Há mais por trás deste perfil",
  "description": "No relatório completo entra a análise temporal, a leitura editorial do ritmo e o confronto detalhado com os concorrentes.",
  "chips": {
    "competitors": "Concorrentes",
    "rank": "Posição no escalão",
    "more_sections": "+ 5 secções"
  },
  "price": {
    "launch": "7",
    "list": "19",
    "currency": "€",
    "caption": "Preço de lançamento · sobe para 19€ após a beta"
  },
  "cta": "Garantir preço de lançamento",
  "footnote": "Entras na lista e avisamos-te quando abrir · pagamento único, sem subscrição"
},
"end_feedback": {
  "question": "Esta leitura foi útil?",
  "tag": "beta · ajuda-nos a afinar",
  "thanks": "Obrigado pelo teu sinal."
}
```

Mesma estrutura em `en/report.json` (traduzido).

## Riscos / coisas a confirmar

1. **Preço hardcoded (7€ / 19€).** O projeto está em modo "private/admin testing" sem pagamentos — a CTA é só waitlist via `PremiumInterestDialog`, não cobra. Tudo bem para já?
2. **Duplicação de feedback.** A `BlockFeedback` continua a aparecer logo após o Bloco 1 (estado B/C). A nova `EndFeedbackStrip` aparece no fecho. São dois pedidos de feedback no mesmo scroll. Mantemos os dois (pontos de medida diferentes — Bloco 1 vs leitura inteira) ou queres que retire o do Bloco 1 quando o fecho aparece?
3. **Strip de feedback sempre visível?** Decisão proposta: aparece sempre que `unlocked && !premiumUnlocked` (mesmo gate do teaser).

## Checkpoint

- ☐ Confirmas preço `7€ / 19€` hardcoded por agora?
- ☐ Manter `BlockFeedback` (Bloco 1) **e** `EndFeedbackStrip` (fecho), ou só o do fecho?
- ☐ CTA "Garantir preço de lançamento" abre o `PremiumInterestDialog` existente (waitlist), sem checkout — ok?
- ☐ Aprovas o plano para passar a Build Mode?
