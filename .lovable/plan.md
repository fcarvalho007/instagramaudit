
# Auditoria + plano: PDF e imagens dos top posts

## A · Botão PDF — diagnóstico

**Fluxo atual:** `ReportFinalBlock.handlePdf` abre `window.open("about:blank")` síncronamente → faz `POST /api/public/public-report-pdf` com `{ snapshot_id }` → endpoint devolve `{ success, signed_url, cached, error_code? }` → atribui `popup.location.href = signedUrl`. Se `popup` for `null` (popup blocker), guarda `pdfFallback` em estado e mostra um link clicável.

**O que está correto:**
- `snapshotId` é passado pelo `analyze.$username.tsx:215` (`<ReportFinalBlock snapshotId={state.snapshotId} />`).
- O endpoint devolve `signed_url` válido (TTL 600s).
- O popup é aberto **antes** do `await fetch`, preservando o user-gesture.
- Existe fallback `<a>` quando o popup é bloqueado.
- Toasts com mensagens pt-PT por `error_code`.

**O que pode falhar (causas raiz prováveis):**
1. **Popup aberto antes do guard.** Se o utilizador clicar com `pdfStatus === "loading"` ou `!snapshotId`, abrimos uma aba em branco e depois fazemos `return` — a aba fica órfã. Pequeno, mas ruidoso em dev e com double-click.
2. **Sem feedback visual antes da resposta.** O botão muda label para "A preparar PDF…", mas não há indicador na zona do fallback. Se o popup for bloqueado silenciosamente (Brave / Safari estrito), só o toast anuncia — fácil de perder.
3. **Toast pode ser engolido** se o utilizador faz scroll rápido ou se outro toast cobre. O fallback inline é a única garantia, mas só aparece após resposta.

**Correções mínimas (sem mexer no endpoint nem em locked files):**
- Mover o `snapshotId / loading` guard **antes** do `window.open`.
- Detetar imediatamente popup bloqueado (`!popup || popup.closed`) **antes** do `await`, marcar uma flag `popupOpen` interna; se bloqueado, fazer pedido na mesma e revelar fallback assim que `signed_url` chega.
- Após sucesso quando o popup foi bloqueado, **revelar também um aviso visual permanente no botão** (já temos `pdfFallback`, basta destacá-lo melhor — não é mudança grande).
- Garantir que o `try` cobre o `popup.location.href = signedUrl` (alguns browsers atiram em popups cross-origin); se atirar, cair no fallback inline.

---

## B · Imagens dos top posts — diagnóstico

**Confirmado por leitura direta do snapshot `4d656311-9212-482a-b843-c21fb8f50cca`:**

```
posts[0].thumbnail_url = https://scontent-sjc6-1.cdninstagram.com/v/t51.71878-15/685140797_…jpg?…oe=69F7B672…
posts[0].permalink     = https://www.instagram.com/p/DXru9YbjmYN/
posts[1].thumbnail_url = https://scontent-sjc6-1.cdninstagram.com/v/…oe=69F79D76…
```

→ **As URLs reais existem no payload**. `oe` (expiry) está em Nov/2026: válidas por semanas.

**Bug exacto:** `buildTopPosts` em `src/lib/report/snapshot-to-report-data.ts:448-462` faz:
```ts
return sorted.slice(0, 5).map((p, idx) => ({
  …
  thumbnail: THUMB_GRADIENTS[idx % THUMB_GRADIENTS.length],
  …
}));
```
Ignora `p.thumbnail_url` e devolve sempre o gradient. O `report-top-posts.tsx` (LOCKED) renderiza apenas o gradient via `post.thumbnail`. Não importa o que o snapshot traga — nunca chega à UI.

**Conflito com locked files:** `report-top-posts.tsx` está em `LOCKED_FILES.md` (linha 76). Não podemos adicionar `<img>` lá.

### Duas opções para resolver sem violar lock:

**Opção 1 — Recomendada: pedir aprovação para tornar `report-top-posts.tsx` "image-aware".**
Adicionar uma única alteração mínima ao locked file: aceitar `post.thumbnailUrl?: string` opcional; quando presente, renderizar `<img>` por cima do gradient (gradient continua como fallback de loading e via `onError`). Zero mudanças no `/report/example` porque o mock continua sem `thumbnailUrl`.

Mudanças:
- `report-mock-data.ts` (LOCKED): adicionar campo opcional `thumbnailUrl?: string` ao tipo de `topPosts`. Mock continua igual.
- `report-top-posts.tsx` (LOCKED): se `post.thumbnailUrl` existir, renderizar `<img referrerPolicy="no-referrer" loading="lazy" onError={…}>` absolute inset-0 sobre o gradient.
- `snapshot-to-report-data.ts`: passar `p.thumbnail_url` para `thumbnailUrl`.

