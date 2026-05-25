## Final validation — GO/NO-GO

**Veredicto: NO-GO para beta público** até resolver os dois bloqueadores abaixo. Tudo o resto está saudável.

---

### 1. Análise fresh pública (natgeo / chatgptricks) — ❌ BLOQUEADOR

A flag `APIFY_TESTING_MODE` não está a desativar o allowlist em produção. Evidência em `analysis_events`:

- `natgeo` 2026-05-25 10:52 → `blocked_allowlist` / `PROFILE_NOT_ALLOWED`
- `chatgptricks` 2026-05-25 09:40 → `blocked_allowlist` / `PROFILE_NOT_ALLOWED`

`robs.cortez` correu fresh em 15:53 (12 posts, custo $0.011, duração 7.6s) — mas apenas porque foi adicionado ao `APIFY_ALLOWLIST`, não porque o testing-mode foi desativado.

Causa em `src/lib/security/apify-allowlist.ts`:
```ts
return process.env.APIFY_TESTING_MODE !== "false"; // default ON
```
O valor atual da secret não é a string literal `"false"`, então o allowlist continua a bloquear todos os handles fora da lista.

**Ação necessária (operacional, sem código):** definir `APIFY_TESTING_MODE=false` (literal) nas secrets e republicar. Validar com 1 fresh a `natgeo` ou `chatgptricks`.

---

### 2. Email `report-summary` perdido — ❌ BLOQUEADOR

`product_events` não contém `report_summary_email_sent` nem `report_summary_email_failed` para os 2 unlocks mais recentes (frederico.m.carvalho 13:58; robs.cortez 16:00). Só `beta_welcome_email_sent` aparece (e só para o frederico).

Causa em `src/lib/unlock.server.ts` linhas 475-496: `sendLeadMagnetSequence` é invocada dentro de `void (async () => {...})()` fire-and-forget. O comentário do passo 7 (Brevo sync) já reconhece que "Cloudflare Workers terminate background async work as soon as the response is returned (no `waitUntil` is registered here)" — e na sequência lead-magnet o welcome (~300ms) por vezes passa, mas o summary que vem a seguir é morto pelo runtime.

**Fix proposto:** alinhar com o passo 7 — `await sendLeadMagnetSequence(...)` em vez de fire-and-forget. A função internamente já tem try/catch por cada email, não throwa e não bloqueia o utilizador (unlock continua a responder). Custo: +500–1500 ms de latência no unlock, aceitável.

---

### 3. Cache — ✅ OK

`robs.cortez` após fresh às 15:53:
- 15:59:11 → `data_source=cache` (130 ms)
- 15:59:32 → `data_source=cache` (86 ms)

Nenhum hit adicional ao Apify. `analysis_execution_mode = fresh` em `app_config`. Toggle `cache_only` validado em sessões anteriores (handles `chatgptrick`, `martimsilvai`, `nonexistent_*` ficam `blocked_cache_only`).

---

### 4. UX pública — ✅ OK (sem teste manual no browser)

`bunx vitest run normalize-handle.test.ts` → 31/31 passa, cobrindo `@handle`, `/handle/`, `instagram.com/handle`, `https://www.instagram.com/handle/?hl=en` e variantes inválidas. Não há indício de regressão; sem teste de browser nesta volta (regra do prompt: 1 fresh paid no máximo).

---

### 5. Custo observado

| item | valor |
|---|---|
| Apify fresh `robs.cortez` (estimado) | $0.011 |
| Apify fresh `robs.cortez` (actual) | $0.000 (ainda não importado do billing) |
| OpenAI insights/visual/caption (enrichment) | ~$0.039 |
| **Total real desta volta de validação** | ~$0.05 |

Dentro do `APIFY_HARD_CAP_USD` e `OPENAI_DAILY_CAP_USD`. Cache evitou cobranças repetidas no mesmo handle.

---

### Resumo executivo

- **Cache evita custo repetido:** sim
- **Custo provider observado:** ~$0.05 nesta volta
- **Lead magnet entrega:** parcial — welcome chega às vezes, summary nunca chegou nos 2 unlocks recentes
- **Pronto para partilhar publicamente:** não, antes dos 2 fixes acima

---

### Plano de correção (a executar após aprovação)

1. **Secret operacional** (sem código): definir `APIFY_TESTING_MODE=false` nas secrets do projeto. Validar com 1 fresh `natgeo` ou `chatgptricks`. Esperado: `data_source=fresh`, `provider_call_logs` com nova entrada Apify, `analysis_events.outcome=success`.

2. **Code edit cirúrgico** em `src/lib/unlock.server.ts` (passo 6, linhas 475-496): trocar o `void (async () => {...})().catch(...)` por um `await sendLeadMagnetSequence(...)` envolvido em try/catch igual ao passo 7. Manter o `import()` dinâmico. Não tocar em mais nada.

3. **Re-validação:** novo unlock com email não-conhecido para um handle já em cache (evita gastar Apify); confirmar em `product_events` a sequência: `beta_welcome_email_sent` + `report_summary_email_sent` (ou `_failed`/`_skipped_no_data` com razão visível).

Sem alterações de UI. Sem alterações de schema. Sem alterações nos prompts AI. Sem novo email enviado para leads existentes.

**Checkpoint final antes de partilhar publicamente:**
- ☐ `APIFY_TESTING_MODE=false` aplicado e republicado
- ☐ Fresh em handle fora do allowlist → `outcome=success`
- ☐ `unlock.server.ts` passa a aguardar `sendLeadMagnetSequence`
- ☐ Novo unlock produz `report_summary_email_sent` em `product_events`
- ☐ Cache continua a servir o 2º pedido do mesmo handle
