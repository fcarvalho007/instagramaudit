# Smoke test PDFShift no preview (Opção A)

Objetivo: validar Checks 5–7 do fluxo PDFShift contra o build do preview, usando o snapshot existente `683e4c21-60e0-4045-b43a-dfcd85fe9896`. Sem Publish, sem chamadas a Apify/DataForSEO/OpenAI, sem mexer em renderer antigo.

## Passos

1. **Atualizar secret runtime**
   - `PDF_PUBLIC_BASE_URL` = `https://project--b554ee82-2f67-4f5a-895d-cd69f2867df7-dev.lovable.app`
   - `PDF_RENDER_SANDBOX` = `true` (manter)
   - Sem outras alterações em secrets.

2. **Aguardar propagação do build do preview**
   - Poll leve a `/report/print/683e4c21-60e0-4045-b43a-dfcd85fe9896?pdf=1` até HTTP 200, para garantir que o fix do `wait_for` (script síncrono) e o clamp de timeout 30s já estão no preview.

3. **Check 5 — primeira chamada (cache miss)**
   - `POST https://project--…-dev.lovable.app/api/public/public-report-pdf`
   - Body: `{"snapshot_id":"683e4c21-60e0-4045-b43a-dfcd85fe9896"}`
   - Validar: HTTP 200, `signed_url` presente, `cached=false`, `sandbox=true`, `duration_ms` registado.
   - Inspecionar logs do server-fn / route para confirmar chamada à PDFShift em modo sandbox.

4. **Check 6 — segunda chamada (cache hit)**
   - Repetir o mesmo POST imediatamente.
   - Validar: HTTP 200, `cached=true`, sem nova conversão PDFShift (confirmar via logs / duration baixa).

5. **Check 7 — inspeção visual do PDF**
   - Descarregar o `signed_url` para `/tmp/smoke.pdf`.
   - Renderizar páginas como PNG (pdftoppm) e abrir cada uma para verificar:
     - dados reais do snapshot
     - sem navbar, footer, beta banner, botões Export PDF/Share
     - sem skeleton escuro, sem “A analisar perfil”, sem página central em branco
     - imagens renderizam ou falham com graceful fallback
     - quebras de página aceitáveis
   - Imagens de QA ficam em `/tmp` (não copiar para `/mnt/documents`).

6. **Relatório final ao utilizador**
   - PDFShift status (HTTP + watermark sandbox)
   - `sandbox=true/false`
   - `duration_ms` (1.ª e 2.ª chamada)
   - `signed_url` da 1.ª chamada
   - resultado de cache (miss → hit)
   - veredicto visual do PDF (OK / problemas concretos)
   - `error_excerpt` se algo falhar
   - Recomendação: prosseguir para Publish ou corrigir antes.

## Garantias

- Sem Publish.
- Sem alterações ao endpoint, ao schema de resposta ou ao renderer antigo (`@react-pdf/renderer` permanece para rollback).
- Sem chamadas a Apify, DataForSEO ou OpenAI (apenas snapshot existente + PDFShift sandbox).
- Após o smoke test, parar e aguardar decisão do utilizador sobre Publish.

## Detalhes técnicos

- Uso de `secrets` tool para atualizar `PDF_PUBLIC_BASE_URL`.
- `code--exec` com `curl` para chamadas ao endpoint público e download do PDF.
- `pdftoppm` (via `nix run nixpkgs#poppler_utils`) para gerar PNGs de QA.
- Logs via `supabase--edge_function_logs` ou `stack_modern--server-function-logs` se necessário para confirmar `cached` e chamada PDFShift.

## Checklist

- ☐ Secret `PDF_PUBLIC_BASE_URL` atualizado para o URL do preview
- ☐ Build do preview confirmado pronto
- ☐ Check 5 (cache miss) validado
- ☐ Check 6 (cache hit) validado
- ☐ Check 7 (inspeção visual) validado
- ☐ Relatório final entregue, sem Publish
