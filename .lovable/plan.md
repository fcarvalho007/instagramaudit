# Fix: Export PDF — substituir @react-pdf/renderer por print-to-PDF externo

## Diagnóstico (confirmado em logs de produção)

```
[error] [public-report-pdf] render failed
RuntimeError: Aborted(CompileError: WebAssembly.instantiate():
Wasm code generation disallowed by embedder)
```

`@react-pdf/renderer@4.5.1` depende de `yoga-layout` (WASM). O Cloudflare Worker de produção bloqueia compilação WASM em runtime. Os 3 endpoints partilham o mesmo `renderReportPdf` → todos falham hoje.

## 1. Provedor recomendado: **PDFShift**

### Comparação técnica (validada nas docs reais de cada um)

| Requisito | PDFShift | MarkupGo |
|---|---|---|
| URL-to-PDF API | Sim (`source` aceita URL ou HTML) | Sim, mas docs públicas escassas (página `/docs/url-to-pdf` está 404) |
| Esperar por sinal de pronto | Sim — `wait_for` (nome de **função JS global** que retorna truthy, timeout 30s) + `wait_for_network` | Não documentado publicamente |
| A4 portrait | Sim — `format: "A4"` (default), `landscape: false` (default) | Documentado apenas via SDK Node, sem detalhe REST |
| Margens controladas | Sim — `margin` aceita objecto/string/integer | Documentação ausente |
| Print background | Sim — `disable_backgrounds: false` (default) | Sim no SDK Node (`printBackground: true`) |
| Auth API key server-side | Sim — header `X-API-Key` | Sim, mas requer SDK Node ou HTTP genérico |
| Resposta binária | Sim — bytes PDF directos no body 200 | Resposta JSON com task → fetch posterior |
| React/Tailwind | Sim — Chromium 116/142, escolhível por `X-Processor-Version` | Chromium implícito |
| Pricing previsível | Free 50 PDFs/mês; Lite $9/mês 500 PDFs; sandbox ilimitado | Free tier limitado; pricing menos transparente |
| Cloudflare Worker `fetch` | Sim — basta `fetch` com `X-API-Key` + JSON body | Sim com HTTP genérico |

### Porquê PDFShift e não MarkupGo

- **Documentação pública completa e versionada** (`docs.pdfshift.io`). MarkupGo tem links 404 nas próprias docs e o ciclo URL-to-PDF assenta em SDK Node.
- **`wait_for` real** — confirma na doc que espera por uma função JS global retornar truthy, exactamente o que precisamos para garantir que o report está pintado antes do snapshot.
- **Resposta binária num único request síncrono** — MarkupGo devolve `task` JSON que requer polling adicional, complicando o handler do Worker.
- **Sandbox mode gratuito** com watermark — permite-nos iterar sem consumir o free tier.
- **Custo previsível**: 50 PDFs grátis cobrem o estado actual; cache do bucket faz com que cada `snapshot_id` distinto consuma 1 crédito apenas.

### Detalhe importante sobre `wait_for`

PDFShift `wait_for` espera por **função JS global**, não selector CSS. Adaptação no nosso lado:

- O componente `/report/print/$snapshotId` define `window.__pdfReady = () => document.querySelector("[data-pdf-ready]") !== null`.
- Pedido enviado com `wait_for: "__pdfReady"`.
- O atributo `[data-pdf-ready]` continua a ser a marca semântica única no DOM (útil para QA visual e futura troca para MarkupGo).

## 2. Arquitectura: abstracção de provedor

```text
src/lib/pdf/
├── render-via-browser.server.ts    ← entrada única que dispatcha por env
├── providers/
│   ├── types.ts                     ← interface BrowserPdfProvider
│   ├── pdfshift.server.ts           ← implementação concreta (única para já)
│   └── (markupgo.server.ts)         ← stub deixado por escrever; criar quando necessário
└── print-url.server.ts              ← constrói URL pública do /report/print/<snapshotId>?pdf=1
```

Interface partilhada:

```ts
export interface BrowserPdfProvider {
  readonly name: "pdfshift" | "markupgo";
  render(args: {
    url: string;
    waitForGlobalFn?: string;
    timeoutMs?: number;
    sandbox?: boolean;
  }): Promise<Uint8Array>;
}
```

