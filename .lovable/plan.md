# Refinamento de copy e UX do Passo 2 do onboarding

## Diagnóstico

O passo 2 actual funciona, mas o tom é seco e o vocabulário ainda é "interno" (contexto, objetivo, ajustar a análise, p/ cliente). Para leigos:

- "Conta-nos o contexto" / "Qual é o contexto?" — repete "contexto" duas vezes; soa a formulário.
- "Duas escolhas rápidas para ajustarmos a análise." — frio, sem benefício claro.
- "Qual é o teu objetivo?" — formal; "objetivo" é vago.
- "Analisar p/ cliente" — abreviatura "p/" parece SMS, fica deslocada num modal premium.
- "A minha marca" / "De um cliente" — sem sujeito, lê-se mal sem o contexto da pergunta.

UX adicional:
- O `Continuar` está sempre activo mesmo sem selecção (a validação só dispara ao clicar). Para leigos é melhor desactivá-lo até as duas escolhas estarem feitas, com uma micro-mensagem subtil.
- Não há feedback do que cada escolha muda. Uma linha discreta tipo "Vamos usar isto para personalizar a leitura" reforça o porquê sem peso.

## Mudanças propostas (copy)

Apenas `src/i18n/locales/pt/gate.json` (e espelho em `en/gate.json`). Sem mexer em layout, ícones, cores ou estrutura de componentes.

### `onboarding.qualification`
- `title`: "Conta-nos o contexto" → **"Ajuda-nos a personalizar"**
- `subtitle`: "Duas escolhas rápidas para ajustarmos a análise." → **"Duas perguntas rápidas. A leitura do relatório adapta-se ao que escolheres."**
- `subtitleCheckout`: idem com tom equivalente.
- `ownershipLegend`: "Qual é o contexto?" → **"Este perfil é…"**
- `goalLegend`: "Qual é o teu objetivo?" → **"O que queres tirar daqui?"**
- `ownershipError`: "Escolhe o contexto." → **"Escolhe uma opção para continuar."**
- `goalError`: "Escolhe um objetivo." → **"Escolhe o que mais te interessa."**

### `onboarding.compactOptions.profileOwnership` (cartões — coluna 1)
- `own_profile`: "Perfil pessoal" → **"O meu perfil"**
- `brand_profile`: "A minha marca" → **"A minha marca"** (mantém — já claro)
- `client_profile`: "De um cliente" → **"De um cliente"** (mantém)
- `competitor_research`: "Concorrência" → **"Um concorrente"**

### `onboarding.compactOptions.goal` (cartões — coluna 2)
- `improve_content`: "Melhorar conteúdo" → **"Melhorar o conteúdo"**
- `benchmark_competitors`: "Comparar concorrentes" → **"Comparar com outros"**
- `client_report`: "Analisar p/ cliente" → **"Apresentar a um cliente"**  (remove abreviatura "p/")
- `grow_audience`: "Crescer audiência" → **"Crescer a audiência"**

EN espelhado com tom igualmente leve (ex.: "Help us tailor your read", "This profile is…", "What do you want to get out of it?").

## Mudanças propostas (UX mínima)

Em `src/components/onboarding/onboarding-modal.tsx` (corpo `QualificationStepBody`):

1. **Desactivar `Continuar` enquanto faltar selecção** — `disabled = !ownership || !goal`. Mantém o handler de validação para fallback.
2. **Hint sob o botão** (apenas quando desactivado e o utilizador já interagiu com pelo menos um campo): _"Escolhe uma opção em cada pergunta para continuar."_ — `text-xs text-content-tertiary`, sem mudar a altura do modal.

Nada mais muda: grelha, ícones, cores seleccionado/não-seleccionado, padding, ordem dos cartões.

## Ficheiros tocados

- `src/i18n/locales/pt/gate.json` — copy refinada.
- `src/i18n/locales/en/gate.json` — espelho EN.
- `src/components/onboarding/onboarding-modal.tsx` — `disabled` no botão + hint condicional.
- `src/i18n/__tests__/onboarding-copy.test.ts` — actualizar as duas/três labels asseridas (se aplicável).

## Risco residual

- Nenhum impacto em product logic, créditos, preços, RLS, payments.
- Snapshot/visual tests que comparem strings exactas podem precisar de update — verifico no run.
- Telemetria que use a label visível como chave de evento mantém-se a usar o `value` (`own_profile`, `improve_content`, etc.), que não muda.
