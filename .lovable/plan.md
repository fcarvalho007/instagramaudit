## Plano — Executar tudo (P0 → P3) no máximo alcance

Ordem por dependência e risco. Cada bloco é um checkpoint independente que valido antes do seguinte.

---

### Bloco A · P0 · Email infra (desbloqueia beta externo)

A1. Configurar secret `RESEND_FROM` (ex.: `Instagram Audit <relatorios@instagramaudit.pt>`).
A2. Configurar secret `PUBLIC_APP_BASE_URL` (ex.: `https://instagramaudit.lovable.app`) e usar como fonte única em todos os emails (deprecar fallback via `PDF_PUBLIC_BASE_URL`).
A3. Verificação do domínio no Resend (SPF/DKIM/DMARC) — guio passo a passo, valores são colados pelo utilizador no DNS.
A4. Smoke test: disparar `personal-area-saved` para email externo real e confirmar entrega + ausência de `personal_area_email_failed` em `product_events`.

> Requer dois `add_secret` interativos (A1, A2). Bloco arranca aí.

---

### Bloco B · P1 · Completude funcional

B1. **Decisão `commercial-followup`** — proponho ligar a um botão admin no Lead Detail Sheet ("Enviar follow-up comercial") que dispara o template já existente, marca `commercial_followup_sent` em `product_events` e atualiza `leads.contacted_at`. Alternativa: remover renderer + testes. Recomendo ligar (esforço baixo, valor alto).

B2. **Tab "Comunicação" no Lead Detail Sheet** (#3291) — timeline cronológico filtrado por eventos `*_email_*`, `report_link_sent`, `feedback_*`, com badges de estado (enviado/falhado) e timestamp relativo.

B3. **Display de cache** (#3100) — em `/analyze/$username` e em `/admin/perfis/$handle`, mostrar "Última atualização: há X · válida até Y" com timestamp absoluto em tooltip, em vez do estado críptico atual.

---

### Bloco C · P2 · Robustez

C1. **Rate limit em 3 endpoints públicos** (`/api/public/report-unlock`, `/api/public/feedback`, `/api/public/request-full-report`):
   - Implementação via tabela `public_request_throttle` (IP hash + endpoint + bucket de tempo) com índice parcial e cleanup por cron diário. 5 req/10min e 20 req/24h por IP+endpoint.
   - Resposta 429 com mensagem PT-PT.

C2. **Fluxo encurtado para returning leads** — novo endpoint `/api/public/unlock-check` (POST email) que devolve campos já conhecidos. Modal salta passos preenchidos e mostra apenas confirmação + pricing.

C3. **Testes HTTP para `report-unlock`**: novo lead, returning lead, idempotência (mesma chamada 2× → 1 só `report_request`).

---

### Bloco D · P3 · Observabilidade

D1. Painel `/admin/sistema` — secção "Falhas de email recentes" (últimos 7d de `personal_area_email_failed` + `report_link_email_failed`) com lead, timestamp, erro, e ação "reenviar".

D2. **Métrica de funil unlock** em `/admin/visao-geral` — gráfico `unlock_email_submitted → ownership → goal → user_type → pricing → unlock_completed` com drop-off por passo (últimos 30d).

---

### Detalhes técnicos (referência)

- Migrações novas: `public_request_throttle` (B/C1), índice parcial `idx_product_events_email_failures` (D1).
- Server functions novas: `unlock-check.ts` (C2), `commercial-followup-send.ts` (B1).
- Componentes novos: `LeadCommunicationTimeline.tsx` (B2), `CacheStatusBadge.tsx` (B3), `EmailFailuresPanel.tsx` (D1), `UnlockFunnelChart.tsx` (D2).
- Tudo segue tokens `src/styles/tokens-light.css`, Inter+Fraunces, sem novas deps.
- `tsc --noEmit` + `vitest` verdes obrigatórios após cada bloco.

---

### Ordem de execução e checkpoints

```text
A (P0 emails) → STOP, valido entrega externa
   ↓
B (P1 funcional) → STOP, validas Comunicação tab + cache display
   ↓
C (P2 robustez) → STOP, valido rate limit + returning flow
   ↓
D (P3 observabilidade) → fim
```

☐ Aprovas começar pelo Bloco A (preciso pedir os 2 secrets)?
☐ Em B1, ligar `commercial-followup` (recomendado) ou remover?
☐ Algum bloco a saltar / despriorizar?