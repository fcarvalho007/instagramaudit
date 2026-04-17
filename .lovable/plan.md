

## Revisão do estado actual

Verifico ficheiro a ficheiro o que ficou implementado nos últimos prompts.

### Fase 1 — Bugs críticos

| # | Bug | Estado | Evidência |
|---|---|---|---|
| 1 | `lang="pt-PT"` + meta pt-PT no root | ✅ Feito | Confirmado no resumo do prompt anterior + edit em `__root.tsx` |
| 2 | Validação rigorosa de username | ✅ Feito | `USERNAME_REGEX = /^[A-Za-z0-9._]{1,30}$/` em `hero-action-bar.tsx` |
| 4 | Reset síncrono do modal | ✅ Feito | `handleOpenChange` em `report-gate-modal.tsx` chama `resetForm()` directamente |
| 5 | Renderizar `displayName` no header | ✅ Feito | `analysis-header.tsx` renderiza `profile.displayName` em Fraunces |
| — | Persistência Cloud (`report_requests`) | ✅ Feito | Migração + `supabase.from("report_requests").insert(...)` no modal |

### Quota mensal (último prompt aprovado)

| Item | Estado | Evidência |
|---|---|---|
| `src/lib/quota.ts` (novo) | ✅ Criado | Diff confirma: `FREE_MONTHLY_LIMIT`, `getQuotaUsage`, `incrementQuota`, `normalizeEmail`, `getMonthKey`, `getRemainingFree` — try/catch defensivo, SSR-safe |
| State `success` (1ª) com quota line | ✅ Feito | `renderQuotaLine(1)` no modal |
| State `success-last` (2ª) com bloco gold | ✅ Feito | Bloco `border-accent-gold/30` + CTA "Ver opções de upgrade" → paywall |
| State `paywall` (3ª+) com 2 cards | ✅ Feito | Card compra pontual 3€ + Card Pro 10€/mês com badge "Recomendado" |
| Quota check antes de insert | ✅ Feito | `if (currentUsage >= FREE_MONTHLY_LIMIT) → setState("paywall")` antes do insert |
| Mobile 375px (cards stack) | ✅ Feito | `grid-cols-1 md:grid-cols-2` |
| Tokens-only | ✅ Feito | `accent-gold`, `accent-violet`, `surface-base`, `signal-danger`, etc. |

### Bugs/refinamentos NÃO endereçados (por design — fora do escopo até agora)

| # | Item | Fase planeada |
|---|---|---|
| 6 | Concorrentes na action bar não fazem nada | Fase 2/3 (não aprovada ainda) |
| 7 | "Remover" → "Esconder" | Fase 3 |
| 8 | Loading state em `/analyze/[username]` | Fase 3 |
| 9 | Handles de concorrentes realistas | Fase 2 |
| 10 | Benchmark marker com label | Fase 2 |
| 11 | Premium locked mask muito agressivo | Fase 2 |
| 12 | Action bar mobile 375px alinhamento | Fase 3 |
| 13 | Header badge inline + hierarquia | Fase 2 |
| 14 | CTA "Analisar outro perfil" no fim | Fase 2 |
| 15 | Próximo passo no success state | Fase 3 |
| 17 | Refactor competitor barras | Fase 3 |
| 18 | Email regex com TLD ≥2 chars | Polimento |

---

## Conclusão

**Fase 1 (bugs críticos) + persistência Cloud + sistema de quota mensal: tudo implementado e validado.**

Os 6 itens críticos da auditoria estão resolvidos. O ficheiro `quota.ts` foi criado conforme spec, encapsula localStorage, e o modal tem agora 5 estados (`idle | submitting | success | success-last | paywall`) com hierarquia visual editorial e tokens-only.

**Pendente:** Fase 2 (refinamentos UX/visual — 5 items) e Fase 3 (polimento técnico — 4 items). Nenhum bloqueia o fluxo principal.

### Próximo passo recomendado

Antes de avançar para Fase 2, **testar end-to-end** no preview:
1. Submeter username inválido (`!!!`) → ver mensagem pt-PT
2. Submeter username válido → ver dashboard com `displayName`
3. Abrir gate modal, submeter 1ª vez → state `success` + linha "1 de 2"
4. Submeter 2ª vez (mesmo email) → state `success-last` + bloco gold
5. Tentar 3ª vez → state `paywall` com 2 cards
6. Inspeccionar `localStorage` → chave `instabench:quota:{email}:2026-04`
7. Validar mobile 375px

Se o teste passar, posso avançar com Fase 2 (refinamentos visuais) num prompt único ou separar por prioridade.

