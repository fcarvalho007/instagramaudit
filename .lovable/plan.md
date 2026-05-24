## Lote D — Fluxo de análise pública + Unlock

Adicionar EN paralelo a toda a experiência pública pós-landing: rota `/analyze/$username`, dashboard, skeleton, estados de erro e modais de gateway/unlock. PT-PT continua canónico.

### 1. Novos namespaces i18n

Criar em `src/i18n/locales/{pt,en}/`:

- **`analyze.json`** — strings da rota e do dashboard
  - `meta.title`, `meta.description` (com `{{username}}`)
  - `header.*` — handle, badges (Pública, Cache, Fresca), botões (Atualizar / Refresh, Nova análise / New analysis)
  - `skeleton.*` — labels de carregamento
  - `dashboard.*` — KPIs (Seguidores, Publicações, Engagement, Frequência…), secções (Benchmark, Concorrentes, Insights), CTAs
  - `conversionLayer.*` — banda "Desbloquear relatório completo"
  - `premiumLocked.*` — placeholder de secções PRO
  - `pricingFeedback.*` — sheet de pricing
- **`gate.json`** — gateway + unlock modal
  - `lockGate.*` — badge "Acesso gratuito · BETA" / "Free access · BETA", título serif, subtítulo com `{{handle}}`, CTA "Ver relatório gratuito" / "View free report", footer micro-tags (tempo, GDPR, autoria)
  - `unlockModal.*` — passos, labels de form (nome, email, consent), erros de validação, sucesso, botões
- **`errors.json`** — mensagens canónicas de erro server-side mapeadas a UI
  - `CACHE_ONLY_NO_DATA`, `PROFILE_NOT_ALLOWED`, `RATE_LIMITED`, `BUDGET_EXCEEDED`, `PROVIDER_ERROR`, `UNKNOWN`
  - Cada chave: `title`, `description`, `cta` (quando aplicável)

Registar os 3 namespaces em `src/i18n/index.ts` (resources sync, como `landing`/`auth`).

### 2. Ficheiros a localizar

Rota:
- `src/routes/analyze.$username.tsx` — `head()` (title, description, og), boundary copy.

Componentes (`src/components/product/`):
- `analysis-header.tsx`
- `analysis-skeleton.tsx`
- `analysis-error-state.tsx` — usar `errors.json` mapeado por código retornado pelo serverFn
- `analysis-metric-card.tsx` — labels/tooltips
- `analysis-benchmark-block.tsx`
- `analysis-competitor-comparison.tsx`
- `public-analysis-dashboard.tsx` — orquestrador
- `post-analysis-conversion-layer.tsx`
- `premium-locked-section.tsx`
- `pricing-feedback-sheet.tsx`
- `report-lock-gate.tsx` — usar `gate.lockGate.*`
- `report-gate-modal.tsx` — duplicado/legacy; verificar se ainda é referenciado e localizar ou marcar para remoção
- `unlock-modal.tsx` — usar `gate.unlockModal.*` (form, validações Zod com mensagens i18n, success state)

### 3. Regras transversais

- Hook: `useTranslation("<namespace>")` por componente (sem grandes refactors estruturais).
- Datas/números: usar helpers existentes em `src/lib/i18n/format.ts` em qualquer label novo que use número ou data (não substituir formatadores especializados do report v2).
- `useLanguage` já sincroniza `<html lang>` pós-hidratação — sem alterações.
- Toggle PT↔EN no header continua a funcionar sem reload.
- Nenhuma alteração a lógica de negócio: serverFns, validação Zod (apenas mensagens), gating, budget, sanitização permanecem intactos.
- LOCKED_FILES.md: adicionar nota de edição autorizada para `unlock-modal.tsx` e `report-lock-gate.tsx` (já tocados anteriormente — confirmar entrada).

### 4. Fora de âmbito (próximos lotes)

- Lote E: árvore `/report/*` (Block 1-6, tiered copy, AI insight strings).
- Lote F: beta request, feedback forms.
- Lote G: páginas legais (`/privacidade`, `/termos`, `/aviso-legal`, `/cookies`) e meta SEO global.
- Área `_authenticated/*` (account, plan, reports) — Lote B restante.

### Checkpoint

- [ ] `analyze.json`, `gate.json`, `errors.json` criados (PT + EN) e registados
- [ ] Rota `analyze.$username.tsx` com `head()` localizado
- [ ] Todos os componentes `src/components/product/*` listados a consumir `t()`
- [ ] `report-lock-gate.tsx` + `unlock-modal.tsx` 100% sem strings hardcoded
- [ ] Mensagens de erro mapeadas via `errors.json` por código
- [ ] Validações Zod do unlock devolvem chaves i18n
- [ ] Toggle PT↔EN testado em `/analyze/<handle>` (cached e fresh) sem reload e sem hydration mismatch
