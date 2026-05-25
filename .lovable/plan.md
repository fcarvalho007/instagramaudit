## Auditoria de consistência comercial — read-only

**Veredicto: 🟡 GO com 2 fixes obrigatórios antes do lançamento público.**

As superfícies-core (`/precos`, `PremiumInterestDialog`, `ReportBlockNav`, header, footer, emails) estão alinhadas com `7€` / `28€` / `5,60€/relatório` / `Poupa 20%` / sem subscrição. Existem **2 superfícies públicas com preços e planos antigos** (`beta.request.tsx` + i18n da cobertura visual) e **uma família de componentes obsoletos** que mostra Pro/Agency mas está desligada de qualquer rota.

---

### Respostas diretas

1. **Pricing correto está em**: `/precos`, `PremiumInterestDialog`, `ReportBlockNav` (AccessSummaryCard), header/footer (link para `/precos`), `commercial-followup` email, `app/plan` (redirect → `/precos`), `app/account` (estado fixo "Conta ativa"). Todos com `7€` / `28€` / `5,60€` / `Poupa 20%` / "Sem subscrição. Sem renovação automática." / `pending_note`.

2. **Preços antigos visíveis ao utilizador**:
   - `beta.request.tsx` (rota pública `/beta/request`): `€9,90` / `€49,90` / `€29,90/mês` + "Plano Pro mensal" + "Pack 10 análises".

3. **Pro / Agency / mensal / "em breve" / "sob proposta" ainda visíveis**:
   - **Público**: `beta-request-form.tsx` (acima) e i18n `report.json` chaves `cover.fallback.public_title` / `score_public_title` ("disponível na versão Pro" / "Score visual · Pro") consumidas pela `ScorePanelUnavailable` no estado público do relatório.
   - **Dead code** (não montado em rota nenhuma): `report-gate-modal.tsx`, `post-analysis-conversion-layer.tsx`, `premium-locked-section.tsx`, `report-tier-teaser.tsx`, `public-analysis-dashboard.tsx` — todos com Pro/Agency/`mailtoPro`/`mailtoAgency`/"em breve"/"Sob proposta"/`€29`.
   - **Admin only**: `admin/v2/visao-geral`, `admin/v2/receita`, `admin/v2/relatorios`, `admin/v2/automacoes`, `admin/v2/email-lab`, `mock-data.ts` (subscrição/Pro/Agency em mocks e métricas).
   - **Back-compat interna**: `brevo/enum-mappers.ts` (`subscription`), `brand/contact.ts` (`mailtoPro` / `mailtoAgency`, JSDoc-deprecated), `unlock-schema.test` (`subscription_monthly` para validar back-compat do enum).
   - **i18n internal-only**: `gate.json` `userType.agency` é **segmentação**, não pricing — safe.

4. **Safe ignore** (admin / dev / back-compat):
   - `admin/v2/*` (todos os ficheiros), `lib/admin/mock-data.ts`, `lib/admin/event-labels.ts`.
   - `brevo/enum-mappers.ts`, `brand/contact.ts` (deprecated).
   - `unlock-schema.test.ts`.
   - `gate.json` `userType.agency` (segmentação).
   - "em breve" em contextos não-comerciais: `cache-status-badge` ("A expirar em breve" = retenção), `report.json` roadmap de redes sociais (Facebook/TikTok/LinkedIn em breve), `automacoes/templates-tab` ("Editar em breve").

5. **Visível ao utilizador, tem de ser corrigido**:
   - **P0** `beta.request.tsx` "Preços indicativos" (€9,90 / €49,90 / €29,90/mês + Plano Pro mensal).
   - **P1** `report.json` `cover.fallback.score_public_title` / `public_title` (substituir "versão Pro"/"Pro").
   - **P1** Apagar (ou desligar) o conjunto `PublicAnalysisDashboard` + filhos para evitar risco de uma rota futura voltar a montar copy obsoleta.

6. **Copy de checkout é honesto?**
   - **Sim** em `/precos`, `PremiumInterestDialog`, `commercial-followup`: `pending_note` "Pagamento brevemente disponível — o botão regista o teu interesse." e `trust_note` "Sem subscrição. Sem renovação automática."
   - **Não** em `beta-request-form.tsx`: "Preços indicativos" sugere uma tabela real de preços com plano mensal, sem dizer que checkout não está ativo. E nos componentes dead-code (`post-analysis-conversion-layer` diz "Em fase beta — sem checkout disponível" mas mostra "Pedir acesso Pro" / "Sob proposta" — confuso se for reativado).

7. **CTA que finge pagamento ativo?**
   - **Não** nas superfícies live. As CTAs em `/precos` e modal só emitem `pricing_option_clicked` e mostram `pending_note`. A CTA Free navega para `/`.
   - **Risco latente** no `beta-request-form` ("submeter pedido beta" + preços de planos mensais) e no dead code (`Pedir acesso Pro` via `mailtoPro`).

