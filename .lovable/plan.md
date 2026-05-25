# Plano — i18n PT/EN do fluxo público de relatório (scope cirúrgico)

## 1. Estado actual (auditoria)

Infra-estrutura completa, parcialmente cablada:

- `src/i18n/index.ts` — i18next síncrono, init `lng:"pt"`, namespaces:
  `common, header, landing, footer, auth, analyze, gate, errors, report, unsubscribe`.
- `src/hooks/use-language.ts` + `src/components/layout/language-switcher.tsx`
  já existem e mudam idioma sem reload (`i18n.changeLanguage`, sync com
  `localStorage` + `document.documentElement.lang`).
- Hydration-safe: SSR sempre `pt`; switch só após mount via `useEffect`.

**Ficheiros in-scope e cobertura:**

| Ficheiro | Estado | Acção |
|---|---|---|
| `routes/analyze.$username.tsx` | ✅ wired (sync title/meta em runtime via `tAnalyze.meta.*`, error codes via `errors` ns) | nenhuma |
| `routes/reports.$snapshotId.tsx` | ❌ **PT hardcoded** em `NotFoundState`, `ExpiredState`, `ErrorState`, mensagem do `catch`, body do `EmptyShell` ("Voltar aos relatórios"), `head().title`/og | **CABLAR** |
| `components/product/unlock-modal.tsx` | ✅ 8× `useTranslation` (gate ns completo) | scan residual |
| `components/product/analysis-error-state.tsx` | ⚠️ 2× wired mas 2 constantes top-level com fallback PT (`DEFAULT_CACHE_ONLY_TITLE/BODY`) usadas só quando i18n falha — aceitável | scan residual |
| `components/product/analysis-skeleton.tsx` | ✅ wired (analyze ns) | nenhuma |
| `components/product/report-lock-gate.tsx` | ✅ 3× wired (gate ns) | scan residual |
| `components/report-redesign/v2/*` (hero, kpi, lock CTA, block-nav, lock-gate banner, cache-status-badge, etc.) | ✅ todos têm `useTranslation` para `report` ns | scan rápido por strings PT cruas |

**Componentes não usados no fluxo público (dead code, fora de scope):**
`analysis-header.tsx`, `report-gate-modal.tsx`, `premium-locked-section.tsx`,
`public-analysis-dashboard.tsx` — nenhum import vivo. **Não tocar.**

**Restante já fora do scope desta tarefa:** `/admin`, CRM, diagnósticos, beta utilities, blocos 3–6 internos.

## 2. Strings novas a adicionar

### 2.1 Namespace `errors` — extender com snapshot route states

PT (`src/i18n/locales/pt/errors.json`):
```json
"snapshot": {
  "loadFailed": "Não foi possível carregar este relatório. Tenta novamente.",
  "networkFailed": "Falha de ligação.",
  "notFoundTitle": "Relatório não encontrado",
  "notFoundBody": "Este relatório já não existe ou o identificador é inválido. Podes gerar um novo relatório quando quiseres.",
  "expiredTitle": "Relatório expirado",
  "expiredBodySuffix": "Para ver dados actuais de @{{handle}}, gera um novo relatório.",
  "errorTitle": "Não foi possível carregar",
  "ctaNewReport": "Gerar novo relatório",
  "ctaAnalyzeNew": "Analisar novo perfil",
  "ctaBackToReports": "Voltar aos relatórios"
}
```

EN (`src/i18n/locales/en/errors.json`):
```json
"snapshot": {
  "loadFailed": "We couldn't load this report. Please try again.",
  "networkFailed": "Connection failed.",
  "notFoundTitle": "Report not found",
  "notFoundBody": "This report no longer exists or the identifier is invalid. You can generate a new one any time.",
  "expiredTitle": "Report expired",
  "expiredBodySuffix": "To see current data for @{{handle}}, generate a new report.",
  "errorTitle": "Couldn't load the report",
  "ctaNewReport": "Generate new report",
  "ctaAnalyzeNew": "Analyze a new profile",
  "ctaBackToReports": "Back to reports"
}
```

E traduzir as 12 chaves existentes `INVALID_USERNAME`…`FALLBACK` para EN (já existem em PT, faltam em EN — verificar; provavelmente já estão).

### 2.2 Namespace `report` — chaves `snapshot.meta`

```json
"snapshot": {
  "metaTitle": "Relatório · InstaBench" / "Report · InstaBench"
}
```

(Usado para sync de `document.title` em runtime no `reports.$snapshotId.tsx`.)

## 3. Mudanças de código

### 3.1 `src/routes/reports.$snapshotId.tsx`
- Importar `useTranslation`.
- `NotFoundState`, `ExpiredState`, `ErrorState`, `EmptyShell`: aceitar strings
  via props (já aceita) — *callers* passam `t("snapshot.notFoundTitle")`, etc.
