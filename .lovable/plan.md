# Auditoria de CTAs públicos antes do lançamento

Auditoria read-only feita às superfícies públicas (homepage, header, footer, `/analyze/:username`, gate de unlock, modais de paywall, `/reports/:snapshotId`, `/app/reports`, `/app/plan`, páginas legais). Abaixo: o que está, o que arriscam prometer e o que mexer.

## 1. CTAs encontrados

### A. Header (`src/components/layout/header.tsx`)
- Nav: `Analisar` → `/`, `Como funciona` → `/como-funciona` (**não existe**), `Preços` → `/precos` (**não existe**), `Recursos` → `/recursos` (**não existe**).
- Botão `Analisar agora` (desktop + drawer mobile) sem `to=""` — clica e não navega.

### B. Footer (`src/components/layout/footer.tsx`)
- Links institucionais para `/sobre`, `/contacto`, `/rgpd` — **rotas inexistentes**.
- Os restantes (`/privacidade`, `/termos`, `/aviso-legal`, `/cookies`) existem.

### C. Homepage (`src/routes/index.tsx`)
- Sem CTA comercial. Tem secção "Acesso rápido · Testes" com link para perfil de teste e mockup — visível em produção pública.

### D. `/analyze/:username` — `PremiumLockedSection` + `ReportGateModal` (estado `idle`)
- CTA `Desbloquear relatório completo` abre modal que recolhe email e gera o relatório completo. **Este é o fluxo MVP real** ("relatório grátis + email"). OK funcionalmente; a palavra "Desbloquear" pode dar a entender pagamento.

### E. `ReportGateModal` — estado `paywall` (limite mensal)
- Cartão "Compra pontual · 3 €" com botão `Desbloquear novo relatório` desativado, `title="Disponível em breve"`.
- Cartão "Acesso Pro · 10 €/mês" com botão `Ver plano Pro` desativado, `title="Disponível em breve"`.
- Preços firmes apresentados como definitivos, embora desativados.

### F. `PostAnalysisConversionLayer`
- Cartão "Compra pontual · 3 €" → botão `Em breve` desativado.
- Cartão "Pro · 10 €/mês" (Recomendado) → botão `Pedir acesso Pro` (mailto `hello@instabench.pt`).
- Cartão "Agency · 39 €/mês" → botão `Saber mais` (mailto).
- Mailtos funcionam, mas os preços são apresentados como tabela final e o domínio `instabench.pt` precisa de existir como caixa de email.

### G. `PremiumCallout` + `PremiumInterestDialog` (relatório v2)
- Botão `Desbloquear` (variant gold) abre dialog "Estamos a recolher interesse para definir os preços finais".
- Dialog lista quatro opções com preços firmes: `€3 + IVA`, `€13 + IVA`, `Em estudo`, `Sob proposta`. Conflito entre "preços por definir" e preços já fixados nos cartões.

### H. `/app/plan`
- Pro / Agency com badge `Em breve`, manifesto explícito: "Não existem cobranças nem funcionalidades ativas dos planos Pro e Agency neste momento." **OK — manter.**

### I. `/reports/:snapshotId`, `/app/reports`, páginas legais
- Sem CTAs comerciais quebrados detectados.

## 2. Alterações propostas (apenas copy/UI)

### Header
- Reduzir nav a items reais: `Analisar` (`/`), `Como funciona` (âncora ou remover até existir página), `Preços` → **remover**, `Recursos` → **remover**.
- Decisão recomendada: manter só `Analisar` no header até existir página dedicada. Em mobile drawer idem.
- `Analisar agora` → adicionar `asChild` + `<Link to="/">` com scroll para o input do hero (ou simplesmente para `/`).

### Footer
- Remover `Sobre`, `Contacto`, `RGPD` (não existem).
- Manter `Privacidade`, `Termos`, `Aviso legal`, `Cookies`. Adicionar contacto via `mailto:` em vez de página.

### `ReportGateModal` (estado paywall)
- Substituir preços firmes por linguagem de fase beta:
  - Cartão "Compra pontual": remover `3 €`; texto: "Pagamento por relatório (em estudo)".
  - Cartão "Acesso Pro": remover `10 €/mês`; texto: "Acompanhamento contínuo (em estudo)".
