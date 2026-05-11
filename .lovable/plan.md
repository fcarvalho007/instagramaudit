## Auditoria — /admin/email-lab + /admin/automacoes

Encontrei **3 bugs P0** (visíveis), **3 inconsistências de dados** e algumas hardcoded colors / refinamentos.

---

### P0 — Bugs visíveis

**1. Tokens `--admin-success-500` e `--admin-warning-500` não existem em `src/styles/admin-tokens.css`.**

Confirmado: existem `--admin-leads-500`, `--admin-danger-500`, `--admin-info-500` mapeados para Tailwind, mas `success`/`warning` só vivem como literais nas componentes — o que significa que estes elementos renderizam **sem cor** ou caem em fallback:

- `email-lab-page.tsx`: KPIs "Ligados" e "Sem trigger", `StatusPill` (Ligado/Sem trigger), `WiringTab` aviso, `KpiTile` tone success/warning.
- `templates-tab.tsx`: badges "Wired" / "Orphan".
- `automation-node.tsx`: `--admin-pill-active-fg` e `--admin-pill-warn-fg` (estes existem ✓), mas `categoryAccent('comercial')` em email-lab usa `--admin-warning-500` (broken).

**Fix:** adicionar tokens base + Tailwind aliases:
```css
--admin-success-500: 29 158 117;   /* #1D9E75 */
--admin-warning-500: 186 117 23;   /* #BA7517 amber */
--color-admin-success-500: rgb(var(--admin-success-500));
--color-admin-warning-500: rgb(var(--admin-warning-500));
```

**2. `FLOW_EVENTS` em `src/lib/admin/automation-flow-types.ts` tem nomes de evento errados** — confirmado por consulta a `product_events`:

| flow              | declarado                  | real em DB                  |
|-------------------|----------------------------|-----------------------------|
| welcome_beta      | `welcome_beta_sent`        | `beta_welcome_email_sent` ✓ |
| report_summary    | `report_summary_sent`      | `report_summary_email_sent` ✓ |
| personal_area_saved | `personal_area_saved_sent` | nunca emitido (genérico `brevo_email_sent`) |

Consequência: cards "Enviados" mostram `0` para flows que efectivamente enviam emails, e o KPI "Enviados (30d)" no topo subestima. O hint "evento ainda não emitido" aparece para flows wired no registry.

**Fix:**
- Trocar nomes para os reais (`beta_welcome_email_sent`, `report_summary_email_sent`).
- Marcar `welcome_beta` e `report_summary` como `instrumented: true` (já são — agora reflecte verdade).
- Manter `personal_area_saved` como `instrumented: false` (genuinamente sem evento dedicado) e juntar uma nota no card.

**3. KPI "A aguardar" tem dupla contagem.**

Em `automation-flow.ts`, `eligibleTotal = sum(eligibleCount)` por flow. Mas vários flows partilham a mesma fase do lifecycle como elegível (ex.: `relatorio_gerado.eligibleCount = countEq("em_analise")` e `link_enviado.eligibleCount = countEq("relatorio_gerado")`). Não há duplicação literal, mas o utilizador lê "X leads na fila" e na realidade são contagens cumulativas de várias fases que sobrepõem ao longo do funil — não corresponde a "quantas leads esperam acção agora".

**Fix:** calcular `eligibleTotal` como contagem distinta de leads cujo `commercial_status` está em `[novo_pedido, em_analise, relatorio_gerado, relatorio_visto]` (estados que aguardam acção do admin) — uma única query, sem somatórios.

---

### P1 — Hardcoded colors / consistência

**4. `email-lab-page.tsx`** — substituir `#1f2937` (botões "Enviar teste") por `rgb(var(--admin-button-dark))` que já existe.

**5. `eligibility-summary.tsx`** — quatro cores hex literais (`#534AB7`, `#D85A30`, `#BA7517`, `#888780`). Substituir por tokens (`--admin-leads-500`, `--admin-signal-500`, `--admin-warning-500`, `--admin-text-tertiary`).

**6. `email-lab-page.tsx` linha 567** — preview da row "Para" mostra string hardcoded `"{{email}} → frederico@digitalfc.com"` (email pessoal exposto). Trocar por apenas `{{email}}` ou usar email da sessão admin se disponível. Refinamento de privacidade.

---

### P2 — Refinamentos UX

