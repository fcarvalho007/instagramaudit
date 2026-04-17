

## Entendimento

**1. Landing → analyze → gate**: hero (`/`) → `/analyze/$username` → `<PublicAnalysisDashboard>` → `<PremiumLockedSection>` (CTA único) → `<ReportGateModal>`.

**2. Análise pública**: dashboard com header de perfil, 4 métricas-chave, benchmark block, comparação de concorrentes, e secção premium bloqueada (cards blurred com overlay CTA).

**3. Pedido de relatório**: gate modal valida, chama `requestFullReport` → `/api/request-full-report`. Server devolve `quota_status` (`first_free` / `last_free` / `limit_reached`) → modal transita para estados `success`, `success-last`, ou `paywall`.

**4. Limit-reached + pago pontual**: estado `paywall` mostra 2 cards (3€ pontual + Pro 10€/mês), **ambos disabled** ("Disponível em breve"). Sem checkout funcional. Sem Agency.

**5. Porquê camada de conversão agora**: a página de análise tem hoje **um único momento de conversão** — o `<PremiumLockedSection>` no fundo. Quem fecha o modal sem submeter, ou quem já submeteu, fica sem próximo passo claro. O produto ainda parece uma ferramenta one-shot, não um lead magnet com escada de valor visível. Adicionar mais backend (subs, webhook, auth) sem antes optimizar a superfície de conversão é construir tubagem para tráfego que ainda não converte. Esta camada é UX-only, reutiliza tudo o que já existe, e dá sinal real sobre que CTA funciona antes de investir em billing recorrente.

## Decisões-chave

1. **Novo componente único**: `<PostAnalysisConversionLayer>` colocado **entre** `<AnalysisCompetitorComparison>` e `<PremiumLockedSection>`. Posição estratégica: depois do valor entregue (métricas + benchmark + concorrentes), antes do gate atual. Não desloca o gate existente — soma-se a ele.

2. **3 estados visuais derivados de prop `conversionState`**:
   - `acquisition` (default, anónimo): foco em "receber por email" — CTA primário abre o `<ReportGateModal>` reutilizado.
   - `requested` (após submit bem-sucedido): foco em ongoing value — Pro destacado como "Em breve · Pedir acesso", Agency como link discreto.
   - `limit-reached` (após `QUOTA_REACHED`): mantém 3€ pontual visível (também "Em breve" hoje, alinhado com o paywall do modal) + Pro recomendado.

3. **Estado lifted para `<PublicAnalysisDashboard>`**: passa-se `conversionState` + `setConversionState` para `<PostAnalysisConversionLayer>` **e** para `<PremiumLockedSection>`. Quando o gate modal sinaliza sucesso (via novo callback `onRequestOutcome`), o dashboard atualiza o estado e ambas as superfícies reagem.

4. **Reutilização do `<ReportGateModal>`**: zero duplicação de formulário. O novo componente apenas dispara `setGateOpen(true)` partilhado. Adiciona-se **um único callback** `onRequestOutcome?: (outcome: "success" | "limit-reached") => void` ao modal para propagar o resultado para cima.

5. **Nudge inline (não popup)**: dentro do bloco de conversão, quando `acquisition`, mostra-se uma linha compacta "Receber também por email" com micro-CTA "Enviar análise". Reusa o mesmo modal. Sem segundo formulário, sem banner flutuante, sem drawer extra.

6. **Pricing ladder com 3 opções honestas**:
   - Compra pontual 3€ — "Em breve" (consistente com paywall atual)
   - Pro 10€/mês — "Em breve · Pedir acesso" (CTA `mailto:` ou link para form futuro — por agora, abre `mailto:hello@instabench.pt?subject=Pro` para ser real)
   - Agency 39€/mês — "Pedir acesso" (mesmo tratamento)
   
   Pro destacado visualmente (border accent-gold, badge "Recomendado"). Sem fake checkout.

7. **Visual "Editorial Tech Noir"**: card com border subtle, background `bg-surface-secondary/40`, hairline mono labels, separadores subtis. Sem neon, sem gradient agressivo. Spacing generoso. Mobile: stack vertical, cards 1-col.

