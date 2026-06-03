## Objetivo

Alinhar o `PremiumInterestDialog` ao mockup: três cards a ler-se como escada de compromisso (0€ → 9€ → 97€), terceiro card é o herói, pack de 5 fora do destaque, link discreto de cupão no rodapé, callout "sob consulta" para auditoria/formação.

## Ficheiro a alterar

`src/components/report-redesign/v2/premium-interest-dialog.tsx` (único ficheiro tocado — modal isolado).

Reusa componentes já existentes:
- `CouponInput` (`src/components/pricing/coupon-input.tsx`) — já valida server-side e devolve código aplicado
- `ReserveDiagnosisButton` — já liga ao checkout EuPago e aceita `couponCode`

## Mudanças concretas

### 1. Remover banner superior do diagnóstico
O banner azul (linhas 104–130) deixa de fazer sentido — o diagnóstico passa a ser o card 3 (herói). Eliminar esse bloco.

### 2. Reescrever a grid de cards
Substituir os três cards atuais por:

| Card | Eyebrow | Título | Preço | Bullets | CTA |
|---|---|---|---|---|---|
| 1 | "Incluído" (neutro) | Visão inicial | **0€** | Índice e visão geral · Amostra recente · Conta para guardar | "Continuar grátis" (outline) |
| 2 | "Automático" (cyan/secondary) | Relatório completo | **9€** + "pagamento único · sem subscrição" | Todas as 6 secções · Leitura editorial + concorrentes · Recomendações práticas | "Desbloquear relatório" (outline) |
| 3 (HERO) | "Relatório + humano" (accent) + badge "Mais útil" no topo | Diagnóstico de Autoridade Digital | **97€** + `<s>149€</s>` + "preço de lançamento · sobe para 149€" | Relatório completo incluído · Chamada de 30 minutos · 3 prioridades de melhoria | "Reservar diagnóstico" (primary, azul) |

Regra de riscado: só no card 3 (ancorar valor alto). Card 9€ comunica valor por "pagamento único · sem subscrição", sem riscado (não parecer saldo).

Estilo herói card 3: fundo `accent-primary/[0.05]`, ring `accent-primary/40`, badge "Mais útil" canto superior direito (chip accent), sombra mais marcada. Cards 1 e 2 ficam neutros (white sobre muted, border default).

### 3. Wiring de CTAs
- Card 1 (free): fecha modal + emite `pricing_option_clicked` com `pricing_option: "free"` (mantém comportamento atual).
- Card 2 (9€): emite `pricing_option_clicked` com `pricing_option: "single_report"`. Por agora abre `PricingInterestModal` como hoje (checkout de 9€ não está ainda implementado server-side — só o de 97€ está). Mantemos o comportamento existente para não bloquear esta entrega.
- Card 3 (97€): `<ReserveDiagnosisButton productCode="authority_diagnosis_97" sourceComponent={sourceComponent} instagramUsername={handle} returnPath="/" couponCode={appliedCoupon ?? undefined} />` — vai diretamente para o checkout EuPago real, aplicando cupão se houver.

### 4. Rodapé do modal (substitui o trust/pending note actual)
Duas linhas:
- Esquerda: link discreto "Tenho um código" (Tag icon) que expande para `<CouponInput onApplied={code => setAppliedCoupon(code)} />`. Quando aplicado, mostra chip com o código e botão "remover".
- Direita: badge "Sem subscrição · sem renovação automática" (ShieldCheck icon).
- Por baixo: callout cinzento full-width com ícone Building2, texto "Precisas de analisar vários ativos digitais ou preparar formação para a tua equipa?" + link `<Link to="/servicos">Falar sobre auditoria ou formação →</Link>` (fecha o modal).

### 5. Pack de 5
Remover do dialog. Não precisamos de o referenciar aqui — vive na `/precos`. Limpar imports e a entry `pack_5_reports` em `interestMeta` e `PricingOption`.

### 6. Tipos
- `PricingOption` passa a `"free" | "single_report"` (sem `pack_5_reports`).
- Adicionar `const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);`

## Copy (i18n)

A copy nova vive em chaves existentes em `report.json` quando possível. As que faltam — eyebrows, novo título "Visão inicial", bullets "Índice e visão geral", "Amostra recente", "Conta para guardar", "Todas as 6 secções", "Leitura editorial + concorrentes", "Recomendações práticas", "Relatório completo incluído", "Chamada de 30 minutos", "3 prioridades de melhoria", badge "Mais útil", linha "preço de lançamento · sobe para 149€", "pagamento único · sem subscrição", footer callout — adicionar a `src/i18n/locales/pt/report.json` namespace `premium.dialog.*`. Sem strings hardcoded em PT no JSX.

## Tokens

Apenas tokens semânticos: `accent-primary`, `accent-secondary`, `content-primary/secondary/tertiary`, `surface-base/muted`, `border-default`. Fontes Inter (default Tailwind do projeto). Sem cores hex em componentes.

## Fora de scope

- Não tocar em `pricing-page.tsx`, `/servicos`, fluxos de checkout, `report.example`, ou onboarding.
- Não criar componentes novos — reusar `CouponInput`, `ReserveDiagnosisButton`, `PricingInterestModal`.
- Não implementar checkout direto para o card 9€ (continua a abrir `PricingInterestModal` como hoje; está fora de scope desta entrega).

## Riscos / questões abertas

1. Tracking: mantemos `pricing_option_clicked` com os mesmos valores. Adicionar `pricing_coupon_applied` quando cupão é aplicado dentro do modal? **Proponho sim**, reusando o evento já existente.
2. Pack de 5 sai completamente do modal — assumido conforme a tua mensagem ("o pack saiu do destaque"). Confirmas?
3. CTA do card 9€ continua a abrir `PricingInterestModal` (recolhe interesse, não cobra). Aceitas isso nesta fase, ou queres já desbloquear pagamento real de 9€ também?
