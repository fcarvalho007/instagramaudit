
# Auditoria da Landing Page — Abaixo do Fold

## Verdict: NEEDS STRUCTURAL SIMPLIFICATION

A página tem boa matéria-prima mas está repetitiva (3 secções a vender "porque é útil", 2 a explicar "o que vês"), tem um footer duplicado real (bug, não percepção), e a CTA central do `ReportPreviewBand` desvia o utilizador para `/report/example` em vez de o trazer de volta ao input do hero.

---

## 1. Inventário actual (10 bandas)

Ordem actual em `src/components/landing/dark/landing-dark-island.tsx`:

| # | Banda | Ficheiro (LOC) | Papel | Veredicto |
|---|-------|----------------|-------|-----------|
| 1 | StatsBand | 81 | 3 stats de credibilidade ("posts analisados", "engagement médio", "escalões") | **manter** — prova social barata |
| 2 | ManualVsToolBand | 112 | Tabela "manual vs ferramenta" (8 bullets) | **manter, encurtar** — define o problema |
| 3 | ReportPreviewBand | 252 | Mockup do relatório + CTA "Ver relatório completo · +7 secções" → `/report/example` + 3 sub-highlights | **manter, mas CTA errada** |
| 4 | HowItWorksBand | 112 | 3 passos | **manter** — essencial |
| 5 | BentoMetricsBand | 125 | Grelha 2×2: benchmark, engagement, frequência, formato, concorrentes | **fundir com #3** — repete o que o preview já mostra |
| 6 | PersonasBand | 57 | 4 personas (consultores, SMM, marcas, criadores) | **cortar ou comprimir a 1 linha** — não converte, dilui foco |
| 7 | TransparencyBand | 64 | "Sem login. Só dados públicos." + 3 chips | **manter, encurtar** — remove fricção |
| 8 | PricingTeaserBand | 154 | 3 cards de preços | **manter** — ancora valor |
| 9 | FinalCtaBand | 34 | Headline + lead + `<HeroActionBar />` (input do hero replicado) | **manter** — fecho da página |
| 10 | MiniFooterStrip | 61 | Mini-footer dentro da ilha dark | **REMOVER — é o footer duplicado** |

### 1.1 Footer duplicado (bug real, não percepção)

`AppShell.tsx` na rota `/` monta `<DarkFooter />` no fim. A `LandingDarkIsland` termina com `<MiniFooterStrip />`. Resultado: **dois footers empilhados** (mini + global). A correcção é eliminar o `MiniFooterStrip` da ilha; o `DarkFooter` global já cobre tudo.

### 1.2 CTA fora de sítio (`ReportPreviewBand`)

```
"cta": "Ver relatório completo · +7 secções"  →  Link to="/report/example"
```

Manda o utilizador a uma página de mockup interna em vez de o devolver ao input principal. Deve passar a ser uma âncora para o topo (ou para `#hero-input`) com copy "Analisar o meu perfil grátis".

---

## 2. Avaliação por critério

### 2.1 Essenciais para conversão (manter)
- Hero (intocável)
- **StatsBand** — 3 números, sinal rápido de credibilidade
- **ReportPreviewBand** (com CTA corrigida) — única secção que mostra o produto
- **HowItWorksBand** — reduz fricção mental
- **PricingTeaserBand** — ancora valor antes da CTA final
- **FinalCtaBand** — último input de captura

### 2.2 Repetitivas (cortar ou fundir)
- **BentoMetricsBand × ReportPreviewBand** — o preview já lista engagement, frequência, formato, concorrentes. O bento repete os mesmos 4 conceitos sem produto visível. → **eliminar bento**, e mover o card "Benchmark com o escalão" (o único conteúdo único do bento) para dentro do preview ou para a banda de stats.
- **ManualVsToolBand × HowItWorksBand** — ambas explicam "porque é fácil". O manual-vs-tool tem mais punch (problema antes da solução), por isso fica e o "como funciona" passa a 3 linhas inline em vez de 3 cards grandes.
- **PersonasBand** — não converte e ocupa um ecrã inteiro com 4 títulos. → **comprimir a uma linha** ("Para consultores, SMMs, marcas e criadores.") integrada na TransparencyBand, ou cortar de vez.

### 2.3 Texto para encurtar
| Local | Actual | Sugerido |
|-------|--------|----------|
| `dark.preview.cta` | "Ver relatório completo · +7 secções" | "Analisar o meu perfil grátis" |
| `dark.preview.lead` | "Métricas claras, benchmark visual e comparação com concorrentes — pronto a partilhar." | "Métricas, benchmark e concorrentes — num só relatório." |
| `dark.preview.disclaimer` | "Mockup ilustrativo. Os números reais vêm do teu perfil." | "Exemplo. Os números reais vêm do teu perfil." |
| `dark.bento.benchmark.body` | "O número sozinho não diz nada. Mostramos-te onde estás face a perfis do mesmo tamanho." | (mover para subtítulo das stats, em 1 linha) |
| `dark.transparency.body` | 2 frases longas | "Só dados públicos. Sem login do Instagram. Conforme o RGPD." (já são as chips) → remove o parágrafo, deixa só as chips |
| `dark.finalCta.lead` | "2 relatórios grátis. Sem cartão, sem login do Instagram." | "Grátis. Sem cartão. Em segundos." |

Regra geral: **um eyebrow + um headline curto + um sub-line de no máximo 12 palavras**. Hoje várias bandas têm 2 a 3 parágrafos.