8. **Sem novas dependências, sem alterações de schema, sem novos endpoints.**

## Ficheiros

**Novos (1):**
- `src/components/product/post-analysis-conversion-layer.tsx`

**Editados (3):**
- `src/components/product/public-analysis-dashboard.tsx` — lifted state + insere `<PostAnalysisConversionLayer>` entre concorrentes e premium
- `src/components/product/premium-locked-section.tsx` — aceita `conversionState` opcional, ajusta copy do CTA quando estado já é `requested` (ex: "Já recebido — ver opções Pro"); recebe e propaga `onRequestOutcome` do modal
- `src/components/product/report-gate-modal.tsx` — novo prop opcional `onRequestOutcome?: (outcome) => void` chamado em `success` / `success-last` / `paywall`. Sem mudanças de UX/copy.

**Locked files**: `LOCKED_FILES.md` lista apenas tokens, layout, landing e report. **Nenhum dos ficheiros tocados está locked.** ✅

## Estrutura do componente novo

```text
<PostAnalysisConversionLayer state="...">
  ├── label mono ("PRÓXIMO PASSO" | "ACOMPANHAMENTO" | "OPÇÕES DE UPGRADE")
  ├── título serif (varia por estado)
  ├── subtítulo curto
  ├── [acquisition only] Linha nudge: "Receber também por email" + micro-CTA
  ├── Grid 3 cards:
  │     ├── Compra pontual 3€  (CTA "Em breve")
  │     ├── Pro 10€/mês        (recomendado, "Pedir acesso")
  │     └── Agency 39€/mês     (link discreto)
  └── nota mono pequena (varia por estado)
</PostAnalysisConversionLayer>
```

## Mapeamento copy por estado (pt-PT impessoal)

| Estado | Label | Título | Subtítulo |
|---|---|---|---|
| `acquisition` | Próximo passo | Receber análise completa por email | PDF detalhado com benchmark, comparação e leitura estratégica por IA. |
| `requested` | Acompanhamento | Acompanhar este perfil ao longo do tempo | Novas análises, comparações regulares e alertas de variação. |
| `limit-reached` | Opções de upgrade | Continuar com mais relatórios este mês | Compra pontual disponível em breve ou acesso recorrente via Pro. |

CTAs Pro/Agency: `mailto:hello@instabench.pt?subject=Acesso%20Pro%20—%20InstaBench` (real, não fake; substituível por route futura sem refactor).

## Validação dos guardrails

| Guardrail | Estado |
|---|---|
| Sem redesign de landing/analysis | ✅ apenas insere bloco entre secções existentes |
| Sem subs/auth/CRM | ✅ zero billing, zero auth, zero novos endpoints |
| Sem novas libs | ✅ |
| Reutiliza gate existente | ✅ um único modal, um único form |
| Sem hardcoded secrets | ✅ |
| Locked files intactos | ✅ |
| Copy pt-PT impessoal pós-1990 | ✅ |
| Mobile 375px | ✅ stack vertical, cards 1-col |
| Sem fake checkout | ✅ Pro/Agency = "Pedir acesso" via mailto real |

## Checkpoints

- ☐ `<PostAnalysisConversionLayer>` criado com 3 estados visuais
- ☐ Inserido entre concorrentes e `<PremiumLockedSection>` no dashboard
- ☐ State lifted em `<PublicAnalysisDashboard>` (`conversionState` + setter)
- ☐ `<ReportGateModal>` ganha `onRequestOutcome` opcional, sem mudar UX
- ☐ Nudge inline "receber também por email" só no estado `acquisition`
- ☐ 3 cards de pricing: 3€ pontual, Pro (recomendado), Agency
- ☐ Pro/Agency = `mailto:` (real, honesto), sem fake checkout
- ☐ `<PremiumLockedSection>` adapta copy do CTA principal quando `requested`
- ☐ Mobile 375px validado, stack vertical
- ☐ Copy pt-PT impessoal, sem pt-BR, sem "Queres/Tens/Podes"
- ☐ Zero ficheiros locked tocados
- ☐ Sem novas dependências, sem schema, sem endpoints

