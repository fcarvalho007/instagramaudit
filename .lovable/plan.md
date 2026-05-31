## Objetivo

Refinar a caixa do lead magnet em `src/components/product/report-lock-gate.tsx` para leitura mais elegante e remover a linha "Construído em Leiria".

## Alterações

**1. Tipografia mais legível e hierarquia mais calma**
- Título (h2): reduzir tamanho mobile de `text-[24px]` para `text-[22px]` (desktop mantém `text-[32px]`), apertar `tracking-[-0.015em]` e usar `leading-[1.15]`. Manter o handle quebrado em linha própria via `<br/>`, mas remover o sublinhado da palavra "gratuita" (componente `<free>`) — fica só negrito, mais limpo e elegante; o handle `@frederico…` mantém o destaque a azul.
- Subtítulo: subir para `text-[15px] md:text-[16px] leading-[1.6]` para respiração consistente com o resto do relatório (17px corpo).

**2. Espaçamento e estrutura**
- Padding: `p-6 md:p-7` → `p-7 md:p-8` para dar mais ar.
- Badge → título: `mt-5` → `mt-6`.
- Título → subtítulo: `mt-3` → `mt-4`.
- Subtítulo → CTA: `mt-6` → `mt-7`.

**3. CTA mais sóbrio**
- Trocar `bg-gradient-to-r from-accent-primary to-secondary` (gradiente azul→indigo que cria fade visível à direita) por cor sólida `bg-accent-primary hover:bg-accent-primary/92`, mantendo `rounded-lg`, `size="lg"` e a seta `→` no texto i18n. Resultado: botão mais limpo, sem efeito de "esbatimento" no canto direito.

**4. Footer**
- Remover o `<span>` do item "Heart / Construído em Leiria" (linhas 189–191).
- Remover import `Heart` de `lucide-react`.
- Manter apenas: `~1 minuto` e `RGPD · sem spam`, ambos centrados numa única linha — fica mais sucinto.
- (i18n) Não tocar em `gate.json`: a chave `lockGate.footer.made` deixa de ser referenciada mas pode ficar lá sem dano.

**5. Não mexer**
- Document stack decorativo, spine, halo prismático, blur de fundo: ficam intactos.
- Lógica `unlocked`, `onUnlockClick`, `DevResetButton`: intactos.
- Copy i18n (exceto deixar de usar `footer.made`).

## Validação
- `bunx tsc --noEmit`
- Preview mobile 411×742 em `/analyze/frederico.m.carvalho` (estado bloqueado) para confirmar leitura e ausência de "Construído em Leiria".
