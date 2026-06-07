## QA report — checkout `/checkout/report-full`

### Cobertura
- **Código:** 100% (todos os ficheiros do scope inspeccionados).
- **Visual interactivo:** parcial — preview mostra `MissingLeadSession` (sem cookie de lead na sessão do browser). Os 4 passos não foram alcançados de forma interactiva.
- **Submit real / EuPago:** não executado (proíbe-se interacção que cria pagamentos).

---

### 1. Step 1 — Confirmar desbloqueio
| Critério | Resultado |
|---|---|
| Copy clara ("Obter relatório completo" + sub) | ✅ PASS (linhas 309–315) |
| CTA "Continuar" usa navy local | ✅ PASS (`StepActions` usa `CheckoutPrimaryButton`) |
| Sem gradiente roxo em primary CTAs do checkout | ✅ PASS (nenhuma ocorrência de `variant="primary"` em `Button` dentro dos 4 passos ou no `HumanDiagnosisUpsell`) |

### 2. Step 2 — Objectivos
| Critério | Resultado |
|---|---|
| Título "O que te traz aqui?" | ✅ PASS (linha 334) |
| Multi-select funciona | ✅ PASS (`toggle` adiciona/remove em `report-priority-form.tsx`) |
| Primeira escolha = principal (`primary_goal`) | ✅ PASS (`reportGoals[0]`, badge "Principal" só no primeiro) |
| Todos enviados como `report_goals` | ✅ PASS (passado a `createCheckout` quando length > 0) |
| Continuar disabled até ≥1 escolha | ✅ PASS (`nextDisabled={reportGoals.length === 0}`) |
| Mobile layout limpo | ⚠️ NÃO VERIFICADO interactivamente — grid `sm:grid-cols-2` → stack vertical em <640px (esperado OK; recomendo verificação visual no próximo turno) |

### 3. Step 3 — Upsell de diagnóstico humano
| Critério | Resultado |
|---|---|
| Cartão com topo navy + corpo branco | ✅ PASS (`bg-[rgb(var(--text-primary))]` + `bg-white`) |
| 97€ visível e 149€ riscado | ✅ PASS (Fraunces, `line-through`, `opacity 50%`) |
| Copy CTA "Sim, quero o diagnóstico humano" | ✅ PASS |
| CTA navy (sem roxo) | ✅ PASS (`CheckoutPrimaryButton`) |
| Sem alterações a lógica de pagamento | ✅ PASS (apenas `onAccept` muda `selectedProduct`) |

### 4. Step 4 — Faturação e pagamento
| Critério | Resultado |
|---|---|
| Order summary mostra preço actual dinâmico | ✅ PASS (`PUBLIC_PRODUCTS[productCode].priceLabel`) |
| Strikethrough 149€ só em `authority_diagnosis_97` | ✅ PASS (`compareAtLabel` condicional) |
| Copy segurança menciona Multibanco · MB WAY · Cartão | ✅ PASS (`order-summary.tsx`) |
| Ícone ShieldCheck + "Pagamento seguro via EuPago" | ✅ PASS |
| Botão "Confirmar e pagar" navy | ✅ PASS (`CheckoutPrimaryButton`) |
| **Lock icon no botão Confirmar** | ❌ FAIL — o ícone actual é `ArrowRight`, não há cadeado. O brief pedia "navy with lock icon". |
| Preço dinâmico do product config | ✅ PASS (nada hardcoded; `priceLabel` lido do registry) |

### 5. Submit / metadata
| Critério | Resultado |
|---|---|
| `createEupagoCheckout` continua a funcionar | ✅ PASS (assinatura intacta; novo campo `report_goals` é `optional`) |
| Metadata inclui `report_priority` | ✅ PASS (mapeado a partir do primeiro goal via `GOAL_TO_LEGACY_PRIORITY`) |
| Metadata inclui `report_goals` | ✅ PASS (array completo) |
| Metadata inclui `primary_goal` | ✅ PASS (bónus, derivado de `data.report_goals?.[0]`) |
| Sem migration de schema | ✅ PASS (escrita em `metadata` jsonb existente) |
| Sem alteração de preço/montante | ✅ PASS (`amount_cents` continua a vir de `products.server.ts`) |

---

### Issues visuais encontrados (fora de scope do brief mas observados)
1. **`MissingLeadSession` CTA "Voltar aos preços"** ainda usa `variant="primary"` global (gradiente roxo) — está visível no preview actual. Fora do scope estrito do checkout flow (é um painel de pré-condição), mas inconsistente com o resto do checkout. Recomendo trocar para `CheckoutPrimaryButton` na próxima passagem.
2. **Botão "Analisar perfil"** no header dentro de `MissingLeadSession` — `variant="secondary"` neutro, OK.

### Issues mobile
- Não verificados interactivamente (preview parado em `MissingLeadSession`). Markup parece sólido — `grid sm:grid-cols-2` no passo 2 stack-a em 1 coluna, CTAs do passo 4 usam `flex-col-reverse sm:flex-row` e `w-full sm:w-auto`. Recomendo screenshot a 375px depois de termos sessão activa.

### Verificação de metadata
Não executei submit real (criaria intent de pagamento EuPago). Confirmação por leitura de código:
```ts
// src/lib/payments/eupago.functions.ts
metadata: {
  ...,
  report_priority: data.report_priority ?? null,   // mapeado de primaryGoal
  report_goals: data.report_goals ?? null,         // array completo
  primary_goal: data.report_goals?.[0] ?? null,    // bónus
}
```
Para confirmar end-to-end com BD, recomendo: após sessão activa, completar um checkout em ambiente sandbox EuPago e correr `SELECT id, metadata FROM payment_intents ORDER BY created_at DESC LIMIT 1;`.

---

### Recomendações de small fixes (não executados — só listados)
1. **Adicionar ícone `Lock`** ao botão "Confirmar e pagar" no passo 4 (substituir `ArrowRight` por `Lock` da `lucide-react`). Reforça o sinal de segurança que o order summary já comunica.
2. **`MissingLeadSession` CTA principal** passar a usar `CheckoutPrimaryButton` para coerência visual (ou tornar o navy override mais reutilizável). Decidir caso-a-caso — pode ser intencional manter o painel "fora" do estilo checkout.
3. **Mobile screenshot pendente** — agendar QA visual a 375×812 após sessão activa nos 4 passos.
4. **Persistência de `selectedProduct` em refresh** (observação extra): hoje o state é só em memória. Não bloqueia, mas se o utilizador refrescar perde a escolha do upsell. Fora de scope.

---

### Próximo passo recomendado
Para fechar a parte interactiva da QA:
1. Iniciar sessão (lead) no preview através do fluxo normal (`/analyze/<username>` ou login).
2. Voltar a `/checkout/report-full` e percorrer os 4 passos com screenshots em desktop (1280) e mobile (375).
3. Eventualmente, submeter em sandbox EuPago para validar `metadata` na BD via `supabase--read_query`.

Posso executar este próximo passo assim que confirmares que a sessão está activa no preview ou se quiseres avançar com os small fixes (#1 lock icon, #2 navy no `MissingLeadSession`).