- Manter botões desativados com `title="Em breve"`.
- Trocar copy do header de "2 relatórios gratuitos já utilizados este mês" para algo coerente com a fase beta (ex.: "Limite gratuito da fase beta atingido"). Manter quota ativa só se o backend a aplica de facto — confirmar antes; caso contrário, reescrever para "Estamos em fase beta — entra em contacto para mais relatórios" com mailto.

### `PostAnalysisConversionLayer`
- Remover preços firmes (`3 €`, `10 €/mês`, `39 €/mês`) dos três cartões.
- Substituir por "Em estudo durante a fase beta" / "Acesso Pro em preparação" / "Agency sob proposta".
- Manter mailtos para Pro e Agency (são canais reais de interesse). Confirmar que `hello@instabench.pt` existe; caso contrário, usar email institucional ativo do projeto.
- Cartão "Compra pontual": botão `Em breve` desativado já é OK.
- `note: "Acesso recorrente disponível em breve"` — manter.

### `PremiumInterestDialog`
- Remover preços específicos (`€3 + IVA`, `€13 + IVA`) das opções, deixando "Em estudo" / "Em estudo" para todas, ou mover preços para uma única linha de "indicação preliminar". Coerente com header "preços finais por definir".
- Manter o disclaimer "Sem pagamento agora".

### `PremiumLockedSection` / `PremiumCallout`
- Substituir o verbo "Desbloquear" pelo mais neutro "Receber relatório completo" no botão principal do `PremiumLockedSection` (a ação real é entregar PDF por email, não desbloquear pago).
- `PremiumCallout` (gold PRO): manter, mas trocar o microcopy do badge de `Desbloquear` para `Registar interesse` para alinhar com o dialog.

### Homepage
- Esconder a secção "Acesso rápido · Testes" em produção (ela aponta para perfil pessoal e para mockup editorial). Manter visível só em dev (`import.meta.env.DEV`).

## 3. CTAs intencionais que ficam

- `Analisar agora` (header) → leva ao input do hero.
- `Receber relatório completo` (era "Desbloquear") em `/analyze/:username` → abre `ReportGateModal` para recolher email — MVP real.
- `Pedir acesso Pro` / `Saber mais Agency` (mailto) → canais reais de interesse, sem promessa de checkout.
- `/app/plan` cards Pro/Agency com `Em breve` e manifesto — já transparente.
- `PremiumInterestDialog` opções → continuam como interest capture, sem pagamento.

## 4. Validação

- `bunx tsc --noEmit`
- `bunx vitest run`
- Manual:
  - Header sem links partidos.
  - Footer sem links partidos.
  - `/analyze/:username` sem botão que prometa pagamento.
  - Modal de limite mensal sem preços firmes.
  - Sem CTAs que afirmem "comprar / checkout / subscrever" em qualquer ecrã público.

## 5. Detalhes técnicos

- Ficheiros a editar (apenas copy/UI):
  - `src/components/layout/header.tsx`
  - `src/components/layout/footer.tsx`
  - `src/components/product/report-gate-modal.tsx`
  - `src/components/product/post-analysis-conversion-layer.tsx`
  - `src/components/product/premium-locked-section.tsx`
  - `src/components/report-redesign/v2/premium-interest-dialog.tsx`
  - `src/components/report-redesign/v2/premium-callout.tsx` (microcopy badge)
  - `src/routes/index.tsx` (gating de dev na secção de testes)
- Sem migrations, sem backend, sem alteração de pricing logic, sem chamadas a providers.

## 6. Confirmações antes da implementação

1. Confirma o email institucional ativo a usar nos `mailto:` (atual: `hello@instabench.pt`).
2. Confirma se a quota mensal "2 relatórios grátis" está realmente aplicada pelo backend, ou se devemos reescrever o estado `paywall` como "fase beta — contacta para mais".
3. Confirma se queremos remover totalmente `Preços / Recursos / Como funciona` do header, ou criar páginas mínimas de placeholder ("Em construção").
