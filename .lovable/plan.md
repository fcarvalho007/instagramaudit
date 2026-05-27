## Causa raiz do desalinhamento

Hoje o estado `unlocked` (que apenas significa "lead magnet completo") é tratado como **acesso premium** em dois sítios:

1. **Sidebar** — `buildSidebarItems` (`report-block-nav.tsx`) marca `diagnostico` como `accessBadge: "included"` e `access: "accessible"` em `public_mvp` → mostra "INCLUÍDO" + ícone Gift e conta-o como acessível.
2. **Corpo do relatório** — `report-shell-v2.tsx` calcula `gated = lockBoundary === "engagement" && !unlocked`. Quando `unlocked === true`, deixa de gerar o lock-gate **e** renderiza o bloco Diagnóstico (linha 337) + 03–06 fora dele. Ou seja, completar o lead magnet expõe Secção 02.

A correção introduz uma distinção limpa: `unlocked` continua a ser "lead magnet completo" (controla apenas a UI do lock-gate / sticky bar / CTA secundário); um novo `premiumUnlocked` (sempre `false` por agora — não há pagamentos) controla o gating real do conteúdo.

---

## Modelo de acesso final (public_mvp)

| Secção | Sidebar | Render no corpo | Badge |
|---|---|---|---|
| 01 Visão geral | acessível | sempre (modo `free` pré-lead, `full` pós-lead) | `GRÁTIS` |
| 02 Diagnóstico editorial | locked | só se `premiumUnlocked` | `PREMIUM` |
| 03 Desempenho | locked | só se `premiumUnlocked` | `PREMIUM` |
| 04 Conteúdo | locked | só se `premiumUnlocked` | `PREMIUM` |
| 05 Procura | locked | só se `premiumUnlocked` | `PREMIUM` |
| 06 Comparação | locked | só se `premiumUnlocked` | `PREMIUM` |

Sidebar mostra **a mesma estrutura** pré e pós lead-magnet — só muda o CTA do cartão premium (ver §6).

---

## Ficheiros a alterar

1. **`src/components/report-redesign/v2/block-config.ts`**
   - Mudar `shortLabel` do bloco `diagnostico` de "Diagnóstico" → "Diagnóstico editorial" (usado quando não houver i18n override).

2. **`src/components/report-redesign/v2/report-block-nav.tsx`**
   - Em `buildSidebarItems` (public_mvp): só `overview` é `accessible/free`. Todos os outros (`diagnostico` incluído) → `group: "premium"`, `access: "locked"`, `accessBadge: "premium"`.
   - Remover `import { Gift } from "lucide-react"`.
   - Remover ramo `isIncluded` em `ItemRow` (sem badge "INCLUÍDO", sem ícone Gift) — ficam apenas `free` vs `premium`.
   - Remover o bloco `hasDiagnostico` + `<p>{t("nav.access.beta_note")}</p>` (linhas 436, 508–512).
   - Trocar tipos: `Group` deixa de ter `"incluido"` activo para `diagnostico`; ramo `incluido` continua a existir só por compat das variantes não-públicas (internal_lab / pro_preview).
   - `PremiumBlockCard` ganha visual ligeiramente mais comercial (CTA com gradient `from-accent-primary to-accent-secondary` + shadow suave) — usado pós-lead.

3. **`src/components/report-redesign/v2/report-shell-v2.tsx`**
   - Adicionar prop `premiumUnlocked?: boolean` (default `false`).
   - `const gated = lockBoundary === "engagement" && !premiumUnlocked;` (substitui `!unlocked`).
   - Os blocos 02–06 "fora do lock-gate" (linhas 337, 346, 376, 407, 423) trocam guarda `!gated` por `premiumUnlocked && features.xxx !== "hidden"`. Resultado: pós-lead-só (sem premium), o corpo termina em Overview + `ReportLockGate` continua a cobrir 02–06 com novo CTA.
   - `ReportOverviewBlock` em modo livre: já hoje é `mode="free"` quando `gated && !unlocked` (lock-gate) e full quando `!gated`. Manter — a Overview pode passar a full após lead magnet, sem expor outros blocos.
   - `StickyUnlockBar` mantém-se ligado a `unlocked && lockBoundary === "engagement"` (mostrar pós-lead, antes de premium).
   - O `ReportLockGate` continua a envolver 02–06; recebe `leadCaptured={unlocked}` (já recebe `unlocked`) para diferenciar internamente a UI (este componente já o faz hoje).

