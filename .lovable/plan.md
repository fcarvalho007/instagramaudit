# Plano · Normalização de handles Instagram + mensagens de erro públicas

## Objetivo
Aceitar variações comuns de input do Instagram (`/handle/`, `@handle`, URLs completos), normalizar antes da validação e melhorar a copy dos erros (input + códigos do backend) — sem mexer em providers, secrets, BD ou UI de relatório.

## 1. Helper partilhado `normalizeInstagramHandle`

Criar `src/lib/instagram/normalize-handle.ts` (isomórfico, sem deps):

```ts
export function normalizeInstagramHandle(input: string): string
```

Regras:
- `trim` + remoção de zero-width chars.
- Se contém `://` ou começa por `www.` / `instagram.com`: tem de ser host `instagram.com` (ou `www.instagram.com`/`m.instagram.com`). Outros hosts → `""`.
- Aceita `instagram.com/<handle>` (com ou sem path/query/hash).
- Remove `@` inicial, `/` à volta e baixa caixa.
- Fica só com o primeiro segmento de path.
- Rejeita (`""`) se o segmento estiver em `RESERVED`: `p`, `reel`, `reels`, `tv`, `stories`, `explore`, `accounts`, `directory`, `about`, `developer`, `legal`.
- Valida contra `/^[a-z0-9._]{1,30}$/` no fim; falha → `""`.
- Input vazio → `""`.

Substitui a lógica de `extractUsername` em `hero-action-bar.tsx` (que será re-exportada do helper para manter API + os testes existentes).

## 2. Aplicar nos 3 pontos

- **`src/components/landing/hero-action-bar.tsx`** — `extractUsername` passa a delegar em `normalizeInstagramHandle`. Mensagem de "inválido" trocada (ver §3).
- **`src/routes/analyze.$username.tsx`** — `cleaned` (linha 163) e cada competitor (linhas 198-200) passam por `normalizeInstagramHandle`. Se devolver vazio para o principal → mostrar `AnalysisErrorState` com `INVALID_USERNAME` em vez de chamar a API.
- **`src/routes/api/analyze-public-v1.ts`** — `usernameSchema` (linhas 97-101) muda de `replace(/^@/, "")` para `transform(normalizeInstagramHandle)` + `.refine(v => v.length > 0)`. Aplica-se a primary + competitors, antes do regex final.

## 3. Mensagem de validação no input

`src/i18n/locales/pt/landing.json` → `actionBar.errors.invalid` e `competitorInvalid`:

> "Insere um perfil público do Instagram, por exemplo @marca ou instagram.com/marca."

(Equivalente em `en/landing.json` se existir.)

## 4. Mapping de `error_code` → copy pt-PT

Atualizar `src/i18n/locales/pt/errors.json` e `en/errors.json` com os textos exatos pedidos:

| Código | Copy pt-PT |
|---|---|
| `PROFILE_NOT_ALLOWED` | O modo público ainda não está ativo para este perfil. |
| `PROVIDER_DISABLED` | A análise automática está temporariamente desligada. |
| `CACHE_ONLY_NO_DATA` | Ainda não temos dados guardados para este perfil. |
| `PROFILE_NOT_FOUND` | Não encontrámos este perfil no Instagram. |
| `PROFILE_PRIVATE` | Este perfil parece ser privado. |
| `RATE_LIMITED` (+ `_IP`/`_HANDLE`) | Foram feitas demasiadas análises. Tenta novamente mais tarde. |
| `BUDGET_EXCEEDED` | As análises gratuitas de hoje atingiram o limite. |
| `UPSTREAM_FAILED` | Não foi possível concluir a análise neste momento. |

`useResolveErrorMessage` (analyze.$username.tsx) já lê do namespace `errors` por `toUpperCase()` — não precisa de mudanças de código, só dos JSONs. `CACHE_ONLY_NO_DATA` continua a usar o título dedicado do `AnalysisErrorState` (mensagem fica para o body via t()).

## 5. Testes (vitest, sem rede)

- **Novo** `src/lib/instagram/__tests__/normalize-handle.test.ts`:
  - Aceita: `chatgptricks`, `@chatgptricks`, `/chatgptricks/`, `instagram.com/chatgptricks`, `www.instagram.com/chatgptricks/`, `https://www.instagram.com/chatgptricks/?hl=en`, `  @ChatGPTricks  ` → todos `chatgptricks`.
  - Rejeita (`""`): `""`, `   `, `https://tiktok.com/@chatgptricks`, `instagram.com/p/ABC123`, `instagram.com/reel/xyz`, `instagram.com/stories/foo`, `@@bad name`, `foo bar`, `instagram.com/explore`.
- **Atualizar** `src/components/landing/__tests__/hero-action-bar-extract.test.ts` para o novo comportamento (incluir hosts não-Instagram).
- **Atualizar** `src/routes/api/__tests__/analyze-public-v1-sanitize.test.ts` (ou novo `analyze-public-v1-normalize.test.ts`) a confirmar que `PayloadSchema.safeParse` aceita as variantes válidas e rejeita as inválidas com `INVALID_USERNAME`.
- Copy do frontend: snapshot pequeno do `errors.json` (string-equality) para garantir os 8 mapeamentos pedidos.

## 6. Validação

```bash
bunx tsc --noEmit
bunx vitest run
```

## Fora de scope

- Sem mudanças em provider/Apify, secrets, BD, ou UI de relatório.
- Sem alterar `HTTP_STATUS` nem `ERROR_MESSAGES` do servidor (a copy oficial pública passa a vir do i18n no cliente; o servidor mantém o seu fallback técnico).

## Checkpoint

- ☐ `normalize-handle.ts` criado com regras + testes a passar
- ☐ `hero-action-bar` e `analyze.$username` a usar o helper
- ☐ Zod do `analyze-public-v1` a aceitar URLs/`@`/`/handle/`
- ☐ Copy do erro do input atualizada
- ☐ 8 mapeamentos de `error_code` no `errors.json` (pt + en)
- ☐ `tsc --noEmit` e `vitest run` verdes
