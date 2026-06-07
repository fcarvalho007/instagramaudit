## Objectivo

Aplicar o redesign do modal "Adicionar concorrente" exactamente como na imagem anexada — sem mexer em lógica de créditos, validação de handle, gating Pro ou disparo de análise.

## Ficheiros tocados

1. `src/components/report-redesign/v2/consume-credit-dialog.tsx` — só o ramo `isCompetitor`.
2. `src/i18n/locales/pt/report.json` + `src/i18n/locales/en/report.json` — copy nova, sem remover chaves antigas (continuam usadas pelo ramo `period`).

Nenhum outro ficheiro é tocado. O ramo `period` (30d/90d) e o ramo `empty` (sem créditos) continuam exactamente como estão.

## Mudanças no `ConsumeCreditDialog` (ramo competitor + hasCredit + !atCompetitorLimit)

Estrutura nova, de cima para baixo:

```text
┌──────────────────────────────────────────────┐
│ [▢ UserPlus]                              ✕  │  ← header com ícone
│                                              │
│ Adicionar concorrente                        │  ← title serif (Fraunces)
│ Recolhemos os dados públicos deste perfil e  │  ← description nova
│ colocamos a análise lado a lado com a tua.   │
│                                              │
│ Username do concorrente                      │  ← label
│ [ @ perfil_a_comparar                ]       │  ← input (foco azul)
│ (mensagem de erro inline se inválido)        │
│                                              │
│ ⓘ Na fase beta, comparas 1 concorrente de    │  ← info-card AZUL
│   cada vez. Em breve poderás comparar        │     (substitui o soon_note
│   vários em simultâneo.                      │     antigo no fundo)
│                                              │
│ ──────────────────────────────────────       │  ← divider
│                                              │
│ 🪙 Usa 1 crédito beta        ┌────────────┐  │  ← linha calma
│    tens 1 disponível          │grátis na   │  │     (substitui tabela
│                               │   beta     │  │     saldo/após acção)
│                               └────────────┘  │
│                                              │
│             [Cancelar]  [Adicionar e comparar →]
└──────────────────────────────────────────────┘
```

### Detalhes visuais

- **Header com ícone**: pequena tile quadrada `rounded-md` com `bg-[--surface-muted]` (ou azul muito leve, derivado do token primário) + `UserPlus` da lucide-react, cor `text-accent-primary`. Renderizado dentro do `DialogHeader`, acima do `DialogTitle`. O `DialogContent` já garante o `✕` no topo direito.
- **Título**: continua a usar `DialogTitle` (que já é serif via tokens — confirmar `font-serif` se necessário aplicar explicitamente).
- **Description**: copy nova (ver i18n).
- **Input**: mantém-se o componente actual; o foco azul já existe via tokens. Sem mudança de comportamento.
- **Info-card azul** (substitui o `soon_note` no fundo): `rounded-md border border-[--accent-primary]/20 bg-[--accent-primary]/8 px-3 py-2.5 text-xs text-content-secondary` com ícone `Info` (lucide) no topo-esquerda em `text-accent-primary`. Texto com "1 concorrente de cada vez" em `<strong>` (peso 600). Posicionado **imediatamente a seguir ao input e à mensagem de erro**.
- **Divider**: `<div className="h-px bg-border-default" />`.
- **Linha do crédito** (substitui o bloco actual `balance_label` / `balance_after`):
  - Esquerda: `Coins` (lucide) em `text-signal-success` (verde calmo) + 2 linhas — `Usa 1 crédito beta` (semibold, `text-content-primary`) e `tens {n} disponível` (xs, `text-content-tertiary`).
  - Direita: pill `rounded-full bg-signal-success/12 text-signal-success px-2.5 py-1 text-eyebrow-sm` com "grátis na beta".
  - Layout `flex items-center justify-between`.
- **Footer**:
  - `Cancelar` → `Button variant="outline"` (em vez do `ghost` actual) para ter borda visível ao lado do CTA.
  - CTA primário → `Button` default (já azul sólido `#3772E5` do token `--accent-primary`, alinhado à core memory) com label "Adicionar e comparar" + `ArrowRight` (lucide) à direita, dentro de `gap-2`. Mantém `disabled={submitting || !competitorReady}` e o spinner `Loader2` quando `submitting`.