- Substituir `"Voltar aos relatórios"` (linha 221) por `t("snapshot.ctaBackToReports")`.
- Substituir `formatRetentionMessage()` + sufixo PT por `formatRetentionMessage()` + `t("snapshot.expiredBodySuffix", { handle })`. (`formatRetentionMessage` é util de `lib/report/retention.ts` — verificar se já é i18n-aware; se não, deixar como está e só interpolar o sufixo traduzido.)
- Mensagem do `catch` (`"Falha de ligação."`) e fallback (`"Não foi possível carregar este relatório…"`) → `t("snapshot.networkFailed")` / `t("snapshot.loadFailed")`.
- Sync `document.title` em runtime via `useEffect` espelhando o padrão de `analyze.$username.tsx` (l.170-181): `t("snapshot.metaTitle")` no `report` ns.
- `head()` SSR mantém PT canónico (não muda — i18n hidrata depois).

### 3.2 `formatRetentionMessage`
Verificar se já lê i18n. Se não, ler de `t("snapshot.retentionMessage")` no
ns `report` (mais provável: ficheiro retorna texto fixo). **Decisão**: se
estiver fora de componente React (lib pura), manter PT canónico e mover a
mensagem inteira para chave dedicada `report.snapshot.retentionMessage`
e construí-la no componente. Sub-tarefa do 3.1.

### 3.3 Audit residual (passada de leitura, sem mudanças se nada surgir)
- `unlock-modal.tsx`, `report-lock-gate.tsx`, `analysis-error-state.tsx` —
  procurar literais PT que escaparam.
- `report-redesign/v2/*` — grep por strings PT cruas em JSX (ex.:
  `"Análise"`, `"Voltar"`, `"Carregar"`, `"€"` em CTAs).
  - Esperado: vazio ou near-vazio. Quaisquer achados → ns `report` ou `gate`
    conforme contexto.

### 3.4 `analyze.$username.tsx`
- Nenhuma alteração de lógica.
- *Opcional, baixo risco*: alinhar `tErrors("NETWORK_FETCH")` para
  `tErrors("snapshot.networkFailed")` se quisermos chave única. **Decisão:
  manter** `NETWORK_FETCH` (já existe e está cablado). Não consolidar.

### 3.5 Hidratação — verificar que NÃO há regressão
- `head()` continua em PT (SSR canónico).
- Sync de title/og em runtime via `useEffect` (espelha `analyze.$username.tsx`).
- Nenhuma string nova lida em SSR initial render.

## 4. Validação

```bash
bunx tsc --noEmit
bunx vitest run
```

Manual (browser):
1. PT default em `/analyze/frederico.m.carvalho` — copy PT.
2. Switcher → EN. Recarrega não — basta navegar. UI passa para EN sem reload.
3. Forçar erro (URL inválido) — error state em EN.
4. Abrir `/reports/<id-inexistente>` em EN — `notFoundTitle/body` em EN.
5. `/reports/<id-expirado>` em EN — `expiredTitle` + sufixo `{{handle}}` em EN.
6. Unlock modal — copy EN (já estava EN-pronto via `gate` ns).

## 5. Constraints

- Sem alterar lógica de análise, fetch, RLS, providers.
- Sem mexer admin/CRM/beta utilities/dead components.
- Sem mover copy do `gate` / `analyze` / `report` ns já existente — só
  adicionar `errors.snapshot.*` e `report.snapshot.metaTitle`.
- Sem mudar SSR `head()` (evita mismatch).
- Defaults PT preservados.

## 6. Output esperado no fim do build

- **Ficheiros alterados**: `routes/reports.$snapshotId.tsx`,
  `i18n/locales/pt/errors.json`, `i18n/locales/en/errors.json`,
  `i18n/locales/pt/report.json`, `i18n/locales/en/report.json` (+ eventuais
  componentes onde a auditoria residual encontre literais).
- **Namespaces tocados**: `errors` (adicionar `snapshot.*`), `report`
  (adicionar `snapshot.metaTitle` ± `retentionMessage`).
- **Strings intencionalmente não traduzidas**: handles Instagram (`@xxx`),
  IDs de snapshot, marca `InstaBench`, error codes brutos (vivem em logs).
- **Gaps remanescentes** (fora deste scope, listar): blocos 3–6 internos,
  componentes dead-code, /admin completa, copy de emails transaccionais
  (vive em `templates.ts`).

## 7. Checkpoint

☐ Auditar grep final por strings PT em `routes/reports.$snapshotId.tsx`.
☐ Adicionar chaves `errors.snapshot.*` PT+EN.
☐ Adicionar chave `report.snapshot.metaTitle` PT+EN.
☐ Refactor `reports.$snapshotId.tsx` para usar `useTranslation` + sync title.
☐ Audit residual rápido em `unlock-modal`, `report-lock-gate`, `analysis-error-state`, `report-redesign/v2/*` (corrigir só achados pontuais).
☐ `bunx tsc --noEmit` + `bunx vitest run`.
☐ Validação manual PT/EN no preview.