`render-via-browser.server.ts` lê `process.env.PDF_RENDER_PROVIDER` **dentro** do handler. Default `"pdfshift"`. Adicionar `"markupgo"` é só registar nova entry no map.

## 3. Rota dedicada `/report/print/$snapshotId`

Nova rota cliente que renderiza o report a partir de `snapshot_id` (não trigga pipeline):

- Loader fetcha **directamente** `/api/public/analysis-snapshot/by-id/<snapshotId>` (novo subendpoint pequeno) — nunca chama `/api/analyze-public-v1`.
- Reusa `ReportShell` exactamente como `/analyze/$username` reusa.
- Aplica modo PDF quando `?pdf=1`: classe `pdf-print-mode` no `<body>`, esconde:
  - navbar global
  - botão Exportar PDF + Partilhar do hero
  - `BetaFeedbackBanner`
  - `ReportFinalBlock` (o CTA empilhado no fim)
  - footer global do site
- Após `state === "ready"` + `requestAnimationFrame` duplo + decode dos avatares → marca `data-pdf-ready` no wrapper raiz e expõe `window.__pdfReady`.

A página é pública (snapshot já é público via `/analyze`), e está no path `/report/print/...` — fora de `/api/public/*` por ser HTML, mas igualmente sem auth.

## 4. Endpoints — substituição cirúrgica

| Endpoint | Mudança |
|---|---|
| `src/routes/api/public/public-report-pdf.ts` | Substituir `renderReportPdf({...})` por `renderViaBrowser({ url: buildPrintUrl({snapshotId}), waitForGlobalFn: "__pdfReady" })`. Resto (cache check, upload, sign, log, error mapping) intacto. |
| `src/routes/api/generate-report-pdf.ts` | Mesma substituição. URL construída a partir do `analysis_snapshot_id` do report request (nunca do `report_request_id`). |
| `src/routes/api/admin/regenerate-pdf.ts` | Não muda — chama `/api/generate-report-pdf` por HTTP, herda fix automaticamente. |
| `src/lib/orchestration/run-report-pipeline.ts` | Não muda — também passa por `/api/generate-report-pdf`. |

`isNormalizedPayload` continua a validar antes de chamar o renderer — protege contra snapshots malformados sem desperdiçar crédito PDFShift.

## 5. Subendpoint novo: `/api/public/analysis-snapshot/by-id/$snapshotId`

Necessário porque o endpoint actual `/api/public/analysis-snapshot/$username` resolve por handle. A rota `/report/print/$snapshotId` precisa carregar **exactamente** o snapshot identificado por UUID (não a versão mais recente).

- GET → `select id, instagram_username, normalized_payload, created_at from analysis_snapshots where id = $1`
- Mesmo shape de resposta que o endpoint por username já usa.
- Sem mutações. Sem chamadas a providers.

## 6. Ficheiros a criar / editar

### Criar
- `src/lib/pdf/render-via-browser.server.ts`
- `src/lib/pdf/providers/types.ts`
- `src/lib/pdf/providers/pdfshift.server.ts`
- `src/lib/pdf/print-url.server.ts`
- `src/routes/report.print.$snapshotId.tsx`
- `src/routes/api/public/analysis-snapshot.by-id.$snapshotId.ts`

### Editar (cirúrgico)
- `src/routes/api/public/public-report-pdf.ts` — trocar 1 chamada
- `src/routes/api/generate-report-pdf.ts` — trocar 1 chamada
- `src/components/report-redesign/report-shell.tsx` — adicionar `data-pdf-ready` no wrapper + classe condicional `pdf-print-mode`
- `src/styles.css` (ou tokens equivalentes) — adicionar regras `body.pdf-print-mode { ... }` que escondem navbar/footer/CTAs

### NÃO tocar
- `src/lib/pdf/render.ts` (mantido para rollback rápido)
- `src/lib/pdf/report-document.tsx` (mantido)
- `package.json` — `@react-pdf/renderer` permanece instalado até validação real
- `/report/example`
- Schema BD
- Pipeline Apify/DataForSEO/OpenAI
- `LOCKED_FILES.md` entries

