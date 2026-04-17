

## Entendimento

**1. Landing flow**: Hero (action bar com username) → submit → `useNavigate` para `/analyze/$username`. Landing dark editorial, mockup light intercalado.

**2. Rota `/analyze/$username`**: dashboard público dark com mock determinístico. Composição: header → métricas → benchmark → comparação concorrentes → `<PremiumLockedSection>` com CTA "Desbloquear relatório completo" (actualmente Button sem onClick).

**3. Público vs Premium**: público = valor demonstrado (KPIs, benchmark, ranking). Premium = alcance estimado + 3 insights IA + 5 oportunidades + 7 recomendações 30d + PDF por email. O gate vive sobre o relatório completo, não sobre a primeira análise.

**4. Linguagem pt-PT**: impessoal, Acordo 90, sem "podes/queres/tens", sem pt-BR. Tom premium calmo.

## Conflitos com LOCKED_FILES.md

- `src/components/ui/dialog.tsx` — **NÃO está locked** (apenas button, badge, card, input, switch). Posso usar livremente.
- `src/components/ui/checkbox.tsx`, `label.tsx` — não locked. Disponíveis.
- `src/components/product/premium-locked-section.tsx` — não locked. Vou converter o Button num trigger controlado.

**Zero ficheiros locked tocados.**

## Ficheiros a criar

| Ficheiro | Propósito |
|---|---|
| `src/components/product/report-gate-modal.tsx` | Modal controlado: estado `idle`/`submitting`/`success`. Form com Nome, Email, Empresa, RGPD. Validação local + confirmação. Aceita `open`, `onOpenChange`, `username` props. |
| `src/components/product/report-gate-form.tsx` | (interno) Subcomponente do form para isolar lógica de validação e estado. Opcional — pode viver dentro do modal se ficar conciso. Decisão: **inline no modal** para evitar fragmentação. |

**Apenas 1 ficheiro novo.**

## Ficheiros a modificar

| Ficheiro | Mudança |
|---|---|
| `src/components/product/premium-locked-section.tsx` | Adicionar `useState` para `gateOpen`. Passar `onClick` ao Button. Renderizar `<ReportGateModal open={gateOpen} onOpenChange={setGateOpen} username={...}>`. Aceitar nova prop opcional `username?: string` para passar ao modal (contexto). |
| `src/components/product/public-analysis-dashboard.tsx` | Passar `username={profile.handle}` ao `<PremiumLockedSection>`. |

## Estrutura do modal

```
<Dialog>
  <DialogContent (dark editorial: bg-surface-secondary border-border-default rounded-2xl, max-w-md md:max-w-lg)>
    
    [State: form]
    ─ Header
      · Eyebrow mono "Relatório completo"
      · Title Fraunces "Receber relatório completo por email"
      · Description sans (tom calmo, o que está incluído)
    
    ─ Value reinforcement (4 micro-rows com check icon)
      · PDF detalhado por email
      · Comparação com concorrentes
      · Insights estratégicos por IA
      · Recomendações prioritárias para 30 dias
    
    ─ Form
      · Nome [Input]                  → required, min 2 chars
      · Email [Input type=email]      → required, regex válido
      · Empresa (opcional) [Input]    → optional
      · [Checkbox] + label RGPD       → required
      · Erros inline pt-PT por campo
    
    ─ Footer
      · Button primary "Receber relatório completo" (full-width md)
      · DialogClose secundário "Cancelar" (ghost)
    
    [State: submitting]
    · Mesmo layout, button com Loader2 spinner + "A preparar relatório…"
    · Inputs disabled
    
    [State: success]
    · Ícone CheckCircle2 grande em violet-luminous com glow
    · Title "Pedido recebido"
    · Texto: "O relatório de @{handle} será enviado para {email} nos próximos minutos."
    · Microcopy reassurance: "Verificar a caixa de entrada e a pasta de spam."
    · Button "Continuar" (fecha modal)
</Dialog>
```

Transição form → submitting → success: setTimeout 900ms a simular processamento (lightweight, transmite valor sem ser fake API).

## Validação (local, sem libs)

```ts
nome: trim().length >= 2 → "Indicar o nome para personalizar o relatório"
email: regex /^[^\s@]+@[^\s@]+\.[^\s@]+$/ → "Inserir um email válido"
empresa: opcional, sem regra
rgpd: must be true → "É necessário aceitar a política de privacidade para continuar"
```

Validação on-blur por campo + on-submit global. Mensagens calmas, impessoais.

## Visual direction (Editorial Tech Noir)

- Surface: `bg-surface-secondary` com `border-border-default`, `rounded-2xl`, sombra `shadow-elevated`
- Overlay: manter o `bg-black/80` actual + adicionar `backdrop-blur-sm` via override className
- Eyebrow mono uppercase tracking, title Fraunces medium, body Inter
- Inputs: `Input` primitive existente (já dark-aware via tokens)
- Checkbox: `Checkbox` primitive existente, label com Fraunces italic-free
- Value rows: ícone Check em `text-accent-luminous` (cyan = valor entregue) num círculo `bg-accent-primary/10 border-accent-primary/20`
- Success: ícone `CheckCircle2` grande em `text-accent-violet-luminous` (violet = premium concluído), com `shadow-glow-violet`
- Sem glow excessivo, sem decoração desnecessária

## Acessibilidade

- `Dialog` Radix já fornece focus-trap, ESC, aria
- `aria-invalid` + `aria-describedby` em campos com erro
- `aria-live="polite"` na success state para anunciar a transição
- Focus visível em todos os inputs (token `--ring`)
- Mobile 375px: stack vertical, button full-width, padding `p-6`

## Copy pt-PT (impessoal)

- Eyebrow: "Relatório completo"
- Title: "Receber relatório completo por email"
- Description: "Inclui comparação com concorrentes, benchmark e leitura estratégica por IA."
- Labels: "Nome", "Email", "Empresa (opcional)"
- Placeholder nome: "Nome próprio"
- Placeholder email: "email@dominio.pt"
- Placeholder empresa: "Nome da empresa ou marca"
- RGPD: "Aceito receber o relatório por email e a política de privacidade."
- Submit: "Receber relatório completo"
- Submitting: "A preparar relatório…"
- Cancel: "Cancelar"
- Success title: "Pedido recebido"
- Success body: "O relatório de @{handle} será enviado para {email} nos próximos minutos."
- Success microcopy: "Verificar a caixa de entrada e a pasta de spam."
- Continue: "Continuar"

## Future-ready

- `ReportGateModal` recebe handler optional `onSubmit?: (data: GateFormData) => Promise<void>` — default mock setTimeout. Substituível por Supabase mutation depois.
- `GateFormData` interface exportada (Nome, Email, Empresa, RGPD timestamp).
- Sem singletons, sem state global — fácil migrar para `useMutation` da TanStack Query.

## Confirmação

✅ UI + local flow only. Zero Supabase/Resend/Apify/Claude/EuPago.
✅ Zero quotas.
✅ Zero novas dependências (Radix Dialog/Checkbox/Label já existentes; Input/Button/Badge primitives já em uso).
✅ Tokens-only.
✅ pt-PT impessoal.
✅ Apenas 1 ficheiro novo + 2 ficheiros não-locked modificados.
✅ Mobile 375px validado.
✅ Future-ready (handler opcional, interface exportada).

