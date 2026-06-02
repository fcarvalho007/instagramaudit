# Refinamentos finais — Landing Dark

A estrutura das 9 bandas, i18n, rotas (`/precos`, `/report/example`), animações com `prefers-reduced-motion`, footer global preservado e tsc limpo estão **OK**. Restam 3 ajustes de polimento que correspondem aos avisos da pesquisa e às regras do projeto.

## 1. Contraste AA dos textos secundários (aviso da pesquisa)

Em `src/styles/hero-dark.css`, clarear ligeiramente dois tokens usados em metadados e legendas sobre fundo escuro:

```text
--hero-text-secondary: 186 196 222  →  202 212 232   (#CAD4E8)
--hero-text-tertiary:  134 146 178  →  168 180 208   (#A8B4D0)
```

Resultado: ambos passam confortavelmente AA sobre `--hero-bg-base`, mantendo a hierarquia visual.

## 2. Mockup do relatório claramente fictício

Em `report-preview-band.tsx` (regra do projeto: "nunca dados inventados apresentados como reais"):

- Substituir a chip `tag` no topo do card por um badge **"Exemplo · dados fictícios"** (já existe `dark.preview.card.tag` no i18n — apenas mudar o valor da string em `pt/landing.json` e `en/landing.json`).
- Adicionar nota inline (`text-xs`, `--hero-text-tertiary`) por baixo do card: *"Mockup ilustrativo. Os números reais vêm do teu perfil."* (nova chave `dark.preview.disclaimer`).

Mantém `@marca_exemplo`, `0,64%`, `@concorrente_a/b` como estão — passam a estar explicitamente identificados como exemplo.

## 3. Tamanhos mínimos legíveis (regra Core: ≥12px = `text-xs`)

9 ocorrências de `text-[9px]` / `text-[10px]` em `report-preview-band.tsx`, `how-it-works-band.tsx`, `pricing-teaser-band.tsx` são metadados/labels/eyebrows — não são axis ticks. Subir todos para `text-xs` (12px), ajustando `tracking` quando necessário para evitar quebras. Eyebrows mantêm uppercase + tracking-wider.

## Fora de scope

- Não tocar em Hero, Footer global, `tokens.css`, `/analyze/*`, `/report/example`, `/precos`, backend, i18n estrutura.
- Não alterar a paleta principal nem adicionar libs.

## Validação

- `bunx tsc --noEmit`
- Smoke visual 1440×900 e 390×844: confirmar que os badges "Exemplo" estão visíveis no card e que os labels deixaram de parecer "micro-texto".
- Verificar contraste com DevTools (ratio ≥ 4.5 para body, ≥ 3 para large).

## Arquivos a editar

- `src/styles/hero-dark.css` (2 valores de token)
- `src/components/landing/dark/report-preview-band.tsx` (badge + disclaimer + sizes)
- `src/components/landing/dark/how-it-works-band.tsx` (1 size)
- `src/components/landing/dark/pricing-teaser-band.tsx` (1 size)
- `src/i18n/locales/pt/landing.json` e `en/landing.json` (2 chaves: `tag` reescrita + `disclaimer` nova)
