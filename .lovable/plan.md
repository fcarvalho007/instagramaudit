# Homepage — ajustes ao hero

Mudanças pedidas, todas no hero da `/` (sem mexer no resto da landing dark, sem mexer no input branco que está bloqueado por memória).

## 1. Copy (i18n pt + en)

Ficheiros: `src/i18n/locales/pt/landing.json` e `src/i18n/locales/en/landing.json`.

- `hero.eyebrow` — manter a key mas deixar de a renderizar (ver passo 2). Não apagar a key para não partir EN/outros consumers.
- `actionBar.microLabel`:
  - pt: `"Inserir perfil público do Instagram"`
  - en: equivalente (`"Enter a public Instagram profile"`).
- `actionBar.submit`:
  - pt: `"Analisar grátis"`
  - en: `"Analyse for free"`.
- `actionBar.trustInline.freeReports` — manter a key (usada noutros sítios? confirmar), mas remover do array `trustInline` no componente.

## 2. Hero — remover chip e ampliar título

Ficheiro: `src/components/landing/hero-section.tsx`.

- Remover o bloco do eyebrow ("• BENCHMARK DE INSTAGRAM") inteiro — `<div className="flex justify-center lg:justify-start"> … </div>`.
- Aumentar a escala do H1 no `BlurRevealText` da headline:
  - de `text-[2.125rem] sm:text-4xl md:text-5xl lg:text-6xl` →
    `text-[2.5rem] sm:text-5xl md:text-6xl lg:text-7xl`
  - apertar leading: `leading-[1.05] sm:leading-[1.02]`
  - tracking ligeiramente mais fechado: `tracking-[-0.02em]`
  - manter `text-balance` e `font-medium`.
- Compensar espaço removido pelo chip: ajustar `space-y-6 md:space-y-7` → `space-y-7 md:space-y-8` para o título respirar.

## 3. Action bar — sem trust list, botão "Analisar grátis"

Ficheiro: `src/components/landing/hero-action-bar.tsx`.

- Remover o array `trustInline` e o `<ul>` correspondente quando não há erro. Manter o `<p role="alert">` para o estado de erro.
- O label do botão já vem de `t("actionBar.submit")` — basta a alteração em i18n. Confirmar visualmente que cabe ("Analisar grátis" + seta).
- O microLabel acima da barra (Instagram glyph + texto) também já vem de `t("actionBar.microLabel")` — fica "Inserir perfil público do Instagram".

## 4. Toque mais cinematográfico (scoped, sem libs novas)

Tudo via tokens / CSS existente, sem mexer em `hero-action-bar.tsx` para além do passo 3.

a. **Headline com gradiente subtil** em `hero-section.tsx`:
  - manter `highlightTailWords={2}` ("em segundos.") mas trocar `highlightClassName` para um gradiente cyan→violet usando os tokens já presentes em `hero-dark`:
    `"bg-gradient-to-r from-[rgb(var(--hero-cyan-soft))] via-[rgb(var(--hero-cyan))] to-[rgb(var(--hero-violet))] bg-clip-text text-transparent"`.

b. **Vignette mais profunda + halo cyan no topo** em `src/styles/hero-dark.css`:
  - Adicionar classe utilitária `.hero-cinematic-vignette` (radial gradient escuro nos cantos + halo cyan suave atrás do título) e aplicá-la ao `<section id="hero">`. Respeita `prefers-reduced-motion`. Não substitui o `HeroAuroraBackground`, sobrepõe.

c. **Subtítulo mais respirado**: `text-[1.0625rem] md:text-lg` → `text-[1.125rem] md:text-xl`, `leading-relaxed` → `leading-[1.6]`, cor mantém-se `--hero-text-secondary`.

d. **Padding vertical maior em mobile** no `<Container>` do hero: `py-12 md:py-24 lg:py-28` → `py-16 md:py-28 lg:py-32` para dar o ar editorial / cinemático que o utilizador pede.

Nenhum destes ajustes mexe em fontes (continua Fraunces + Inter), nem em cores hardcoded fora de tokens, nem na caixa branca do input (locked).

## 5. Memória do projecto

Ficheiro: `mem/design/hero-homepage.md`.

- Atualizar a regra da trust list: "Sem trust list por baixo da caixa — apenas mensagem de erro quando aplicável."
- Acrescentar: "Hero sem chip eyebrow. H1 maior, cinematic vignette aplicada via `.hero-cinematic-vignette`."

## Detalhes técnicos

- Não tocar em `LOCKED_FILES.md` nem em ficheiros listados como bloqueados.
- A `FinalCtaBand` reutiliza `HeroActionBar`; o botão passa a "Analisar grátis" também lá, o que é coerente. Confirmar no preview.
- Sem mudanças em rotas, servidor, ou data.

## Checkpoint

- ☐ Chip "Benchmark de Instagram" removido do hero
- ☐ H1 maior + tracking/leading apertados + gradiente cyan→violet em "em segundos."
- ☐ Subtítulo ligeiramente maior e mais arejado
- ☐ MicroLabel: "Inserir perfil público do Instagram"
- ☐ Botão: "Analisar grátis" (pt) / "Analyse for free" (en)
- ☐ Trust list "Oferta de 2 relatórios grátis" removida
- ☐ Vignette cinemática aplicada ao section do hero
- ☐ `mem/design/hero-homepage.md` actualizada
- ☐ Verificado no preview a 411×742 (mobile actual do utilizador) e 1280 desktop
