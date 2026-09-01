# Card Review 03A — Auditoria do Pro Gate (read-only)

Auditoria do momento Estado B → Análise Pro 9€. Nenhum ficheiro de produto foi alterado.

## A. Funil actual (fim de Conversas → Estado C)

```text
Conversas (#conversas, estado B)
        |
        v
[sticky] StickyUnlockBar  ── já visível desde #frequencia (muito antes)
        |
ReportEndOfFreeBlock (#lead-magnet-card)  → esconde a sticky quando entra em viewport
        |
   clique CTA "Desbloquear análise completa"
        |
        v
PremiumInterestDialog  (3 propostas: 0€ / 9€ / 97€ + cupão + serviços)
        |
   clique "Desbloquear por 9€"
        v
/checkout/report-full
   ReportPlanChooser (9€ | pack 5 | pack 10)  ← 4.ª escolha
   → Confirmar desbloqueio → Objectivo → Upsell 97€ → Faturação
        v
   EuPago → webhook → entitlement report_full_9 → premiumUnlocked → Estado C
```

Cliques mínimos entre "quero Pro" e ecrã de pagamento: 3 (CTA → card 9€ → avançar checkout), com 2 novas decisões comerciais pelo caminho (modal 3 cartões, chooser 3 planos) e 1 upsell adicional (97€) dentro do checkout.

## B. Superfícies Pro montadas no Estado B

| Componente | Quando aparece | Copy / preço | Destino | Evento |
|---|---|---|---|---|
| `ReportEndOfFreeBlock` (`#lead-magnet-card`) | só B (`leadCaptured && !premium`) | "Agora descobre porquê…", 5 benefícios, 9€ de `PUBLIC_PRODUCTS` | `handlePremiumAccessClick("lock_gate")` → modal | `pro_cta_viewed` (in-view), `premium_cta_clicked` + `pro_cta_clicked` |
| `StickyUnlockBar` | B, a partir de `#frequencia` até `#lead-magnet-card` | "Faltam-te N secções premium", 9€ `PUBLIC_PRODUCTS` | modal (`sticky_unlock_bar`) | idem clique |
| Sidebar — CTA principal | B (secções `pro` bloqueadas) | `nav.unlock.cta_compact` com 9€ | modal (`sidebar_main_cta`) | idem |
| Sidebar — item de secção bloqueada | B | linha "Premium" | modal (`sidebar_section`) | idem |
| Sidebar — adicionar concorrente | B | — | modal (`sidebar_add_competitor`) | idem |
| Sidebar / selector de período | B, janelas 90d+ | — | modal (`sidebar_period`, `analysis_period_selector`) | + `premium_window_interest` |
| Tabs mobile | B | mesma lógica da sidebar | modal | idem |
| `PremiumReveal` (post comparison) | B, quando há posts bloqueados | "mais N publicações" | modal (`premium_section`) | idem |
| `PremiumCallout` | usado com `unlockEnabled` | tratamento dourado PRO | modal (`premium_section`) | idem |
| `PremiumCtaProvider` | envolve todo o shell | — | dono do modal único | dispara ambos os eventos |

Legado/Lab (não montado em B): blocos 03–06 (`performance`, `conteudo`, `procura`, `benchmark`), `PerformanceLockedTeaser`, ramo `internal_lab` do overview.

## C. Promessa vs entrega (bloco final, 9€)

| Benefício prometido | Entregue pelo `report_full_9`? | Estado |
|---|---|---|
| Diagnóstico editorial com causas | sim — `#diagnostico-editorial` monta com `premiumUnlocked` | PASS |
| Prioridades de acção 4 semanas | sim — `#prioridades` | PASS |
| "O que testar, corrigir e repetir" | coberto parcialmente pelas prioridades; sem secção própria | NEEDS REVIEW |
| "Leitura comparada face a perfis semelhantes" | condicional: `#comparacao-concorrente` só existe com ≥1 concorrente analisado | FAIL como promessa central |
| "Oportunidades editoriais por explorar" | sem superfície dedicada garantida no Pro | NEEDS REVIEW |

Conteúdo real dos 9€:
- Garantido: diagnóstico editorial, prioridades de acção, remoção do gate visual (mantém tudo de A e B).
- Condicional: comparação directa com concorrentes (depende de concorrentes analisados), janelas temporais maiores.
- Não incluído: blocos Lab (performance, conteúdo, procura, benchmark de mercado) — continuam atrás de `internal_lab`, apesar de o modal prometer "Todas as 6 secções".

## D. StickyUnlockBar — veredicto: ADAPTAR (ou REMOVER de B)