### 2.4 CTAs que devem apontar de volta ao input do hero
- `ReportPreviewBand` → link `to="#"` (topo) ou âncora para o `HeroActionBar`. Copy: **"Analisar o meu perfil grátis"**.
- `PricingTeaserBand` card "Visão inicial" (free) → âncora topo em vez de qualquer outra rota.
- Manter `FinalCtaBand` como está (já tem o `<HeroActionBar />` embutido — não precisa de CTA externa).

### 2.5 Hierarquia visual
- Os headlines `font-display text-3xl/[34px]` repetem-se igualmente em todas as bandas → tudo soa ao mesmo nível. Sugestão: **3 níveis editoriais**
  - Hero H1 (intocado)
  - Bandas-produto (Preview, Pricing): H2 grande, `text-4xl`
  - Bandas-suporte (Stats, Manual×Tool, How, Transparency): H2 médio, `text-2xl`, sem aurora/spotlight
- Reduzir `dark-spotlight` a só 2 momentos (Preview + FinalCta) — actualmente quase todas as bandas brilham, anulando o efeito.

### 2.6 Treatment estilo 21st.dev / Aceternity
**Recomendo NÃO adicionar.** Razões:
- O dark-island já tem aurora no hero, hairlines, reveals e spotlight. Acrescentar "moving borders", "background beams", "spotlight cursor", etc. cria ruído e atrasa o load.
- O memory do projecto pede *Iconosquare-pure, no glow shadows, no cinematic noise*. Aceternity vai contra esse sistema.
- O único upgrade Aceternity-like que vale a pena é um **subtle gradient hover no card de preview** e talvez um `BlurReveal` no headline da `FinalCtaBand` (já existe `blur-reveal-text.tsx` no projecto — reutilizar).

### 2.7 Cinematicidade sem animação extra
- Aumentar o espaço vertical entre bandas-produto e cortar nas bandas-suporte.
- Eliminar 2 secções (bento + personas) → menos scroll, mais ritmo.
- Tipografia mais hierárquica (ver 2.5).
- Manter os `Reveal` existentes; não trocar por nada novo.

---

## 3. Estrutura proposta (de 10 → 7 bandas)

```
Hero (intocado)
 │
 ├─ 1. StatsBand              ← prova social (3 números)
 ├─ 2. ManualVsToolBand       ← problema (encurtar a 3+3 bullets, não 4+4)
 ├─ 3. ReportPreviewBand      ← produto (CTA: "Analisar o meu perfil grátis" → âncora topo)
 ├─ 4. HowItWorksBand         ← 3 passos, comprimido a uma linha por passo
 ├─ 5. TransparencyBand       ← chips, sem parágrafo; com micro-linha "Para consultores, SMMs, marcas, criadores."
 ├─ 6. PricingTeaserBand      ← 3 cards, manter
 └─ 7. FinalCtaBand           ← input do hero replicado
DarkFooter (global, único)
```

**Removidos:** BentoMetricsBand, PersonasBand, MiniFooterStrip.

---

## 4. Implementation plan (prompts pequenos)

Cada item = 1 prompt em Build Mode, independente, com `bunx tsc --noEmit` no fim.

**P1 — Fix do footer duplicado** (5 min, risco baixo)
- Remover `<MiniFooterStrip />` de `landing-dark-island.tsx`.
- Eliminar o import; manter o ficheiro `mini-footer-strip.tsx` por agora (caso queiras reutilizar) ou apagar.
- Verificar visualmente que só sobra o `DarkFooter`.

**P2 — Corrigir CTA do ReportPreviewBand** (5 min, risco baixo)
- Trocar `<Link to="/report/example">` por âncora `<a href="#top">` com `scrollIntoView` smooth para o `HeroActionBar`.
- Actualizar chave `dark.preview.cta` PT e EN para "Analisar o meu perfil grátis" / "Analyze my profile for free".

**P3 — Eliminar BentoMetricsBand** (10 min, risco baixo)
- Remover do array de bandas em `landing-dark-island.tsx`.
- Migrar o single insight "acima da média face ao escalão" para um terceiro stat na `StatsBand` ou para uma linha no `ReportPreviewBand`.

**P4 — Comprimir/eliminar PersonasBand** (10 min, risco baixo)
- Opção A: eliminar.
- Opção B: substituir por uma linha discreta dentro do `TransparencyBand` ("Usado por consultores, social media managers, marcas e criadores.").

**P5 — Encurtar copy** (15 min, só i18n)
- Aplicar as substituições da tabela 2.3 em `pt/landing.json` + paridade EN.

**P6 — Hierarquia tipográfica** (15 min, risco baixo, só Tailwind)
- 2 níveis de H2: produto (`text-4xl`) vs suporte (`text-2xl`).
- Limitar `dark-spotlight` a Preview + FinalCta.

**P7 — Polimento subtil opcional** (15 min, opcional)
- Hover gradient no card de preview.
- `BlurReveal` no headline da `FinalCtaBand` (reutilizar componente já existente).
- **NÃO adicionar libs Aceternity.**

---

## 5. Footer fix — detalhe

Causa raiz: `AppShell` já monta `DarkFooter` para `/`, e a ilha dark adiciona `MiniFooterStrip` no fim. Não é problema de CSS, é duplicação real de componente.

Correcção mínima: remover linha 39 (`<MiniFooterStrip />`) e o import na linha 7 em `src/components/landing/dark/landing-dark-island.tsx`. Nada mais é necessário.

---

**Próximo passo sugerido**: arrancar por P1 + P2 (footer + CTA) — são as duas correcções "bug-like" mais visíveis e de risco quase zero. Depois decidir se cortas bento + personas (P3+P4) ou se preferes ver um mock antes.
