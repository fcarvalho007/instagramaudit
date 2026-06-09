# Recuperar ícones cinemáticos no passo 2 (questão "objetivo")

## Diagnóstico

O passo 2 do `OnboardingModal` tem hoje duas perguntas em cartões verticais (`RadioCardField`):

- **"Qual é o contexto?"** → renderiza com **ícones coloridos** (User azul, Star roxo, Briefcase verde, Search âmbar, HelpCircle rosa). Vem do `PROFILE_OWNERSHIP_ICONS` em `src/components/product/unlock-modal.tsx`.
- **"Qual é o teu objetivo?"** → renderiza **sem ícone**, só radio + label. É esta a régua que parte a estética "cinematográfica" que tinhas.

A causa é simples: o `RadioCardField` da pergunta `goal` é passado sem a propriedade `icon` por opção. Nunca existiu um `GOAL_ICONS` análogo ao `PROFILE_OWNERSHIP_ICONS`, por isso a régua visual está incompleta — não é regressão, é uma omissão. O pedido é restaurar a paridade visual com a pergunta de contexto.

## Mudanças propostas

### 1. Adicionar `GOAL_ICONS` em `src/components/product/unlock-modal.tsx`

Junto ao `PROFILE_OWNERSHIP_ICONS` existente, criar um mapa equivalente para os 6 valores de `GOALS` (`improve_content`, `benchmark_competitors`, `client_report`, `grow_audience`, `validate_brand`, `other`), reutilizando ícones `lucide-react` já importados ou adicionando os que faltarem. Proposta de mapeamento (cinco cores distintas, semânticas, alinhadas com a paleta dos chips de contexto):

| Goal | Ícone | Tons (bg / fg) | Racional |
|---|---|---|---|
| `improve_content` | `Sparkles` | `bg-blue-100 / text-blue-600` | melhorar = polir |
| `benchmark_competitors` | `Scale` | `bg-amber-100 / text-amber-700` | comparar = balança |
| `client_report` | `FileText` | `bg-emerald-100 / text-emerald-600` | entrega = documento |
| `grow_audience` | `TrendingUp` | `bg-purple-100 / text-purple-600` | crescer = subir |
| `validate_brand` | `ShieldCheck` | `bg-cyan-100 / text-cyan-600` | validar = selo |
| `other` | `HelpCircle` | `bg-pink-100 / text-pink-600` | aberto |

(Já temos `Sparkles`, `TrendingUp`, `FileText`, `HelpCircle` disponíveis em projetos próximos; `Scale` e `ShieldCheck` adicionam-se à mesma linha de import — não há instalação nova, é `lucide-react`.)

Export nomeado tal e qual o `PROFILE_OWNERSHIP_ICONS`.

### 2. Importar e usar no `QualificationStepBody` em `src/components/onboarding/onboarding-modal.tsx`

- Acrescentar `GOAL_ICONS` ao import existente na linha 52.
- Na chamada `RadioCardField` da pergunta `goal` (linha ~1192), passar `icon: GOAL_ICONS[v]` no mapeamento das `options`, exatamente como já se faz para `profile_ownership`.

### 3. Não tocar em mais nada

- Sem mudanças no `RadioCardField` (já aceita `icon` opcional).
- Sem mudanças em copy, ordem dos campos, validações ou submit.
- Sem alterações no `unlock-modal.tsx` legado (continua a renderizar `goal` sem ícone — não é o modal em uso no checkout/analyze atual, e o pedido é só para o passo 2 do novo `OnboardingModal`).

## Ficheiros a alterar

- `src/components/product/unlock-modal.tsx` — exportar `GOAL_ICONS` (novo mapa de 6 entradas, ~20 linhas).
- `src/components/onboarding/onboarding-modal.tsx` — 1 linha no import e 1 linha no `options.map(...)` da pergunta `goal`.

## QA visual

1. Abrir `/precos` → onboarding → passo 2 (checkout). Confirmar que **ambas** as perguntas mostram chip com ícone à esquerda do label, com a mesma altura de cartão, mesma cor de borda no estado hover/selected, e cinco/seis tons distintos por pergunta.
2. Abrir `/analyze/<handle>` → onboarding → passo 2 (analyze). Mesmo resultado.
3. Mobile 414px: cartões mantêm padding consistente, ícone não quebra para nova linha.
4. Selecionar "Outro" no objetivo: o input de texto continua a aparecer por baixo (sem regressão).

## Fora do âmbito

- Re-skin do `RadioCardField` (cor, sombras, animação) — visual atual já é a base "cinematográfica" pedida; só falta o ícone.
- Adicionar ícones ao `user_type` ou outros passos.
- Mexer no modal legado `unlock-modal.tsx`.