Vantagem: única solução que toca o componente certo e mantém a paridade visual com `/report/example`.
Desvantagem: requer autorização explícita para 2 locked files.

**Opção 2 — Sem tocar locked: companion overlay.**
Criar `src/components/report-enriched/report-enriched-top-posts-images.tsx` que faz absolute-position de `<img>` sobre cada card do top-posts já renderizado. Posiciona via querySelector ou re-renderiza o grid em paralelo dentro de um wrapper relativo.

Vantagem: zero mudanças em locked files.
Desvantagem: frágil (depende da DOM do componente locked), duplica markup, custoso de manter, e o gradient continua a aparecer em flash. Não recomendado.

### Detalhes técnicos da Opção 1
- `referrerPolicy="no-referrer"` — Instagram CDN bloqueia requests com Referer fora do `instagram.com`. Sem isto, todas as imagens dão 403.
- `onError` → esconde o `<img>` (`e.currentTarget.style.display = "none"`); o gradient por baixo fica visível, sem cards vazios.
- `loading="lazy"` e `decoding="async"` — não bloqueia o LCP.
- Sem rehosting agora. Se daqui a 4 semanas começar a haver expiries (`oe` no passado), criamos uma rota `/api/public/post-image-proxy` que faz fetch server-side e cacheia no bucket — fora deste prompt.

---

## Plano de implementação (assume aprovação da Opção 1)

### Ficheiros a editar
1. `src/components/report-share/report-final-block.tsx`
   - Mover guard `snapshotId / pdfStatus` para antes do `window.open`.
   - Envolver `popup.location.href = signedUrl` em try/catch; em caso de erro, revelar `pdfFallback`.
   - Pequeno destaque visual extra no fallback (mantém estilo actual, só adiciona `aria-live="polite"` e ícone).

2. `src/components/report/report-mock-data.ts` ⚠️ **LOCKED — pedir confirmação**
   - Adicionar `thumbnailUrl?: string` ao tipo dos elementos de `topPosts`. Mock continua idêntico (não definir o campo).

3. `src/components/report/report-top-posts.tsx` ⚠️ **LOCKED — pedir confirmação**
   - Adicionar dentro do `<div className="relative aspect-square …gradient">`:
     ```tsx
     {post.thumbnailUrl ? (
       <img
         src={post.thumbnailUrl}
         alt=""
         loading="lazy"
         decoding="async"
         referrerPolicy="no-referrer"
         onError={(e) => { e.currentTarget.style.display = "none"; }}
         className="absolute inset-0 h-full w-full object-cover"
       />
     ) : null}
     ```
   - Garantir que o badge de formato e o ícone `ExternalLink` continuam por cima (já são `absolute top-3 …`, ficam acima do `<img>` por ordem do DOM ou um `z-10` discreto).

4. `src/lib/report/snapshot-to-report-data.ts`
   - Em `buildTopPosts`, adicionar `thumbnailUrl: typeof p.thumbnail_url === "string" ? p.thumbnail_url : undefined` ao objeto retornado.
   - Manter `thumbnail` (gradient) como fallback.

### Não tocar
- `/report/example` (mock continua sem URL → comportamento idêntico).
- OpenAI / DataForSEO / Apify.
- Schema da BD.
- `src/integrations/supabase/*`.
- Endpoint do PDF — está correto.

### Validação
- `bunx tsc --noEmit`
- `bun run build`
- QA visual: `/analyze/frederico.m.carvalho` em desktop e 375px.
  - Confirmar 5 imagens reais nos top posts.
  - Confirmar que clicar "Pedir versão PDF" abre o PDF numa nova aba (Chrome) e mostra fallback (Brave com popup blocker).
  - Confirmar `/report.example` inalterado.
- Sem chamadas a Apify / DataForSEO / OpenAI.
- Sem overflow horizontal a 375px.

### Risco residual
- Imagens Instagram CDN podem dar 403 em alguns browsers que ignoram `referrerPolicy`. Nesse caso o `onError` esconde a imagem e o gradient fica — visualmente igual ao actual. Sem regressão.
- Se 4-6 semanas depois começarem a expirar URLs, próximo prompt será criar proxy server-side com cache em `report-pdfs/post-thumbs/`.

---

## Pergunta antes de avançar

A Opção 1 implica editar dois ficheiros locked (`report-mock-data.ts` + `report-top-posts.tsx`) — alterações mínimas e retro-compatíveis com `/report/example`. **Confirmas autorização para os tocar?** Se preferires manter os locked intactos, implemento só o fix do PDF e adiamos as imagens para um prompt dedicado a renegociar o lock ou a Opção 2 (companion overlay).
