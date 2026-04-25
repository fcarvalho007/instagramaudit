# Painel de Diagnóstico — Admin

Objetivo: adicionar uma secção **"Diagnóstico"** ao `/admin` que mostra o estado de readiness antes do smoke test Apify. Sem expor valores de segredos. Sem mexer em UI pública, `/report.example`, PDF ou email.

---

## O que se faz

### 1. Novo endpoint server-only: `GET /api/admin/diagnostics`

Protegido por `requireAdminSession` (mesma sessão usada pelos outros endpoints admin). Devolve um JSON com:

```ts
{
  secrets: {
    APIFY_TOKEN: boolean,
    RESEND_API_KEY: boolean,
    INTERNAL_API_TOKEN: boolean,
  },
  testing_mode: {
    active: boolean,           // isTestingModeActive()
    allowlist: string[],       // getAllowlist() — handles permitidos (não é segredo)
  },
  snapshots: {
    total: number,
    latest_at: string | null,           // updated_at do mais recente
    latest_username: string | null,
    latest_status: string | null,       // analysis_status
    latest_provider: string | null,
    latest_data_source: "fresh" | "cache" | "stale" | null,  // calculado de expires_at
  },
  report_requests: {
    total: number,
    latest_at: string | null,
    latest_request_status: string | null,
    latest_pdf_status: string | null,
    latest_delivery_status: string | null,
    latest_pdf_error: string | null,
    latest_email_error: string | null,
  },
}
```

**Como deteta segredos sem os expor:** `Boolean(process.env.X && process.env.X.length > 0)`. Nunca devolve o valor, só `true`/`false`.

**Queries:**
- `analysis_snapshots`: `count(*)` + `select(...).order(updated_at desc).limit(1)`.
- `report_requests`: `count(*)` + `select(...).order(updated_at desc).limit(1)`.

### 2. Novo componente: `src/components/admin/diagnostics-panel.tsx`

- Faz `fetch("/api/admin/diagnostics")` ao montar + botão "Atualizar".
- Renderiza 4 cartões, todos com tokens de design existentes (sem cores hardcoded):
  1. **Segredos** — três linhas com badge `Configurado` (verde) ou `Em falta` (vermelho/âmbar). Nunca mostra valores.
  2. **Modo de teste** — badge `Ativo` / `Desativo` + lista da allowlist em `font-mono`.
  3. **Snapshots** — total, último handle, último timestamp (formato pt-PT), `data_source` colorido (fresh/cache/stale).
  4. **Report requests** — total, último timestamp, badges de `request_status` / `pdf_status` / `delivery_status` (reutilizar `StatusBadge` existente). Mostra `pdf_error`/`email_error` em texto pequeno se existir.

### 3. Integração no `/admin`

Em `src/routes/admin.tsx`, adicionar tabs simples (Diagnóstico | Pedidos de relatório) usando `Tabs` do shadcn já presente em `components/ui/tabs.tsx`. Default: **Diagnóstico** (é o que se quer ver primeiro antes de Apify). Estado da tab em `useState`, sem router state.

---

## Ficheiros afetados

**Novos (2):**
- `src/routes/api/admin/diagnostics.ts` — endpoint GET.
- `src/components/admin/diagnostics-panel.tsx` — UI do painel.

**Editados (1):**
- `src/routes/admin.tsx` — adicionar `<Tabs>` com duas tabs (Diagnóstico, Pedidos). ~15 linhas alteradas.

**Reutilizados sem alterar:**
- `src/lib/admin/session.ts` (`requireAdminSession`).
- `src/integrations/supabase/client.server.ts` (`supabaseAdmin`).
- `src/lib/security/apify-allowlist.ts` (`isTestingModeActive`, `getAllowlist`).
- `src/components/admin/status-badge.tsx`.
- `src/components/ui/tabs.tsx`, `card.tsx`, `badge.tsx`, `button.tsx`.

**Não tocados:**
- `/report.example` e qualquer `report-*`.
- Endpoints de PDF/email.
- Frontend público (landing, `/analyze/$username`).
- Schema da BD (apenas leitura, zero migrações).
- Ficheiros bloqueados em `LOCKED_FILES.md`.

---

## Detalhes técnicos

- **Segurança:** endpoint usa `requireAdminSession()` antes de qualquer leitura. Sem sessão admin → 401 sem informação. Os segredos só são lidos via `process.env` no servidor — nunca chegam ao cliente exceto como `boolean`.
- **Resiliência:** cada query envolvida em try/catch — se a contagem de `analysis_snapshots` falhar, o painel mostra "—" nesse cartão e os outros continuam a funcionar.
- **Timestamps:** o servidor devolve ISO; o componente formata em pt-PT com `Intl.DateTimeFormat("pt-PT", ...)`.
- **`data_source` no último snapshot:** calculado server-side comparando `expires_at` vs `Date.now()` e idade vs janela stale (7 dias). Mesma lógica de `lib/analysis/cache.ts`, sem duplicar (importar `isFresh` / `isWithinStaleWindow`).
- **Sem mutações:** endpoint é só `GET`. Sem CSRF concerns para além do já existente na sessão.

---

## Smallest implementation step

Tudo numa só prompt — são ~3 ficheiros, ~150 linhas no total, todas isoladas no admin. Não há benefício em dividir mais.

---

## Como vai ser testado depois de implementado

1. Abrir `/admin` → tab **Diagnóstico** abre por default.
2. Verificar:
   - `APIFY_TOKEN`: Configurado ✅
   - `RESEND_API_KEY`: Configurado ✅
   - `INTERNAL_API_TOKEN`: Configurado ✅
   - Modo de teste: Ativo, allowlist `[frederico.m.carvalho]`.
   - Snapshots: 0 (ou mais, conforme histórico).
   - Report requests: 0 (ou mais).
3. Submeter uma análise para `frederico.m.carvalho` em `/analyze/frederico.m.carvalho`.
4. Voltar ao admin, clicar **Atualizar** → snapshot count incrementa, último timestamp atualiza, `data_source` mostra `fresh`.
5. Refrescar a análise (≤24h) → no admin, `data_source` continua `fresh` (mesma snapshot, sem nova chamada Apify).