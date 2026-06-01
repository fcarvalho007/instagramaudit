## Auditoria pós-implementação

Verifiquei: modal completo, server endpoints (`/api/onboarding/start`, `/api/public/onboarding-event`), schema `product_events`, draft hook, tracking helper, tipos das props e copy. Sem runtime errors, 43 testes verdes.

**Estado geral**: bem ligado, sem bugs funcionais bloqueantes. Apenas três refinamentos:

### Bug A — `<Trans>` com placeholder `<1>` ausente nas strings

Em dois pontos o componente JSX espera `<1>...</1>` na tradução para envolver o `@handle` em cor primária, mas as strings PT/EN são texto plano. Resultado: o handle aparece **sem** o highlight visual pretendido (não quebra nada, mas é regressão face ao desenho).

Ficheiros: `src/i18n/locales/{pt,en}/gate.json`
- `onboarding.intro.handleContext`
- `onboarding.steps.2.relationshipQuestion`

**Fix** (4 strings):
```json
// PT
"handleContext": "Vais analisar <1>@{{handle}}</1>",
"relationshipQuestion": "Que relação tens com <1>@{{handle}}</1>?"
// EN
"handleContext": "You'll analyse <1>@{{handle}}</1>",
"relationshipQuestion": "What's your relationship with <1>@{{handle}}</1>?"
```

O JSX já passa `components={{ 1: <span className="text-primary" /> }}` — basta acrescentar as tags na cópia.

### Refinamento B — classes Tailwind duplicadas no rodapé do form

Em `FormStepBody`, linha 499 do modal:
```
className="flex gap-3 pt-1 border-t border-border-default/40 -mx-7 sm:-mx-9 px-7 sm:px-9 pt-5 mt-2"
```
`pt-1` e depois `pt-5` — o último vence mas a duplicação confunde. Limpar para `pt-5 mt-2`.

### Refinamento C — honeypot sem `as never`

Em vez de `{...form.register("website" as never)}`, usar um input descontrolado e ler via DOM ref. Reduz risco de o tipo voltar a partir-se quando o schema mudar. Padrão:

```tsx
const honeypotRef = useRef<HTMLInputElement>(null);
// no input: ref={honeypotRef}, sem register
// no submit: const honeypot = honeypotRef.current?.value ?? ""
```

O `useOnboardingDraft` já não toca em `website` (escreve apenas keys explícitas), portanto remover o register não afeta persistência.

### Não-issues confirmados

- `product_events` aceita os campos enviados (`event_type`, `handle`, `actor_hash`, `metadata` jsonb com `step` e `marketing_consent`).
- `/api/onboarding/start` aceita `_t` e `website`; honeypot dreni­fica com 200; <2s devolve 400.
- `user_type` continua nullable; modal omite-o no payload mas mantém default `"creator"` no form para satisfazer o zod resolver (não vai para a BD).
- `useOnboardingDraft` hidrata uma vez por mount (modal monta-se ao carregar a homepage e persiste); `clearDraft()` corre no sucesso; `gdpr_consent` intencionalmente fora do draft.
- `onSuccess` no `hero-action-bar.tsx` ignora o segundo argumento — TS aceita assinaturas mais curtas, sem regressão.
- Landing `lead` (PT/EN) já não promete "sem registo".

### Fora de âmbito

Apify, OpenAI, report, pricing, thumbnails, emails, migrações de BD, Turnstile.
