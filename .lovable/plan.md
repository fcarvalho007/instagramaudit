### Problema
No hero da homepage, escrever `/chatgptricks/` mostra "Username inválido". O `extractUsername` em `src/components/landing/hero-action-bar.tsx` só remove `/` à direita, e o regex `^[A-Za-z0-9._]{1,30}$` rejeita o `/` à esquerda.

Variações que devem ser aceites em silêncio (sem erro):
- a) `/chatgptricks/`
- b) `chatgptricks`
- c) `https://www.instagram.com/chatgptricks/` (com ou sem `https`, com ou sem `www`, com query string `?igsh=...`)
- d) `@chatgptricks`, `@/chatgptricks/`, com espaços à volta
- e) URLs `instagram.com/chatgptricks/reels/...` → extrair `chatgptricks` (segmento imediatamente a seguir ao domínio, ignorar `p`, `reel`, `reels`, `tv`, `stories`, `explore` se aparecerem como primeiro segmento? Para já apenas reconhecer e rejeitar com mensagem mais clara — ver abaixo)

### Alterações

#### 1. `src/components/landing/hero-action-bar.tsx` — `extractUsername` mais tolerante
Substituir a função para:

```ts
const RESERVED_IG_SEGMENTS = new Set([
  "p", "reel", "reels", "tv", "stories", "explore", "accounts", "directory",
]);

function extractUsername(raw: string): string {
  if (!raw) return "";
  let s = raw.trim();
  if (!s) return "";

  // 1) Se for URL com instagram.com, agarra o primeiro segmento de path.
  const urlMatch = s.match(/instagram\.com\/+([^/?#\s]+)/i);
  if (urlMatch) {
    const seg = urlMatch[1].toLowerCase();
    // Se o primeiro segmento é uma rota reservada (ex.: /reel/XYZ), não é
    // um username — devolve vazio para que o caller mostre erro de input.
    if (RESERVED_IG_SEGMENTS.has(seg)) return "";
    return seg;
  }

  // 2) Caso contrário, normaliza: remove @ inicial, barras à volta e
  //    espaços/zero-width chars.
  s = s
    .replace(/^[\s\u200B-\u200D\uFEFF]+|[\s\u200B-\u200D\uFEFF]+$/g, "")
    .replace(/^@+/, "")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "")
    .toLowerCase();

  // 3) Se ainda tiver `/` no meio (ex.: o utilizador colou `user/posts`),
  //    fica com o primeiro segmento.
  const firstSeg = s.split("/")[0] ?? "";
  return firstSeg;
}
```

Comportamento:
- `chatgptricks` → `chatgptricks` ✓
- `/chatgptricks/` → `chatgptricks` ✓
- `@chatgptricks` → `chatgptricks` ✓
- `https://www.instagram.com/chatgptricks/` → `chatgptricks` ✓
- `https://instagram.com/chatgptricks/?igsh=abc` → `chatgptricks` ✓
- `instagram.com/chatgptricks/reels/123` → `chatgptricks` ✓
- `instagram.com/reel/XYZ123` → `""` → cai no erro `invalid` (esperado: URL de post, não de perfil)

Aplicar a mesma normalização (já é, porque `extractUsername` é partilhada) aos campos de concorrentes — sem alterações adicionais necessárias.

#### 2. Mensagem de erro mais clara para inputs que não são username
Manter o `t("actionBar.errors.invalid")` atual; apenas garantir que o texto continua compreensível. Não é preciso mexer nos JSONs `pt/landing.json` e `en/landing.json` — a normalização absorve os casos a/b/c sem disparar erro.

#### 3. Teste unitário
Criar `src/components/landing/__tests__/hero-action-bar-extract.test.ts` que exporte o helper (export nomeado em hero-action-bar.tsx) e cubra cada variação.

Para isso, exportar `extractUsername` no ficheiro original:
```ts
export function extractUsername(raw: string): string { ... }
```

Casos no teste:
- `chatgptricks` → `chatgptricks`
- `/chatgptricks/` → `chatgptricks`
- `@chatgptricks` → `chatgptricks`
- `  @/chatgptricks/  ` → `chatgptricks`
- `https://www.instagram.com/chatgptricks/` → `chatgptricks`
- `https://instagram.com/chatgptricks/?igsh=xyz` → `chatgptricks`
- `instagram.com/chatgptricks/reels/123` → `chatgptricks`
- `instagram.com/reel/XYZ123` → `""`
- `""` / `"   "` → `""`

### Validação
- `bunx tsc --noEmit`
- `bunx vitest run src/components/landing/__tests__/hero-action-bar-extract.test.ts`

### Fora de scope
- Não muda UI/layout do hero.
- Não muda lógica de análise nem chamadas a backend.
- Não muda o `reportUnlockSchema` server-side (já normaliza `@` e lowercase, e a homepage envia sempre o handle já normalizado pela rota `/analyze/$username`).