## 7. Secrets necessários

A pedir via `add_secret` quando o plano for aprovado:

| Nome | Tipo | Valor sugerido | Onde se obtém |
|---|---|---|---|
| `PDFSHIFT_API_KEY` | runtime | sk_xxx | Dashboard PDFShift após signup gratuito em https://pdfshift.io |
| `PDF_RENDER_PROVIDER` | runtime | `pdfshift` | hardcoded por nós; permite swap futuro |
| `PDF_PUBLIC_BASE_URL` | runtime | `https://instagramaudit.lovable.app` | URL público estável já existente |
| `PDF_RENDER_SANDBOX` | runtime | `true` em preview, `false` em produção | controla flag `sandbox` da PDFShift |

Todas lidas com `process.env.X` **dentro** do handler/helper, nunca a nível módulo. Defaults seguros se faltarem (provider=pdfshift, sandbox=true).

## 8. Avaliação de risco

| Risco | Mitigação |
|---|---|
| PDFShift demora >10s em snapshots pesados | `timeout: 60` no body + `wait_for` cap interno 30s. Se falhar, mantém-se rollback para o renderer antigo (não removido) via flag de provedor `?provider=legacy`. |
| Quota gratuita esgotada (50/mês) | Cache no bucket por `snapshot_id` evita renders repetidos. Telemetria existente em `analysis_events` regista cada chamada. Sandbox em preview = 0 créditos consumidos. |
| Avatares Instagram expiram → logo no PDF aparece partido | A rota de print usa `/api/public/ig-thumb` (proxy já existente, locked). Sem regressão. |
| `/report/print/$snapshotId` indexável por motores de busca | `<meta name="robots" content="noindex,nofollow">` na head da rota. |
| Provedor cai (downtime PDFShift) | Logs de erro existentes + `error_code: "RENDER_FAILED"` propagado intacto. UX exibe a mesma toast actual ("Falha ao gerar… Tenta novamente"). |
| Rollback se algo correr mal em produção | `@react-pdf/renderer` continua instalado e `src/lib/pdf/render.ts` intacto. Reverter = trocar 2 linhas em 2 endpoints. |

## 9. Plano de smoke test (a executar após implementação)

1. **Build**: `bunx tsc --noEmit` + `bunx vitest run` → verde.
2. **PDFShift dry-run** (sandbox): invocar `POST /api/public/public-report-pdf` com `snapshot_id=683e4c21-60e0-4045-b43a-dfcd85fe9896`. Esperar `signed_url` válido apontando para `report-pdfs/reports/snapshots/2026/04/683e4c21....pdf`.
3. **Confirmar no signed URL**: PDF abre, capa contém `@frederico.m.carvalho` real, não placeholder.
4. **Verificar logs**: zero chamadas a Apify/DataForSEO/OpenAI no período do teste (query a `provider_call_logs`).
5. **Cache hit**: segundo POST com mesmo `snapshot_id` devolve `cached: true` sem novo render.
6. **QA visual**: converter as primeiras páginas do PDF para imagens (`pdftoppm`) e inspeccionar — navbar/banner/CTAs ausentes; conteúdo editorial idêntico ao web.
7. **Endpoint email-flow**: `POST /api/generate-report-pdf` com um `report_request_id` real → confirmar mesmo path de upload e `request_status` final correcto.
8. **Rollback verificado**: trocar provider env, confirmar que helper consegue voltar a chamar o renderer antigo (smoke test só de tipos/wiring).

## 10. Resultado esperado

- Export PDF volta a funcionar em produção, com fidelidade visual ao web report.
- Frontend não muda (mesmos endpoints, mesmas respostas).
- Cache, telemetria, idempotência, error handling — todos preservados.
- Provedor abstraído: trocar para MarkupGo no futuro = criar 1 ficheiro novo + mudar `PDF_RENDER_PROVIDER`.
- Rollback de 2 minutos disponível.
- 0 chamadas a providers de dados (Apify/DFS/OpenAI) durante o pipeline PDF.

Aguardando aprovação para implementar e pedir o `PDFSHIFT_API_KEY`.