---

### Tabela por superfície

| Surface | Current copy | Expected copy | Status | Recommended action |
|---|---|---|---|---|
| `/precos` | Free / 7€ / 28€ · 5,60€/relatório · Poupa 20% · "Sem subscrição. Sem renovação automática." · pending_note | idem | ✅ OK | — |
| `PremiumInterestDialog` (sidebar `ReportBlockNav`) | Incluído / 7€ / 28€ · Poupa 20% · trust+pending notes | idem | ✅ OK | — |
| `ReportBlockNav` AccessSummaryCard | "1 relatório ou pack de 5. Sem subscrição." + pending_note | idem | ✅ OK | — |
| `commercial-followup` email | 7€ / 28€ · 5,60€/relatório, poupas 20% · "Sem subscrição. Sem renovação automática." | idem | ✅ OK | — |
| Header / Footer | Link único `/precos` | idem | ✅ OK | — |
| `/app/plan` | `redirect → /precos` | idem | ✅ OK | — |
| `/app/account` | Badge fixo "Conta ativa" | idem | ✅ OK | — |
| `report.json` `nav.access.pending_note` PT/EN | "Pagamento brevemente disponível — os botões registam o teu interesse." | idem | ✅ OK | — |
| **`beta.request.tsx` "Preços indicativos"** | "Relatório único €9,90 · Pack 10 análises €49,90 · Plano Pro mensal €29,90/mês" · "Testadores beta terão condições especiais." | "1 relatório 7€ · Pack 5 28€ (5,60€/relatório)" · sem mensal · sem Pro | 🔴 needs fix (P0) | Reescrever bloco para 2 linhas (7€/28€) + remover Pro mensal; deixar nota "Pagamento brevemente disponível". |
| **`report.json` `cover.fallback.public_title` / `score_public_title`** PT/EN | "Análise visual disponível na versão Pro." / "Score visual · Pro" | "Análise visual disponível em secção premium." / "Score visual · Premium" | 🟠 needs fix (P1) | Trocar "versão Pro" / "Pro" por "premium" em 4 chaves (2 PT + 2 EN). |
| `report.json` `gate.tier.pro` / `tier.pro_active` | "Pro" / "Pro ativo" | "Premium" / "Premium ativo" | 🟠 needs fix (P1) | Renomear etiquetas para alinhar com "premium" usado no resto da UI pública. |
| `gate.json` `userType.agency` | "Agência" / "Agency" | igual (é segmentação de perfil, não pricing) | ⚪ safe ignore | Nenhuma. |
| **`public-analysis-dashboard.tsx` + `report-gate-modal.tsx` + `post-analysis-conversion-layer.tsx` + `premium-locked-section.tsx` + `report-tier-teaser.tsx`** | Pro/Agency, €29, "Em breve", "Sob proposta", `mailtoPro`, `mailtoAgency` | dead code — não montado em nenhuma rota | 🟠 needs fix (P1) | Apagar a árvore (ou marcar `@deprecated` + remover exports) para eliminar risco de regressão. |
| `brand/contact.ts` `mailtoPro` / `mailtoAgency` | exports deprecated | nenhum consumidor live | 🟡 safe ignore agora | Remover quando os componentes dead code forem apagados. |
| `brevo/enum-mappers.ts` `subscription` ID | back-compat de telemetria histórica | manter para não partir leads antigos | ⚪ safe ignore | Documentar como deprecated e migrar quando todos os dados antigos saírem do sistema. |
| `admin/v2/*` (revenue/intent/relatorios/email-lab/automacoes) + `mock-data.ts` | Pro/Agency/€29/subscrição/em breve | interno admin | ⚪ safe ignore | Nenhuma. |
| `cache-status-badge` "A expirar em breve" | retenção, não comercial | idem | ⚪ safe ignore | Nenhuma. |
| `report.json` roadmap (TikTok/LinkedIn/Facebook "em breve") | roadmap de produto, não pricing | idem | ⚪ safe ignore | Nenhuma. |

---

### Recomendação antes de partilhar publicamente

- **Bloquear o lançamento até resolver**: bloco "Preços indicativos" em `/beta/request`. É o único ponto onde um utilizador externo vê `€29,90/mês` e "Plano Pro mensal" — contradiz frontalmente todo o resto do produto.
- **Fix recomendado em conjunto** (mesma sprint, baixo risco):
  1. Atualizar `beta-request-form.tsx` para 2 linhas (7€ / 28€) com microcopy honesto.
  2. Trocar `versão Pro` → `secção premium` nas 4 chaves `cover.fallback.*` e renomear `tier.pro` / `tier.pro_active` → "Premium" / "Premium ativo".
  3. Apagar `PublicAnalysisDashboard` + 4 filhos (e em consequência `mailtoPro` / `mailtoAgency` de `brand/contact.ts`).
- Depois disso: 🟢 **GO** para sharing público sem reservas.

Sem alterações de código nesta passagem.
