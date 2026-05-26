## Objetivo

Refinar `/precos` para respeitar o design system editorial (Fraunces + Inter) e substituir o fluxo "comprar" por um modal de **registo de interesse** alinhado com a fase de lançamento.

---

## Bloco 1 — Refinamento visual de `/precos`

Ficheiro: `src/components/pricing/pricing-page.tsx` (+ `public/locales/pt/pricing.json` se necessário).

Problemas detetados vs. design system:
- `"0€"` no cartão Free é frio; deve ser **"Grátis"** (Fraunces, tom editorial).
- Preços a `font-bold` — substituir por **Inter `font-semibold tabular-nums`** (consistente com restantes KPIs públicos).
- Falta hierarquia editorial: títulos de plano (`h3`) são Inter — manter, mas adicionar **eyebrow Inter uppercase** acima e usar Fraunces apenas no preço grande do plano destacado para criar ritmo serif/sans.
- `font-bold` removido em favor de `font-semibold` (peso permitido no DS).
- Garantir `.text-eyebrow-sm` em todos os labels/badges (já está em parte).
- Step numbers (1, 2, 3) em Fraunces — manter (decorativo editorial).
- Confirmar tokens: nada de cores hardcoded; substituir `bg-white/80` por `bg-surface-elevated/80` se existir token equivalente (verificar `tokens-light.css`).

Sem alterações de layout/estrutura. Mobile-first preservado.

---

## Bloco 2 — Modal "Registo de interesse"

### UX

Ao clicar em CTA dos planos pagos (`single_report` ou `pack_5_reports`) abre um modal em vez de navegar para checkout:

1. **Cabeçalho** (Fraunces H2): *"Estamos em fase de lançamento"*
2. **Parágrafo** (Inter): explica que ainda não há pagamento ativo; queremos perceber se, **considerando o que já viu nos relatórios**, pagaria mesmo este valor.
3. **Campos** (todos opcionais exceto `would_pay`):
   - `would_pay` (radio obrigatório): *Sim, pagaria* · *Talvez, depende* · *Não, ainda não*
   - `price_fairness` (radio): *Barato* · *Justo* · *Caro*
   - `email` (text, opcional): *"Avise-me quando abrir"*
   - `comment` (textarea, opcional, máx 500): *"O que faria a diferença para sim?"*
4. **CTA** (Inter): *"Registar interesse"* + nota fina sobre RGPD.
5. **Estado de sucesso**: mensagem editorial curta + botão *"Voltar aos planos"*.

Modal usa `Dialog` shadcn já existente. Acessível (focus trap, ESC, `aria-describedby`).

### Backend

Nova tabela `public.pricing_interest`:
- `id uuid pk`
- `pricing_option text check in ('single_report','pack_5_reports')`
- `would_pay text check in ('sim','talvez','nao')` NOT NULL
- `price_fairness text check in ('barato','justo','caro')` nullable
- `email text` nullable + `email_normalized` gerado
- `comment text` nullable (max 500 enforçado em validação)
- `user_agent text`, `referrer text`, `created_at`
- RLS: ativada, sem policies públicas (acesso apenas via service role).

Endpoint público: `src/routes/api/public/pricing-interest.ts`
- `POST` com Zod (todos os limites min/max definidos).
- Rate-limit simples por IP (3/min) reutilizando o padrão de `inline-feedback`.
- Usa `supabaseAdmin` para insert.

Tracking: continua a emitir `pricing_option_clicked` ao abrir; novo evento `pricing_interest_submitted` no envio.

### Admin (Estudo de mercado)

Adicionar 4ª tab **"Intenção de compra"** em `/admin/estudo-mercado`:
- Total de registos por janela (7/30/90d)
- Distribuição `would_pay` (donut)
- Distribuição `price_fairness` por plano (barras agrupadas)
- Top 20 comentários livres com email/UA
- Sinal editorial determinístico (ex.: *"≥60% 'sim' + 'talvez' em N≥20 → preço a 7€ validado"*)

Server fn: `getPricingInterest` em `src/server/admin/market-study.functions.ts`.

---

## Detalhes técnicos

- Migração nova (não editar existentes).
- Tipos Supabase regenerados automaticamente após migração aprovada.
- `route` API protegida por validação Zod estrita (sem PII em logs).
- Sem dependências novas.
- Sem alteração de `/report.example` nem de rotas existentes além das listadas.

---

## Ficheiros afetados

**Novos**
- `supabase/migrations/<ts>_pricing_interest.sql`
- `src/components/pricing/pricing-interest-modal.tsx`
- `src/routes/api/public/pricing-interest.ts`

**Editados**
- `src/components/pricing/pricing-page.tsx` (tipografia + abrir modal)
- `public/locales/pt/pricing.json` (novas strings do modal + "Grátis")
- `src/routes/admin.estudo-mercado.tsx` (nova tab)
- `src/server/admin/market-study.functions.ts` (`getPricingInterest`)

---

## Checkpoint ☐

- ☐ Tipografia em `/precos` 100% Fraunces/Inter, sem `font-bold`, com tabular-nums nos preços
- ☐ Cartão Free mostra "Grátis" (Fraunces) em vez de "0€"
- ☐ CTAs pagos abrem modal (não navegam)
- ☐ Modal valida e envia para `/api/public/pricing-interest`
- ☐ Tabela `pricing_interest` criada com RLS e checks
- ☐ Admin Estudo de Mercado mostra nova tab "Intenção de compra"
- ☐ `bunx tsc --noEmit` 0 erros
- ☐ `bunx vitest run` verde