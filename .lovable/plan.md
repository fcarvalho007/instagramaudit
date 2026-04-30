## Resultado do smoke test (parcial)

Executei as verificações 1–4 e 5 ficou bloqueada por um bug crítico encontrado na verificação 3.

### ✅ Check 1 — Build/deploy
- Preview (`project--…-dev.lovable.app`) **já tem o novo build**.
- Produção (`instagramaudit.lovable.app`) **continua no build antigo** (404 nas rotas novas após >5 minutos a fazer poll). É preciso **carregar em Publish** depois de aprovado este plano.

### ✅ Check 2 — Snapshot endpoint
`GET /api/public/analysis-snapshot/by-id/683e4c21-…` no preview devolve **HTTP 200** com payload completo de `frederico.m.carvalho`. Apenas leitura ao Postgres — nenhuma chamada a Apify/DataForSEO/OpenAI.

### ✅ Check 4 — `buildSnapshotPrintUrl`
Output verificado: `${base}/report/print/${encodeURIComponent(snapshotId)}?pdf=1`. O `snapshotId` está incluído. Não há regressão `/report/print/?pdf=1`.

### ❌ Check 3 — Print route (BLOQUEADO)
Ao abrir `/report/print/683e4c21-…?pdf=1` no sandbox:

- **Navbar global visível** (não devia)
- **Footer global visível** (não devia)
- **Área central vazia** — nada do report renderiza
- Console mostra: `TypeError: Cannot read properties of null (reading 'setAttribute')`

**Causa raiz:** o `head()` da nova rota injecta:
```ts
scripts: [{ children: `document.body.setAttribute("data-theme","light")` }]
```
Como esta rota tem `ssr: false`, o script inline corre dentro de `<head>` **antes** do parser HTML chegar a `<body>` — logo `document.body` é `null` e o erro pára toda a árvore React. As outras rotas (`/analyze/$username`, `/report.example`) usam o mesmo padrão mas **com SSR ligado**, por isso `<body>` já existe quando o script corre.

### ⏸ Check 5–7 — PDFShift
Não chamado. Sem print route a renderizar, qualquer chamada ao PDFShift produziria um PDF em branco (ou pior, com a chrome global). Preferi parar e reportar.

---

## Fixes propostos (a implementar em build mode)

### 1. Eliminar o head script crashing
Em `src/routes/report.print.$snapshotId.tsx`:

- Remover o bloco `scripts: [...]` do `head()`.
- Manter o `ReportThemeWrapper` (que já tem `<ScriptOnce>` + `useEffect`) como única fonte do `data-theme="light"`. Para o PDFShift isso é suficiente: o `wait_for: "__pdfReady"` só dispara depois do React commit, do paint e do decode dos avatares — já há margem para o tema aplicar antes do snapshot.
- Como reforço extra (opcional, no mesmo ficheiro), aplicar `document.body.classList.add("pdf-print-mode")` num `useEffect` cedo em `PrintReportPage` — já existe.

Alternativa mais robusta: usar um script seguro que não assume `document.body`:
```ts
scripts: [{
  children: `(function(){var f=function(){document.body && document.body.setAttribute("data-theme","light")};` +
            `if(document.body){f()}else{document.addEventListener("DOMContentLoaded",f)}})()`
}]
```
Recomendo este reforço — evita um único frame de "dark flicker" antes do `ScriptOnce` correr.

### 2. Validar visualmente que navbar/footer ficam escondidos
A CSS em `src/styles/pdf-print.css` usa `body.pdf-print-mode > div > header/footer`. A estrutura DOM (confirmada em `__root.tsx` + `app-shell.tsx`) é exactamente `body > div > [header, main, footer]`. Os selectors devem casar — mas não foi possível confirmar porque a página crashou. Após o fix #1, vou tirar nova screenshot para confirmar.

### 3. Garantir que o PDFShift aponta para um build que tem a rota
A constante `DEFAULT_BASE` em `src/lib/pdf/print-url.server.ts` é `https://instagramaudit.lovable.app` (produção). Enquanto o publish não acontecer, o PDFShift carregaria a URL antiga e apanharia 404. Duas opções:

- **A (recomendada para testar agora):** definir o secret `PDF_PUBLIC_BASE_URL=https://project--b554ee82-2f67-4f5a-895d-cd69f2867df7-dev.lovable.app` temporariamente, correr o smoke test do PDFShift contra o build de preview, e depois apagar o secret quando o Publish estiver feito.
- **B (mais simples):** o utilizador clica em **Publish** primeiro; a seguir corro o smoke test directo contra produção sem mexer no secret.

Vou pedir a escolha entre A e B antes de continuar.

### 4. Completar Checks 5–7
Depois dos fixes acima, executar:
- `POST /api/public/public-report-pdf` com `{ snapshot_id: "683e4c21-…" }`
- Verificar `signed_url`, `cached: false` na 1ª chamada e `cached: true` na 2ª
- Sacar o PDF, converter cada página em imagem e inspeccionar (sem chrome global, sem skeleton dark, sem "A analisar perfil")
- Reportar `duration_ms`, `sandbox=true`, request status do PDFShift

### 5. Manter `@react-pdf/renderer` como rollback
Sem alterações — os ficheiros antigos ficam intactos até validação end-to-end.

---

## Acceptance recap após fixes

- [ ] Print route renderiza com snapshot real, sem console errors
- [ ] Navbar, footer, banner beta, CTAs hero, "Concluir relatório" todos escondidos
- [ ] `[data-pdf-ready]` e `window.__pdfReady` ficam true após settle
- [ ] PDFShift devolve `signed_url` em sandbox mode
- [ ] PDF visualmente próximo do report web
- [ ] Cache funciona (2ª chamada `cached: true`)
- [ ] Zero chamadas a Apify/DataForSEO/OpenAI
- [ ] `@react-pdf/renderer` mantido para rollback

## Ficheiros a tocar

- `src/routes/report.print.$snapshotId.tsx` — remover/proteger o head script
- (eventualmente) secret `PDF_PUBLIC_BASE_URL` se o utilizador escolher opção A
- (zero alterações em) `src/styles/pdf-print.css`, `src/lib/pdf/*`, endpoints PDF