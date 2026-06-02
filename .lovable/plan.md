# Refinar passo 2 do onboarding — cartões verticais com ícone

## Objetivo

Substituir os chips horizontais atuais (texto simples, 2 colunas) por **cartões verticais em grelha de 4 colunas**, com ícone grande centrado por cima do texto. Ícones ajudam a ler (reconhecimento instantâneo), cor só no estado selecionado. Sem decoração gratuita.

Ficheiro: `src/components/onboarding/onboarding-modal.tsx` (componente `ChipGroup` usado pelo `Step2Context`, linhas ~823-868 e ~885-928).

## Mapa de ícones (lucide-react)

Significam, não enfeitam:

**Que relação tens com @handle?**
- `own_profile` → `User` (é meu)
- `client_profile` → `Briefcase` (trabalho de cliente)
- `brand_profile` → `Star` (a minha marca) — alternativa: `Sparkles`
- `competitor_research` → `Binoculars` (observar concorrente) — alternativa: `Target` ou `Search`

**O que mais te interessa perceber?**
- `improve_content` → `Lightbulb` (ideias para conteúdo)
- `benchmark_competitors` → `Users` (comparar concorrentes)
- `grow_audience` → `TrendingUp` (crescer audiência)
- `validate_brand` → `CheckCircle2` (validar) — alternativa: `ShieldCheck`

Caso algum não soe certo no preview, trocar pela alternativa indicada.

## Layout dos cartões

Estrutura por cartão:
```
┌──────────┐
│   ICON   │  ← 20-24px, centrado, color: content-tertiary (default) / primary (selected)
│  Label   │  ← Inter SemiBold 12-13px, centrado, sentence case
└──────────┘
```

- Grelha: `grid grid-cols-4 gap-2` em desktop; `grid-cols-2` em <640px (mobile-first, evita textos espremidos).
- Cartão: `flex flex-col items-center gap-1.5 rounded-lg border px-2 py-3 min-h-[72px]`.
- Estado default: `border-border-default/60 bg-card`, ícone e texto em `content-tertiary`/`content-secondary`.
- Hover: `hover:border-primary/40 hover:text-content-primary` (sem fill).
- Selecionado: `border-primary bg-primary/[0.06]`, ícone e texto em `text-primary`/`content-primary`. Ring subtil opcional.
- Acessibilidade mantém `role="radio"`, `aria-checked`, `data-testid` existentes.

## Microcopy

Encurtar labels (cabem centradas, ~10-12 chars):

`src/i18n/locales/pt/gate.json` → `compactOptions`:
- `brand_profile`: "Da minha marca" → **"Minha marca"**
- `improve_content`: "Melhorar conteúdo" → **"Conteúdo"**
- `validate_brand`: "Validar a marca" → **"Validar"**
- restantes mantêm-se: "É meu", "De um cliente", "Concorrente", "Comparar concorrentes" (este pode ficar **"Concorrentes"** para uniformizar), "Crescer audiência" → **"Audiência"**.

Espelhar mudanças em `src/i18n/locales/en/gate.json`.

### Decisão de copy do subtítulo/consequência

Atual: `subtitle` diz "ajustam o tom e o foco do relatório" e `consequenceLine` promete "personalizar próximos relatórios".

**Pergunta de produto não resolvida**: o relatório ajusta mesmo o tom/foco conforme `profile_ownership` + `goal`?

- **Se SIM** → manter "ajustam o tom do relatório" (já alinhado com o mockup).
- **Se NÃO** (assumir por defeito até confirmação) → suavizar:
  - `subtitle`: "Duas escolhas rápidas — ajudam-nos a evoluir o produto."
  - `consequenceLine`: remover (redundante) ou "Vamos usar isto para evoluir o produto."

O plano implementa a versão **suavizada** por defeito, para não fazer promessa que o output ainda não cumpre. Se confirmar que há ajuste real, reverte-se a copy num passo separado.

## Componente

Refactor mínimo: `ChipGroup` aceita um `icon` opcional por opção e o layout passa a cartão vertical. Não criar novo componente — `ChipGroup` deixa de usar apenas chips planos e passa a "OptionCardGroup" implícito (mesmo nome para não tocar nos call sites).

Assinatura:
```ts
options: { value: T; label: string; icon: LucideIcon }[]
```

Ícones importados de `lucide-react` no topo do ficheiro (já há vários imports lucide presentes — verificar e adicionar só os que faltam).

## Validação

- `bunx tsc --noEmit`
- Testes existentes: `src/i18n/__tests__/onboarding-copy.test.ts` (atualizar strings encurtadas) e quaisquer testes de `onboarding-modal` que esperem o texto antigo.
- Smoke visual em preview a 375px e desktop: ícone visível, label numa única linha, selecionado destaca cor, mobile cai para 2 colunas sem cortes.

## Ficheiros afetados

- `src/components/onboarding/onboarding-modal.tsx` — `ChipGroup` + `Step2Context` (passar `icon` por opção).
- `src/i18n/locales/pt/gate.json` — labels encurtadas + subtitle/consequence (versão suavizada).
- `src/i18n/locales/en/gate.json` — espelho.
- `src/i18n/__tests__/onboarding-copy.test.ts` — ajustar asserts.

## Fora de âmbito

- Não mexer no passo 1 nem 3.
- Não mexer na lógica de submissão, créditos, ou tracking.
- Não introduzir nova dependência (lucide-react já existe).

## Checkpoint

- ☐ Ícones lucide importados e mapeados às 8 opções
- ☐ `ChipGroup` refatorado para cartões verticais, grid-cols-4 (desktop) / grid-cols-2 (mobile)
- ☐ Cor apenas no estado selecionado
- ☐ Labels encurtadas (PT + EN)
- ☐ Decisão sobre subtitle/consequenceLine aplicada (suavizada por defeito)
- ☐ `bunx tsc --noEmit` ok
- ☐ Testes i18n atualizados e a passar
- ☐ Smoke visual mobile + desktop
