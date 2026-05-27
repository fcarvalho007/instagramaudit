## Objetivo

Reforçar a transparência sobre o limite com perfis pessoais **antes** da submissão (na hero) e **no** ecrã de erro `PROFILE_PERSONAL_NO_FEED`, sem mexer em lógica, providers, cache, gates ou pricing.

## Decisões já tomadas (não alterar)

- Manter `PROFILE_PERSONAL_NO_FEED` como desfecho final.
- Manter cache negativa de 24h.
- Sem fallback automático para `instagram-post-scraper`.
- Sem alteração do actor primário.

## Alterações (apenas copy + 1 elemento de UI)

### 1. Hero — aviso pré-submissão

Ficheiro: `src/components/landing/hero-action-bar.tsx`

Adicionar uma linha de hint discreta **abaixo** da barra de input (depois do bloco `{error ? ... : null}` na linha 121, antes do bloco de competitors). Renderiza só quando não há erro, para não competir com a mensagem de validação.

```tsx
{!error ? (
  <p className="mt-3 text-center font-sans text-xs text-content-tertiary">
    {t("actionBar.personalHint")}
  </p>
) : null}
```

Sem alterações estruturais ao form, sem novas dependências, sem novos tokens.

### 2. Copy i18n — hero hint

Ficheiros:
- `src/i18n/locales/pt/landing.json` → `actionBar.personalHint`
- `src/i18n/locales/en/landing.json` → `actionBar.personalHint`

PT: `"Funciona melhor com perfis públicos Creator ou Empresa. Alguns perfis pessoais podem não devolver publicações suficientes para análise."`

EN: equivalente já em uso no `errors.json` ("works best with public Creator or Business profiles…").

### 3. Copy do erro `PROFILE_PERSONAL_NO_FEED`

Ficheiros: `src/i18n/locales/pt/errors.json` e `src/i18n/locales/en/errors.json`

A mensagem atual já cobre a ideia, mas é longa e enterra a frase-chave. Reescrever para destacar a regra prática no início:

PT (proposta):
> "Funciona melhor com perfis públicos Creator ou Empresa. Alguns perfis pessoais podem não devolver publicações suficientes para análise. Este perfil parece público, mas não conseguimos obter publicações recentes através da nossa fonte de dados."

EN equivalente, mantendo a mesma ordem.

Sem mexer no `analyze.json` (`error.personalNoFeed.title` / `cta` ficam como estão — o `analysis-error-state.tsx` já usa esta mensagem do `errors.json` para o corpo).

## Fora de âmbito

- Lógica do handler `analyze-public-v1.ts`, classificação, cache, eventos.
- Componente `analysis-error-state.tsx` (estrutura mantida).
- Actor Apify, budget, allowlist, OpenAI, DataForSEO, gates, emails, pricing, admin.
- Testes existentes (`personal-no-feed-copy.test.ts`) — se as strings PT mudarem, o teste de snapshot dessa copy precisa de ser atualizado para refletir o novo texto.

## Validação

- `bunx tsc --noEmit`
- `bunx vitest run` — em particular `src/i18n/__tests__/personal-no-feed-copy.test.ts` (ajustar asserts se forem string-equal sobre o conteúdo modificado).
- Verificação visual em `/` (hint sob a barra) e num snapshot/replay conhecido com `PROFILE_PERSONAL_NO_FEED` (ex.: `brunoremribeiro`) para confirmar a nova ordem da mensagem.

## Checkpoints

- ☐ Aprovar o texto exato PT do hint na hero
- ☐ Aprovar o texto exato PT do erro reescrito
- ☐ Confirmar que mantemos o EN alinhado (tradução direta) sem rever copy inglesa em separado
