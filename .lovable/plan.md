# Auditoria de readiness MVP — InstaBench

> Auditoria **read-only**. Sem alterações implementadas. Decisão e descobertas abaixo.

---

## 1. Sumário executivo

O sistema está **funcionalmente completo** para um beta controlado: TypeScript limpo (`tsc --noEmit` OK), 341/341 testes a passar, RLS activo nas tabelas sensíveis, kill-switches Apify/OpenAI/DataForSEO presentes, fluxo público (analyze → unlock → email → `/app/reports`) end-to-end implementado, snapshots imutáveis Phase 2 persistidos, página `/reports/$snapshotId` cache-only, páginas legais (privacidade, termos, aviso legal, cookies) publicadas e ligadas no footer e no modal de unlock.

Há, porém, **uma inconsistência crítica de identidade do operador** entre o modal de unlock (mostra `DIGITALFC` com NIF placeholder `509XXXXXX`) e a Política de Privacidade (`Fomentar Sonhos, Lda.`, morada e contactos completos em Leiria). Isto é visível ao utilizador público no momento exacto em que entrega dados pessoais e quebra credibilidade RGPD. É o único bloqueador real.

## 2. Decisão final

**GO LIMITED** — pronto para beta privado controlado (≤30 utilizadores conhecidos, convidados directamente, com aviso explícito de "versão beta") **assim que o P0 abaixo for corrigido** (≈ 1 prompt). Sem o P0 corrigido: NO-GO para qualquer convite externo.

## 3. Score de readiness

**82 / 100**

- Engenharia (tsc, testes, RLS, kill-switches): 95
- Fluxo público end-to-end: 90
- Email + Brevo + Resend: 85
- Privacidade/consentimento: 70 (penalizado pelo P0 abaixo)
- Admin/CRM: 85
- Operacional (cleanup, monitoria): 75
- Copy/UX pública: 85

## 4. O que está pronto

- **Build & qualidade**: `bunx tsc --noEmit` sem erros; `bunx vitest run` 32 ficheiros / 341 testes verdes.
- **Routing público**: `/`, `/analyze/$username`, `/reports/$snapshotId`, `/app/reports`, `/app/reports/$id`, `/login`, `/signup`, `/reset-password`, `/beta/request`, `/feedback/$requestId`.
- **Legais**: `/privacidade` (310 linhas, Fomentar Sonhos Lda. com morada e DPO), `/termos`, `/aviso-legal`, `/cookies` — todos linkados no footer e a partir do unlock modal.
- **Unlock flow**: 4 passos, consentimento RGPD obrigatório (`gdpr_consent`), marketing opcional separado, validação Zod.
- **Snapshots Phase 2**: `report_snapshots` persistido em unlock público, beta request e admin generate; idempotente (3 camadas); 15 dias de retenção; testes cobrem race condition e exclusão de heavy fields.
- **`/reports/$snapshotId`**: cache-only, `ssr: false`, `noindex,nofollow`, lê via `/api/public/analysis-snapshot/by-id/:id` sem chamar Apify/OpenAI/DataForSEO.
- **Email**: Brevo como primário (`BREVO_FROM_EMAIL`/`BREVO_FROM_NAME`), Resend como fallback (`RESEND_FROM`); ambos os secrets configurados; testes de templates e duplicate protection passam.
- **Segurança**:
  - RLS activo em `leads`, `report_requests`, `report_snapshots`, `analysis_snapshots`, `beta_feedback`, `product_events`, `profiles`.
  - `report_snapshots` com policy `user_id = auth.uid()`. `report_requests` idem. `profiles` com SELECT/UPDATE próprios.
  - `service_role` apenas em ficheiros `*.server.ts` / `client.server.ts` — nenhum leak para o bundle do browser.
  - Kill-switches `APIFY_ENABLED`, `OPENAI_ENABLED`, `DATAFORSEO_ENABLED` (literal `"true"` necessário, fail-closed).
  - Admin com allowlist por email (`ADMIN_ALLOWED_EMAILS`), todas as rotas `/admin/*` com `noindex,nofollow`.
- **Admin CRM consolidado**: sidebar com 5 grupos (Negócio / Contactos / Produto / Laboratório / Sistema). Pipeline e Tabela apontam para `/admin/beta-leads` (com tabs). Sem mocks "Clientes" ou "Pedidos" expostos.

## 5. O que não está pronto

| Área | Problema |
|---|---|
| Identidade do operador | `unlock-modal.tsx` mostra `DIGITALFC` + NIF `509XXXXXX` (placeholder) ao público, em conflito directo com a Política de Privacidade que identifica `Fomentar Sonhos, Lda.` |
| Tabelas sem policies (defesa em profundidade) | `leads`, `analysis_snapshots`, `beta_feedback`, `product_events` têm RLS ON mas zero policies → acesso só via `supabaseAdmin`. Funciona, mas se algum dia uma rota de cliente tentar SELECT directo, falha silenciosa |
| Pagamentos | Não implementado intencionalmente — mas é preciso confirmar que nenhum CTA público promete pagamento ou liga a checkout inexistente |
| Cleanup retention | `/api/admin/reports/cleanup-expired` existe mas não foi confirmado se há cron agendado a correr os 15 dias |
| Smoke test email | Não confirmado registo de envio real recente (welcome + report summary) com domínio final |

## 6. P0 — bloqueia testes públicos

