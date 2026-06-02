## Objetivo
Aumentar a legibilidade e melhorar UX/UI do modal de onboarding (Intro step) visível em `/`, transformando o link "Entrar" num botão ghost e aplicando melhores práticas tipográficas e de hierarquia.

## Ficheiro a editar
- `src/components/onboarding/onboarding-modal.tsx` — apenas o componente `IntroStepBody` (linhas ~394–484). Sem alterações de lógica, copy ou i18n.

## Alterações

### 1. Tipografia maior e mais respirável
| Elemento | Antes | Depois |
|---|---|---|
| Padding do container | `px-5 py-7 sm:px-9 sm:py-9` | `px-6 py-8 sm:px-10 sm:py-10` |
| Eyebrow "ANTES DE COMEÇAR" | `text-eyebrow-sm` | `text-eyebrow` (12 → 13px, mais tracking) |
| Título "Cria a tua conta…" | `text-[28px] sm:text-[30px]` | `text-[30px] sm:text-[34px]` leading `1.1` |
| Bloco "Vais analisar @…" linha 1 | `text-[14px]` | `text-[15px]` |
| Bloco "Vais analisar @…" linha 2 (créditos) | `text-[13.5px]` | `text-[14px]` |
| Hint "Funciona melhor…" | `text-[13px]` | `text-[14px]` |
| CTA "Começar grátis →" | `size="lg"` default | `size="lg"` com `text-[15px] h-12` |
| "Já tens conta?" parágrafo | `text-[13.5px]` | `text-[14px]` |
| Trust line "Respeitamos o RGPD" | `text-[12px]` | `text-[13px]` + ícone `size-3.5` |
| Espaçamento vertical geral | `space-y-4` / `mt-5` | `space-y-5` / `mt-6` |
| Bloco handle (rounded card) padding | `px-4 py-3.5` | `px-5 py-4` |

### 2. "Já tens conta? Entrar" → botão ghost
Substituir o atual parágrafo + `<button>` inline por um layout com botão ghost a toda a largura, mantendo a label "Já tens conta?" como texto descritivo acima ou inline:

```tsx
<div className="border-t border-border-default/50 pt-4 space-y-3">
  <Button
    type="button"
    variant="ghost"
    size="lg"
    onClick={onSignIn}
    className="w-full rounded-lg font-medium text-[14px] text-content-secondary hover:text-primary hover:bg-primary/[0.04]"
    data-testid="onboarding-intro-signin"
  >
    {t("onboarding.intro.haveAccount")}{" "}
    <span className="ml-1 text-primary font-semibold">
      {t("onboarding.intro.haveAccountCta")}
    </span>
  </Button>
  <p className="text-center text-[13px] text-content-tertiary flex items-center justify-center gap-1.5">
    <ShieldCheck className="size-3.5" aria-hidden />
    {t("onboarding.intro.trustLine")}
  </p>
</div>
```

Mantém o mesmo `data-testid` e os mesmos i18n keys — zero impacto em testes ou copy.

### 3. Hierarquia visual reforçada
- O CTA primário continua a ser o foco principal (gradient roxo já existente do `Button` default).
- O botão ghost ("Entrar") fica claramente secundário mas reconhecível como acção (área clicável `w-full h-12` em vez de um link minúsculo).
- Separador (`border-t`) com mais ar (`pt-4`) entre primário e secundário.

## Fora de escopo
- `FormStepBody` (steps 1–3) — só foi pedido o modal "geral" mas o screenshot mostra apenas o Intro. Posso aplicar o mesmo escalar de fontes aos steps seguintes num próximo prompt se desejares.
- Copy / i18n (`gate.json`) — sem alterações.
- Lógica de auth, tracking, payload — intocado.
- Tokens globais — sem alterações.

## Validação
1. `bunx tsc --noEmit` deve passar.
2. Verificar visualmente em `/` (abrir o modal): título maior, mais ar, "Entrar" como botão ghost full-width abaixo do CTA primário.
3. Confirmar que `data-testid="onboarding-intro-signin"` continua a disparar `onSignIn` (transição para `view="login"`).

## Checkpoint
- ☐ `IntroStepBody` com fontes aumentadas conforme tabela
- ☐ "Entrar" renderizado como `<Button variant="ghost" size="lg" className="w-full">`
- ☐ Sem alterações em i18n, lógica, ou outros steps
- ☐ Typecheck passa