4. **`src/routes/analyze.$username.tsx`**
   - Passar `premiumUnlocked={false}` ao `ReportShellV2` (sem alteração de estado adicional — payments fora de scope).

5. **`src/i18n/locales/pt/report.json`** e **`src/i18n/locales/en/report.json`**
   - `blocks.diagnostico.short`: "Diagnóstico" → "Diagnóstico editorial" / "Editorial diagnosis".
   - `nav.access.beta_note`: remover (não é mais lido após §2; manter chave seria lixo). Apagar.
   - `nav.access.cta` pós-lead: "Ver opções de acesso" → "Desbloquear relatório completo" / "Unlock full report".
   - `nav.access.cta_aria`: "Desbloquear relatório completo" / "Unlock full report".
   - `nav.access.trust` pós-lead: "1 relatório ou pack de 5. Sem subscrição." → "Acede ao Diagnóstico editorial e às restantes secções premium." / "Access the editorial diagnosis and the remaining premium sections."
   - Counters (`{{count}}` em `nav.access.progress`/`premium_count`) actualizam automaticamente: "1 de 6 secções acessíveis" / "5 por desbloquear" — sem mudança de chave.
   - `premium.dialog.free.bullet_diag`: "Diagnóstico editorial aberto agora" → "Diagnóstico editorial disponível em premium" / "Editorial diagnosis available in premium" (já não é grátis).
   - `sticky_unlock.body` default: "3 secções premium por desbloquear" → "5 secções premium por desbloquear" (em PT/EN). Está hardcoded como `defaultValue` em `sticky-unlock-bar.tsx`; manter sincronizado.

6. **`src/i18n/locales/pt/pricing.json`** e **`src/i18n/locales/en/pricing.json`**
   - `subtitle`: remover "Diagnóstico editorial está temporariamente incluído como oferta de lançamento" → "Começa pela visão gratuita do perfil. As restantes secções premium ficam disponíveis com desbloqueio." / equivalente EN.
   - Em `features` / `launch_extra.title` / `launch_extra.body` / `launch_section.title`: remover referências a "Diagnóstico editorial disponível como oferta de lançamento" / "Recebe o extra de lançamento" / "O Diagnóstico editorial está atualmente aberto…" — substituir por copy alinhada com novo modelo.

7. **`src/components/report-redesign/v2/sticky-unlock-bar.tsx`**
   - Atualizar `defaultValue` literal para "5 secções premium por desbloquear" (sincroniza com i18n).

---

## CTA: pré-lead vs pós-lead

| Estado | Componente | Botão | Helper |
|---|---|---|---|
| **Pré-lead** (`unlocked=false`) | `ContinueReadingCard` | "Continuar leitura gratuita" | "Desbloqueia o resumo gratuito antes das secções premium." |
| **Pós-lead** (`unlocked=true`) | `PremiumBlockCard` | "Desbloquear relatório completo" | "Acede ao Diagnóstico editorial e às restantes secções premium." |

Nenhum dos dois muda o gating do corpo (Diagnóstico continua locked).

---

## Validação

- `bunx tsc --noEmit`
- `bunx vitest run` (não esperado afectado, mas correr)
- Manual preview:
  - Desktop 1460 pré-lead: sidebar "1 de 6 secções acessíveis · 5 por desbloquear", só Overview no corpo, lock-gate com lead-magnet card.
  - Desktop 1460 pós-lead (sessionStorage `ib_unlock_preview=1`): mesma sidebar, Overview full, **Diagnóstico não aparece**, lock-gate continua a cobrir 02–06 com CTA "Desbloquear relatório completo".
  - Mobile 390 ambos os estados — bottom-tabs apenas Overview, sheet com mesma estrutura, sticky bar pós-lead.
- Acceptance criteria do pedido (todas cobertas no plano acima).

---

## Fora de scope

Apify, OpenAI, DataForSEO, geração do report, scoring, pricing values, payments, emails, admin CRM, schema BD, fluxo do modal, captura de lead backend.