**7. Botão "Enviar teste" em /admin/email-lab abre um modal placeholder** ("não está activado"). Padrão actual no /admin/automacoes para acções não implementadas é botão **disabled com tooltip "Disponível em breve"**. Alinhar: substituir o handler do dialog por um botão disabled + Tooltip, removendo `TestSendDialog` (ou mantendo só como dead-code comentado).

**8. KPI "Último teste" em /admin/email-lab** mostra hardcoded `—` / "sem dados" — sem utilidade. Substituir por **"Envios (30d)"** lendo de `product_events` (eventos `*_sent` agregados, mesma fonte que /admin/automacoes). Reaproveita query existente.

**9. Botão "⋯" em `automation-flow-page.tsx` `DisabledButton`** — `label=""` + sem `aria-label` → leitor de ecrã não tem texto. Adicionar `aria-label="Mais opções"`.

**10. `templates-tab.tsx`** usa `<a href="/admin/email-lab?...">` em vez de `<Link to>` do TanStack Router → causa full reload em vez de SPA nav. Trocar.

---

## Plano de correcção (cirúrgico, sem mexer em DB)

### Passo 1 — Tokens em falta (P0 #1)
Editar `src/styles/admin-tokens.css`:
- Adicionar `--admin-success-500` e `--admin-warning-500` (base + alias `--color-admin-*`).

### Passo 2 — Nomes de evento corrigidos (P0 #2)
Editar `src/lib/admin/automation-flow-types.ts`:
- `welcome_beta.types = ["beta_welcome_email_sent"]`, `instrumented: true`.
- `report_summary.types = ["report_summary_email_sent"]`, `instrumented: true`.
- `personal_area_saved` mantém `instrumented: false` mas adicionar comentário.

### Passo 3 — KPI "A aguardar" sem duplicação (P0 #3)
Editar `src/routes/api/admin/automation-flow.ts`:
- Calcular `eligibleTotal` directamente: `active.filter(s => ["novo_pedido","em_analise","relatorio_gerado","relatorio_visto"].includes(s)).length`.

### Passo 4 — `eligibility-summary.tsx` tokenizado (P1 #5)
Substituir as 4 cores hex por `rgb(var(--token))`.

### Passo 5 — `email-lab` botão dark + email leak + dialog → tooltip (P1 #4, #6, P2 #7)
- Trocar `#1f2937` → `rgb(var(--admin-button-dark))` (2 ocorrências).
- Linha 567: `value="{{email}} → frederico@digitalfc.com"` → `value="{{email}}"`.
- Substituir handler `onClick={() => setTestDialogOpen(true)}` por botão **disabled com `<Tooltip>`** ("Disponível em breve"). Remover `TestSendDialog` e estado `testDialogOpen` (dead code).

### Passo 6 — KPI "Último teste" → "Envios (30d)" (P2 #8)
- Adicionar fetch leve a `/api/admin/automation-flow` (já tem `kpis.sent.last30d`) e reutilizar valor; ou simples `useQuery` partilhado. Substituir tile.

### Passo 7 — A11y + nav refinements (P2 #9, #10)
- `automation-flow-page.tsx`: adicionar `aria-label="Mais opções"` ao `DisabledButton` square.
- `templates-tab.tsx`: trocar `<a href>` por `<Link to="/admin/email-lab" search={{ template: t.key }}>`.

### Passo 8 — Verificação
- `tsc --noEmit` verde.
- Visual: abrir `/admin/email-lab` (KPIs "Ligados"/"Sem trigger" com cor; status pills coloridas; botão "Enviar teste" disabled com tooltip).
- Visual: abrir `/admin/automacoes` (cards `welcome_beta` e `report_summary` mostram `Enviados ≥ 1`; KPI "A aguardar" coerente; sem hint "evento não emitido").

---

## Restrições

- Sem alterações de schema, providers, envio de emails reais.
- Sem novos endpoints (apenas correcções nos existentes).
- Sem mexer em `LOCKED_FILES.md` ou `src/integrations/supabase/*`.
- Cores só via tokens admin.

## Checkpoints

- ☐ Passo 1 — Tokens success/warning adicionados
- ☐ Passo 2 — Nomes de evento corrigidos em FLOW_EVENTS
- ☐ Passo 3 — KPI "A aguardar" sem dupla contagem
- ☐ Passo 4 — `eligibility-summary` tokenizado
- ☐ Passo 5 — email-lab tokens + privacidade + dialog → tooltip
- ☐ Passo 6 — KPI "Último teste" → "Envios (30d)"
- ☐ Passo 7 — a11y + Link router
- ☐ Passo 8 — Build + verificação visual
