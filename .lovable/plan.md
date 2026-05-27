
## Diagnóstico

O perfil `brunoremribeiro` é **público**, mas é uma **conta pessoal** (não Creator/Business). O Apify `apify/instagram-scraper` retornou o perfil com `posts_returned=0` (6 tentativas — ver tabela abaixo), e o nosso código em `src/routes/api/analyze-public-v1.ts:736-748` interpretou isso como conta privada:

```text
2026-05-27 10:34  apify  success 200  posts_returned=0  →  outcome=not_found / error_code=PROFILE_PRIVATE
2026-05-27 10:33  apify  success 200  posts_returned=0  →  outcome=not_found / error_code=PROFILE_PRIVATE
... (6 chamadas Apify gastas)
```

**Causa raiz:** o actor `apify/instagram-scraper` consegue ler o `latestPosts[]` de contas **Creator/Business** via endpoint público do Instagram, mas para **contas pessoais públicas** retorna apenas o profile shell — frequentemente com `is_private: true` por defeito, mesmo quando o perfil é tecnicamente público. Isto é um limite estrutural do scraper, não um bug nosso.

**Consequências atuais:**
1. Utilizador vê "Perfil privado. A análise pública só funciona com perfis abertos." — mensagem **incorreta** e confusa (o perfil é aberto, só não é profissional).
2. Foram gastas 6 chamadas Apify (~$0,30) em tentativas repetidas porque nada na UX explicou o verdadeiro motivo.
3. Não há aviso prévio no formulário a indicar este requisito.

---

## Plano

### 1. Backend — novo código de erro `PROFILE_PERSONAL_NO_FEED`

Em `src/routes/api/analyze-public-v1.ts`:

- Adicionar `PROFILE_PERSONAL_NO_FEED` a `PublicAnalysisErrorCode` (em `src/lib/analysis/types.ts`).
- Adicionar mensagem pt-PT em `ERROR_MESSAGES`:
  > "Este perfil é público mas é uma conta pessoal. A análise automática só funciona com contas profissionais — Creator ou Empresa. Pedir ao dono do perfil para mudar em Definições → Conta → Mudar para conta profissional."
- `HTTP_STATUS`: 422 (Unprocessable Entity — não é "não encontrado", é "não analisável").

### 2. Refinar a deteção no handler

Substituir o bloco atual `is_private`/`private` por uma classificação em 3 ramos, lida do row do Apify (`row.is_private`, `row.posts_count`/`postsCount`, `row.is_business_account`/`isBusinessAccount`, `row.account_type`, `latestPosts.length`):

```text
se latestPosts.length > 0
    → segue fluxo normal
senão
    se is_private === true E posts_count NÃO indica conteúdo
        → PROFILE_PRIVATE (mensagem atual mantida)
    senão se posts_count > 0 (perfil tem posts no IG mas o scraper não os lê)
        OU is_business_account === false / account_type === "personal"
        → PROFILE_PERSONAL_NO_FEED  (novo)
    senão
        → PROFILE_PRIVATE (fallback conservador)
```

A heurística usa os campos que o `apify/instagram-scraper` já devolve no row de profile (`postsCount`, `isBusinessAccount`, `private`).

### 3. Cache negativo curto — evitar desperdício de chamadas Apify

Quando o handler decide `PROFILE_PERSONAL_NO_FEED` ou `PROFILE_PRIVATE`, gravar um marcador leve (24h) numa nova tabela `public.analysis_negative_cache` (`handle`, `error_code`, `created_at`, `expires_at`) com `GRANT` + RLS adequada. Antes da chamada Apify, consultar este cache: se houver entrada válida para o handle, devolver o erro imediatamente sem queimar uma chamada.

Isto resolve o caso real desta semana (6 chamadas para o mesmo handle em ~3h).

### 4. UX no formulário público

Em `src/routes/index.tsx` (ou onde vive o input de username), adicionar uma linha de ajuda discreta abaixo do campo:

> "Funciona com perfis públicos em conta profissional do Instagram (Creator ou Empresa)."

### 5. Página de resultado — renderizar o novo erro com remediação

Onde o erro é apresentado ao utilizador (`/analyze/$username` ou componente de erro do hero), tratar `PROFILE_PERSONAL_NO_FEED` como caso distinto:
- Título: "Perfil pessoal — análise indisponível"
- Explicação curta + lista de 3 passos para mudar para conta profissional no Instagram
- CTA secundário: "Testar outro perfil"

Sem CTA "Tentar de novo" — não adianta repetir.

### 6. Tradução

Adicionar entrada `PROFILE_PERSONAL_NO_FEED` em:
- `src/i18n/locales/pt/errors.json`
- `src/i18n/locales/en/errors.json`

---

## Detalhes técnicos

**Ficheiros a tocar:**
- `src/routes/api/analyze-public-v1.ts` — novo error code, lógica de classificação, leitura do cache negativo, escrita do cache negativo.
- `src/lib/analysis/types.ts` — adicionar `"PROFILE_PERSONAL_NO_FEED"` à union.
- `src/i18n/locales/{pt,en}/errors.json` — strings.
- `src/routes/index.tsx` (ou componente do form) — texto de ajuda.
- Componente de erro do `/analyze/$username` — branch para o novo código.
- Nova migration `supabase/migrations/<ts>_analysis_negative_cache.sql` — `CREATE TABLE` + `GRANT` (`service_role` full, `authenticated` select) + RLS + índice `(handle, expires_at)`.

**Custo estimado da implementação:** zero impacto em Apify; reduz custos futuros ao bloquear retries dentro de 24h.

**Não toca em:**
- `/report.example` (locked)
- `src/integrations/supabase/*`
- Pipeline Apify em si (apenas interpretação do retorno)

---

## Checkpoint

- [ ] `PROFILE_PERSONAL_NO_FEED` adicionado ao tipo e a `ERROR_MESSAGES` (pt-PT correto, sem pt-BR).
- [ ] Handler distingue privado vs pessoal vs não encontrado com a heurística descrita.
- [ ] Cache negativo 24h grava + lê antes de chamar Apify.
- [ ] Migration nova com `GRANT` + RLS.
- [ ] Form público mostra nota sobre conta profissional.
- [ ] Página de erro renderiza novo caso com remediação clara.
- [ ] i18n pt/en atualizado.
- [ ] Testado manualmente: re-chamar `brunoremribeiro` devolve novo erro sem queimar Apify.