1. **Inconsistência de identidade no unlock modal** (`src/components/product/unlock-modal.tsx`, linhas 53-57). `OPERATOR_INFO` tem `name: "DIGITALFC"`, `nif: "509XXXXXX"`. A Política de Privacidade diz `Fomentar Sonhos, Lda.`, NIF real, morada em Leiria. **Mostrar um NIF inventado ao recolher dados pessoais é um problema legal e de confiança imediato.** Substituir pela entidade real ou remover a linha de NIF.

## 7. P1 — corrigir antes de beta mais alargado

1. **Smoke test end-to-end de email** com domínio de produção: 1 unlock real → confirmar (a) Brevo contact criado, (b) welcome email entregue, (c) report summary email entregue, (d) link no email abre `/reports/$snapshotId` correcto, (e) PDF storage signed URL funciona.
2. **Cleanup automático** (`reports.cleanup-expired`): confirmar se há `pg_cron` ou rotina externa agendada; se não, agendar antes de o primeiro snapshot atingir 15 dias.
3. **Auditar CTAs públicos** (`/`, `/analyze/$username` empty/locked state, footer) à procura de promessas de "premium", "subscrição", "checkout" sem destino real.
4. **Adicionar policies SELECT explícitas** em `leads`, `beta_feedback`, `product_events` (mesmo que `false`/restritivas) — defesa em profundidade contra futura rota client-side criada por engano.
5. **Verificar `data-lovable-blank-page-placeholder`** e mocks restantes (busca rápida) — `report.example` é intencional mas validar que não está acessível por nav pública.

## 8. P2 — pode esperar

1. Migrar `/reports/$snapshotId` para ler de `report_snapshots` (Phase 3 já planeada). Hoje continua a ler `analysis_snapshots`, o que tem caveat documentada (upsert por cache_key dentro de 15d).
2. Página de erro 404/500 globais customizadas em pt-PT.
3. Accessibility pass no unlock modal (focus trap, aria).
4. Métrica admin de "snapshots persistidos vs falhas" (`product_event` `report_snapshot_persist_failed`).
5. Política de cookies: implementar banner ou confirmar que não usamos cookies não-essenciais.

## 9. Acções manuais necessárias (do utilizador)

1. **Confirmar entidade legal** para o unlock modal: "Fomentar Sonhos, Lda." + NIF real + cidade. Sem isto o P0 não pode ser corrigido com segurança.
2. **Smoke test manual** com email pessoal antes de convidar terceiros.
3. **Verificar DNS** de `instagramaudit.pt` (SPF/DKIM/DMARC) para ambos Brevo e Resend.
4. **Decidir lista inicial de convidados** para beta limitado (5-15 pessoas conhecidas).
5. **Preparar mensagem de convite** que assume explicitamente "beta privado, podem existir bugs, dados serão preservados 15 dias".

## 10. Próximos 5 prompts (ordem exacta)

1. **Corrigir identidade do operador no unlock modal** — substituir `OPERATOR_INFO` por dados reais da Fomentar Sonhos, Lda., alinhado com `/privacidade`. Adicionar teste snapshot.
2. **Smoke test de email end-to-end** — script ou checklist manual que dispara 1 unlock real, valida contacto Brevo, valida 2 emails entregues, valida link `/reports/$snapshotId` e PDF signed URL.
3. **Auditar e corrigir CTAs públicos sem destino** — varrer landing, analyze locked state e footer; remover/marcar claramente qualquer "Premium" sem checkout activo.
4. **Agendar cleanup de snapshots expirados** — wire `pg_cron` ou cron externo a `/api/admin/reports/cleanup-expired` com auth `INTERNAL_API_TOKEN`; logar em `product_events`.
5. **Adicionar policies RLS restritivas explícitas** em `leads`, `beta_feedback`, `product_events` (defesa em profundidade) + Phase 3 do snapshot histórico (migrar `/reports/$snapshotId` para `report_snapshots`).

## 11. Checklist de beta público

```text
☐ P0 corrigido: identidade real do operador no unlock modal
☐ Smoke test email completo (Brevo + Resend) com email real
☐ DNS/SPF/DKIM verificados em produção
☐ Cleanup retention agendado e testado uma vez
☐ Mensagem de convite preparada com expectativas claras de "beta"
☐ Lista inicial ≤ 15 convidados conhecidos
☐ Nenhum CTA público promete funcionalidade não entregue
☐ Admin pode acompanhar pipeline de leads e timeline em /admin/beta-leads
☐ Kill-switches Apify/OpenAI/DataForSEO confirmados em "true" só onde necessário
☐ APIFY_ALLOWLIST contém só perfis seguros para teste inicial
```

## 12. Recomendação final

**Após corrigir o P0 (1 prompt curto):** convidar **5 a 15 utilizadores conhecidos** (rede directa, parceiros, primeiros leads do magnet) para beta privado, com aviso explícito de "versão beta — dados retidos 15 dias — bugs esperados". Não promover publicamente em redes sociais nem indexar — manter `noindex` actual.

**Após smoke test de email + cleanup agendado (P1):** alargar para 30-50 utilizadores e abrir entrada via lead magnet sem fricção adicional.

**Não recomendo lançamento público aberto** enquanto não houver: pagamento decidido (gratuito vs pago vs freemium), monitoria de custos Apify a correr 7 dias sem alertas vermelhos, e Phase 3 de snapshots (imutabilidade real de relatórios históricos).
