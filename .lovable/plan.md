## Problema

Na home `/`, o vídeo decorativo no rodapé do hero quase não se vê. Duas causas combinadas em `src/components/landing/hero-video-strip.tsx`:

1. **Opacidade muito baixa do `<video>`**: `opacity-[0.15] sm:opacity-[0.22] lg:opacity-[0.24]` — mesmo em desktop fica a ~24%.
2. **Gradiente vertical demasiado opaco**: passa de `0%` no topo para `0.55` a 60% e `0.95` no fundo (`--hero-bg-base`). Como a faixa só tem 160px, mais de metade da altura útil está praticamente coberta pelo background do hero. O resultado é o que se vê na screenshot: uma banda escura quase uniforme, sem leitura do vídeo.
3. **Gradiente lateral adicional** (0.6 nas pontas) reforça a sensação de "tapado" em ecrãs largos.

## Correção (apenas em `hero-video-strip.tsx`, sem mexer no hero nem nos assets)

1. **Aumentar opacidade do vídeo/poster** para um nível ainda subtil mas legível:
   - `opacity-[0.35] sm:opacity-[0.5] lg:opacity-[0.6]`
   - Mantém o vídeo como camada decorativa, mas deixa-se ler o movimento da água.

2. **Suavizar gradiente vertical** para que o vídeo respire na zona central da faixa e só funda no rodapé:
   - `linear-gradient(to bottom, rgb(var(--hero-bg-base) / 0.35) 0%, rgb(var(--hero-bg-base) / 0) 35%, rgb(var(--hero-bg-base) / 0) 70%, rgb(var(--hero-bg-base) / 0.55) 100%)`
   - Fade curto no topo (para colar à secção seguinte do hero), zona central limpa, fade suave no fundo. Nada de 0.95.

3. **Aliviar gradiente lateral** para que não pareça "tapado" nas extremidades:
   - Reduzir de `0.6` para `0.25` nas pontas, alargar a zona limpa de `12%/88%` para `8%/92%`.

4. **Aumentar ligeiramente a altura da faixa** para dar presença sem invadir o conteúdo:
   - `h-[90px] sm:h-[130px] md:h-[170px] lg:h-[210px]`
   - Continua confortavelmente abaixo do input/CTA e do mockup à direita.

5. **Modo `prefers-reduced-motion`**: aplicar exactamente a mesma opacidade ao `<img>` poster (para manter consistência visual quando o vídeo é substituído).

## Não mexer

- `hero-section.tsx`, `LandingDarkIsland.tsx`, headline, CTA, mockup, `HeroAuroraBackground`.
- Assets `background-strip.mp4` / `background-strip-poster.jpg`.
- Nenhum token global em `tokens.css`.
- Sem alterações ao `/analyze`, admin, locked files.

## Validação

- `bunx tsc --noEmit`.
- Screenshot em 1440×900 e 390×844: confirmar que o vídeo se lê claramente como camada decorativa subtil, sem competir com headline/CTA/mockup, e que não há banda preta sólida no rodapé do hero.

## Output esperado

- Ficheiros alterados: `src/components/landing/hero-video-strip.tsx` (único).
- Antes/depois das opacidades e gradientes.
- Resultado do `tsc`.