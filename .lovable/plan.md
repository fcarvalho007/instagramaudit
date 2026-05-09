## Validação pós-publish — `/api/public/feedback/$requestId`

A rota existe em `src/routes/api/public/feedback.$requestId.ts` (GET + POST) e a página em `src/routes/feedback.$requestId.tsx`. Faltava só estarem em produção. Validar agora que `instagramaudit.lovable.app` foi publicado.

### Pré-requisitos

- Confirmar que o utilizador clicou **Publish/Update** após as últimas alterações.
- Obter um `report_request_id` válido para teste (sugestão: o utilizador fornece um ID controlado de QA, ou usamos o último `report_request` da Frederico, em modo read-only para o GET; o POST destrutivo só corre se o utilizador autorizar 1 submissão de teste).

### Testes

| # | Método | URL | Esperado | Como validar |
|---|---|---|---|---|
| 1 | GET (browser) | `https://instagramaudit.lovable.app/feedback/not-a-uuid` | HTML da SPA com estado "link inválido" (sem blank page) | `browser--navigate_to_url` + `browser--observe` para confirmar texto |
| 2 | GET (HTTP) | `https://instagramaudit.lovable.app/api/public/feedback/not-a-uuid` | 400 JSON `{ ok:false, code:"INVALID_ID" }` (ou equivalente do handler), **não** HTML | `stack_modern--invoke-server-function` |
| 3 | GET (HTTP) | `https://instagramaudit.lovable.app/api/public/feedback/<valid-rr-id>` | 200 JSON `{ ok:true, leadFirstName, handle, alreadySubmitted }` | idem |
| 4 | POST (HTTP) | mesmo URL, payload válido conforme `feedbackFormSchema` | Primeira: 200 `{ ok:true }`. Segunda imediata: `ALREADY_SUBMITTED` | idem; **só corre se o utilizador autorizar uso do `requestId` real** |
| 5 | POST (HTTP) | mesmo URL, body `{}` | 400 `{ code:"INVALID_PAYLOAD" }` | idem |

### Constraints respeitadas

- Sem chamadas a Apify/DataForSEO/OpenAI/Resend.
- Sem geração de PDF.
- Único side-effect possível: 1 INSERT em `beta_feedback` + transição de `commercial_status` para `feedback_recebido` (teste 4) — só com autorização explícita e `requestId` indicado.
- Testes 1, 2, 3, 5 são read-only.

### Output a entregar

PASS/FAIL por linha com URL exato, HTTP status, response shape (primeiros 200 chars) e veredicto final: **production ready** ou **bloqueado** (com causa).

### Necessário do utilizador

1. Confirmação de que o publish já foi feito.
2. Um `report_request_id` real para os testes 3 e 4 (idealmente um lead de QA controlado). Sem isso só posso correr 1, 2 e 5.
