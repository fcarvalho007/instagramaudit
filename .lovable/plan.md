## Objetivo

Refinar visualmente o Bloco 1 (Visão geral) + sidebar do relatório `/analyze/$username`, aproximando do Iconosquare:

1. Adotar a paleta **Ocean Breeze** como base do azul.
2. Unificar os botões em **sentence case** (manter eyebrows/labels uppercase — são chips, não botões; a regra core de eyebrow Inter uppercase mantém-se).

Âmbito limitado: tokens de azul + componentes da sidebar (`report-block-nav.tsx`) + hero/ações do Bloco 1 (`report-hero.tsx` / `report-hero-v2.tsx`) + cards "Continuar leitura" / "Premium". **Não toca** noutros blocos, landing, admin nem `/report.example`.

## Paleta Ocean Breeze → tokens

Mapeamento em `src/styles/tokens-light.css` (override `[data-theme="light"]`, scoped a relatórios):

```
#03045E navy        → --text-primary, --border-strong (titulos/CTAs escuros)
#0077B6 ocean       → --accent-primary (azul principal Iconosquare-like)
#00B4D8 cyan        → --accent-luminous (hover, data accent secundário)
#90E0EF aqua        → chips/badges suaves (bg de pills "Premium", ring sutil)
#CAF0F8 aqua-pale   → surface accent (highlight de selected items na sidebar)
```

Mantém-se: `--surface-base #FAFBFD`, `--surface-secondary #FFFFFF`, `--surface-muted #F1F4F9`. Substituem-se as classes hardcoded `bg-blue-50 / text-blue-700 / ring-blue-200 / focus:ring-blue-400` em `report-block-nav.tsx` por equivalentes via tokens (`bg-accent-soft`, `text-accent-primary`, `ring-accent-soft`). Sem `slate-*`.

## Botões → sentence case

Converter para sentence case (label + remover `uppercase tracking-[…]`):

- `nav.access.cta` (PremiumBlockCard): `"DESBLOQUEAR ACESSO PREMIUM"` → `"Desbloquear acesso premium"`
- `nav.access_locked.cta` (ContinueReadingCard, "CONTINUAR LEITURA GRATUITA"): → `"Continuar leitura gratuita"`
- Botões internos do hero do Bloco 1 (`Novo relatório`, `Comparar concorrente`, `PDF`, `Partilhar`): já estão em sentence case; só normalizar weight/tracking para o mesmo padrão Inter SemiBold sem `uppercase`.

**Mantêm-se uppercase (são eyebrows/chips, não botões — respeita a regra core):**
- `ANÁLISE DE PERFIL`, `DISPONÍVEL AGORA`, `GRÁTIS`, `EM BREVE · Julho 2026`, `ACESSO GRATUITO · BETA`, `01 / 02 / 03…`
- Badges `VariantBadge` (`internal_lab`, `pro_active`)
- Badge "5 por desbloquear" (já é chip)

Aplica-se a regra `.text-eyebrow` (Inter uppercase) — sem alterações.

## Ficheiros a tocar

1. `src/styles/tokens-light.css` — novos valores `--accent-*` + `--text-primary` (Ocean Breeze).
2. `src/components/report-redesign/v2/report-block-nav.tsx` — substituir `bg-blue-50 / text-blue-700 / ring-blue-200` por tokens; remover `uppercase tracking-[0.08em]` dos 2 botões CTA; novo `rounded-full` consistente.
3. `src/i18n/locales/pt/report.json` (+ `en/report.json`) — converter os 2 labels CTA para sentence case.
4. `src/components/report-redesign/report-hero.tsx` + `v2/report-hero-v2.tsx` — garantir que os botões de ação usam o mesmo estilo (sentence case, Inter SemiBold, sem `uppercase`); pill "EM BREVE · Julho 2026" mantém-se eyebrow.
5. `mem://design/report-light-tokens` — atualizar nota da paleta (Ocean Breeze) para futuras sessões.

## Validação

- `bunx tsc --noEmit`
- Preview `/analyze/frederico.m.carvalho` a 1460×905 e 411×742; confirmar:
  - Sidebar: azul navy (#03045E) no item ativo, ocean (#0077B6) no botão "Continuar leitura gratuita" (sentence case), aqua suave (#CAF0F8) no fundo do item selecionado.
  - Hero: `@frederico.m.carvalho` em navy; botão "+ Novo relatório" navy escuro consistente; `EM BREVE` continua uppercase pill.
  - Card lead-magnet ("Continua a leitura gratuita…"): CTA "Ver relatório gratuito" em sentence case e azul ocean.
  - Nenhum outro bloco do relatório alterado (mantém o azul atual onde não chega o override — visto que o override é em `[data-theme="light"]` que cobre o report inteiro, validar visualmente blocos 5–10 para evitar regressões; se houver desvio indesejado, restringe-se via classe wrapper no Bloco 1).

## Fora de âmbito

- Landing, admin, `/report.example`, restantes blocos visuais.
- Mudar tipografia, espaçamento, ou re-arquitetura da sidebar (shadcn `Sidebar`).
- Dark mode.