- Trigger `#frequencia`: **inválido**. Frequência passou para o Estado A gratuito; a sticky comercial acende antes de o leitor receber o valor de B (Publicações, Formatos, Conversas).
- Contador: **inválido**. `PREMIUM_TEASER_IDS` lista 5 secções (frequência, formatos, publicações-chave, diagnóstico, prioridades); hoje só 2 são Pro. "Faltam-te 5 secções premium" é factualmente falso.
- Progress indicator: **sem significado** — mede secções já entregues.
- Lista textual de benefícios: **desactualizada** (anuncia cadência, formatos e publicações-chave, já entregues).
- Momento: aparece muito antes de Conversas; deveria acender apenas depois de Conversas terminar.

## E. PremiumInterestDialog — papel actual

- Opção Free (0€) depois de um clique explícito em "Desbloquear análise completa" é uma saída sem função: o utilizador de B já tem tudo o que essa coluna oferece. É resto da arquitectura anterior (quando o modal também servia o anónimo).
- 97€ tem cartão hero com badge "Mais útil" — rouba a hierarquia ao produto principal do momento e repete-se depois como upsell dentro do checkout de 9€.
- Cupão e bloco de serviços acrescentam duas decisões laterais no momento de maior intenção.
- Todos os CTAs Pro passam obrigatoriamente por este modal (`PremiumCtaProvider` é o único dono).
- Risco de diluição: alto — o clique em "Pro" abre um menu de 3 preços em vez de confirmar a compra.

## F. Mensagens concorrentes, narrativa, preço, mobile, analytics

Mensagens simultâneas em B: "Faltam-te 5 secções premium" (sticky) · "Desbloquear análise completa" (bloco final) · "Escolhe como aprofundar" (modal) · "Começar grátis" · "Reservar diagnóstico 97€" · "Escolhe o plano 9/40/72€". Seis propostas para uma decisão.

Alinhamento narrativo (A: o que está a acontecer · B: que conteúdos explicam · C: porquê e o que fazer):
- `ReportEndOfFreeBlock`: ALINHADO (headline e benefícios centrais respondem "porquê / o que fazer").
- `StickyUnlockBar`: DESALINHADO (fala em contagem de secções, não em causa/acção).
- Sidebar e tabs: PARCIALMENTE ALINHADO (rotulagem "Premium" correcta, sem narrativa).
- `PremiumInterestDialog`: DESALINHADO (reabre a decisão A/B/C em vez de fechar C).
- `PremiumCallout` dourado: DESALINHADO com os tokens actuais (âmbar/PRO fora do sistema azul).

Preço: `PUBLIC_PRODUCTS.report_full_9` é usado no bloco final, sticky e sidebar. O modal usa strings de i18n com "9€"/"0€"/"97€" e o `ReportPlanChooser` tem a sua própria tabela — duas fontes secundárias de verdade.

Mobile em B: bottom tabs (64px) + sticky Pro (acima das tabs) + CTA final — duas barras fixas comerciais em simultâneo num ecrã de 390px, mais o rodapé de feedback.

Analytics:
- `pro_cta_viewed` — só no bloco final em viewport. Etapa distinta. OK.
- `pro_cta_clicked` e `premium_cta_clicked` — disparam **ambos** do mesmo handler, com o mesmo `source_component`. Duplicação semântica pura.
- `pricing_option_clicked` — escolha dentro do modal; só existe porque o modal existe.
- `payment_cta_clicked` — intenção de checkout; sobrepõe-se a `pricing_option_clicked` para o cartão 9€ (dois eventos no mesmo clique).

## G. Alteração mínima recomendada (não implementada)

1. Uma proposta principal em B: manter `ReportEndOfFreeBlock` como CTA canónico.
2. Rota directa: CTA Pro → `/checkout/report-full` (com `source`, `username`, `snapshot`), sem modal intermédio. Manter o modal apenas em superfícies exploratórias (período, concorrentes).
3. Sticky: adaptar trigger para depois de Conversas, remover contador/progresso e substituir a copy por uma linha coerente com o bloco final — ou desmontar em B.
4. Corrigir a promessa: concorrentes e "oportunidades" deixam de ser benefícios centrais enquanto forem condicionais; remover "Todas as 6 secções" do modal.
5. 97€: manter apenas como upsell dentro do checkout, onde já existe.
6. Preço: modal e chooser passam a ler `PUBLIC_PRODUCTS`.
7. Analytics: manter `pro_cta_viewed` / `pro_cta_clicked` como funil Pro e reduzir `premium_cta_clicked` a alias legado.
8. Mobile: nunca duas barras fixas comerciais em simultâneo.

READY FOR PRO GATE IMPLEMENTATION
