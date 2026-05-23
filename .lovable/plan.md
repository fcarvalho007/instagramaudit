## Problema

Em `/admin` (Visão Geral → Funil de Conversão), o diagrama é um `<svg viewBox="0 0 800 280">` com 6 labels de texto posicionados em coordenadas absolutas — eyebrow + valor à esquerda e à direita de cada trapézio.

Em viewports estreitos (≤414px) o SVG escala para baixo via `preserveAspectRatio`, mas os labels mantêm proporção e acabam por sobrepor-se. No screenshot enviado vê-se claramente:

- `LEADS · REGISTOS` colide com `CONVERSÃO VISITANTE → LEAD`
- `CLIENTES PAGANTES` colide com `CONVERSÃO LEAD → CLIENTE` (renderizado como `CLIENTESVERPÃGABAND`)

Ficheiro afetado: `src/components/admin/v2/visao-geral/funnel-section.tsx` (apenas este componente — `AdminCard`, `AdminStat`, banner, etc. ficam intactos).

## Solução

Renderização dupla controlada por breakpoint Tailwind `sm` (640px):

1. **≥ sm**: manter o `FunnelDiagram` SVG atual exactamente como está.
2. **< sm**: renderizar uma versão empilhada em HTML — 3 cartões verticais (Visitantes, Leads, Clientes), cada um com:
   - eyebrow + valor principal (lado esquerdo do trapézio actual)
   - taxa de conversão por baixo, em linha separada (lado direito do trapézio actual)
   - faixa de cor de fundo correspondente ao tom do trapézio (`funnelTop`, `funnelMid`, `funnelBase`) para preservar a metáfora de funil
   - largura decrescente (100% → 88% → 76%) com `mx-auto` para manter leitura visual de funil

Tipografia segue regras do projeto admin: eyebrow `text-eyebrow-sm` (Inter uppercase, já existente nos tokens), valor em Inter SemiBold com `tabular-nums`. Sem JetBrains Mono na versão mobile — o SVG desktop mantém-se inalterado.

Sem alterações a cores hardcoded: reutiliza `ADMIN_LITERAL.funnelTop/Mid/Base/Eyebrow/LightEyebrow/BaseText` já importados.

## Implementação

Editar apenas `src/components/admin/v2/visao-geral/funnel-section.tsx`:

1. No `AdminCard` que envolve `<FunnelDiagram>`:
   - Reduzir o `!p-10` para algo como `!p-4 sm:!p-10` (o padding generoso desktop sufoca mobile).
   - Envolver `<FunnelDiagram>` numa `div` com `hidden sm:block`.
   - Adicionar irmão `<FunnelStackedMobile data={data} />` com `sm:hidden`.

2. Criar `FunnelStackedMobile({ data })` no mesmo ficheiro:
   - Array com 3 layers: `{ left, right, bg, fg, width }`.
   - Cada layer é um `<div>` com `background: bg`, `width`, `mx-auto`, `rounded-md`, padding interno.
   - Dentro: eyebrow + valor à esquerda (sempre visível) e, se `right.value !== "—"`, linha separada `eyebrow → valor` por baixo com `border-t` ténue.

Sem mudanças no SVG, no banner `PaymentsPendingBanner`, na grelha "Conversão Total / Receita por lead / Valor médio cliente" (essa já é `grid-cols-1 sm:grid-cols-3`, está correcta).

## Validação

- [ ] Preview em 411px (viewport actual do utilizador): 3 cartões empilhados, sem sobreposição, eyebrows legíveis.
- [ ] Preview em 375px: idem.
- [ ] Preview em 768px+: SVG original inalterado.
- [ ] Demo mode ON e OFF mostram os valores correctos.
- [ ] `bunx tsc --noEmit` passa.

## Fora de âmbito

- Não tocar em `/report.example`.
- Não alterar `MOCK_FUNNEL` nem `ZERO_FUNNEL`.
- Não mexer noutras secções do admin (apenas funil).
- Não substituir o SVG desktop por HTML — só adicionar a variante mobile.