### O que SAI deste ramo (mas chaves i18n ficam para o ramo `period`)

- `consume_dialog.credit_line` — deixa de ser renderizado no ramo competitor.
- `consume_dialog.balance_hint` / `balance_hint_plural` — substituídas pela nova linha do crédito.
- O bloco `<div className="rounded-md … balance_label … balance_after">` (linhas 195-206) — eliminado no ramo competitor.
- `consume_dialog.soon_note` (renderizado nas linhas 227-231) — eliminado no ramo competitor (substituído pelo info-card azul logo após o input). Mantém-se a chave para uso futuro / ramo `period`.

### O que NÃO muda (regras críticas)

- `onConfirm`, `handleConfirmClick`, validação `competitorReady`, `atCompetitorLimit`, lógica `submitting`, bloqueio de fecho durante submissão, mensagens de erro inline (`handleInvalidMsg`, `errorMessage`).
- Ramo `period` (30d/90d) — visual inalterado.
- Ramo `empty` (sem créditos) — visual inalterado.
- Ramo `atCompetitorLimit` — visual inalterado.
- Props públicas do componente.

## Mudanças i18n

### PT (`src/i18n/locales/pt/report.json` → `nav.explore.consume_dialog`)

- `description_competitor` → `"Recolhemos os dados públicos deste perfil e colocamos a análise lado a lado com a tua."`
- `cta_use_competitor` → `"Adicionar e comparar"`  *(antes: "Usar 1 crédito e adicionar concorrente")*
- **Novas chaves**:
  - `competitor_beta_note` → `"Na fase beta, comparas <strong>1 concorrente de cada vez</strong>. Em breve poderás comparar vários em simultâneo."` (renderizado com `<Trans>` do `react-i18next` para suportar o `<strong>`).
  - `credit_use_label` → `"Usa 1 crédito beta"`
  - `credit_available_hint` → `"tens {{count}} disponível"`
  - `credit_available_hint_plural` → `"tens {{count}} disponíveis"`
  - `free_in_beta_badge` → `"grátis na beta"`

Chaves antigas (`credit_line`, `balance_label`, `balance_after`, `balance_hint`, `soon_note`) **ficam** no ficheiro — ainda são usadas pelo ramo `period`.

### EN (`src/i18n/locales/en/report.json`)

Equivalentes em inglês para todas as novas chaves + reescrita das alteradas. Mesma estrutura.

## Pontos que a copy do utilizador levantou e que **não** abordo neste PR

1. **"grátis na beta" — o que acontece quando a beta terminar?**
   O badge fica codificado no componente; quando a beta acabar, basta esconder/remover o badge e ajustar `credit_use_label` (por exemplo para `"Usa 1 crédito"`). Não introduzo flag dinâmica neste PR — assumo a intenção descrita (preparar transição).
2. **UX para remover/trocar concorrente quando o limite beta é 1**:
   Fora de scope deste redesign. Hoje, `atCompetitorLimit` já mostra um estado dedicado ("Limite de 2 concorrentes atingido") — fica como trabalho futuro pensar no fluxo de substituição quando o limite efectivo da beta for 1.

## Validação manual após implementar

1. Abrir um relatório em estado Pro (`premiumUnlocked`), clicar **Adicionar concorrente** → modal aparece com o novo layout (ícone topo, info azul, linha calma com badge verde, CTA azul "Adicionar e comparar →").
2. Escrever username inválido → mensagem de erro inline aparece, CTA fica disabled.
3. Escrever username duplicado (igual ao primário ou já presente) → mensagem específica, CTA disabled.
4. Submeter username válido → spinner + label `submitting` no CTA, modal bloqueado a fechar.
5. Ramo `period` (clicar num chip 30d/90d) → modal **continua exactamente como hoje** (sem regressão).
6. Ramo `empty` (saldo 0) → modal continua como hoje.
7. Mobile (≤640px) → header + info azul + linha do crédito empilham bem, footer mantém os 2 botões lado a lado em ecrãs `sm` e empilha em mobile estreito (comportamento já garantido pelo `DialogFooter`).
8. Toggle de idioma PT/EN → todas as strings novas aparecem traduzidas.
