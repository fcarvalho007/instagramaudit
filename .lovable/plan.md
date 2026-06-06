# Sticky Unlock Bar — Refinamento (Opção A)

Alinhar a `StickyUnlockBar` com os mockups: fundo escuro de marca, cadeado destacado, mini-indicador de progresso real, contador único e dismissal persistente em mobile. Sem mexer em pricing, checkout, gating ou geração de relatório.

## Ficheiro a alterar
- `src/components/report-redesign/v2/sticky-unlock-bar.tsx` (único)

## Mudanças

### 1. Estilo visual (desktop + mobile)
- Fundo: navy de marca `#03045E` (já é token de report) com leve transparência sobre `rgba(11,16,32,0.96)` + `backdrop-blur`. Texto branco/`#CAF0F8` para subtítulo.
- Cadeado: passa a quadrado destacado `bg-white/8` `rounded-lg` com cadeado em `#90E0EF`.
- CTA "Desbloquear": mantém `bg-accent-primary` (`#3772E5`) com `text-white`, hover `bg-[#3D9AFF]`. Pill, font-semibold, sentence case.
- Preço `9€` branco, sufixo "único" em `text-white/60`.
- Borda superior: hairline `border-white/8` em vez de `border-border-default`.
- Sombra: `0 -12px 32px -16px rgba(3,4,94,.45)` para a barra "saltar" da página clara.

### 2. Mini-indicador de progresso (real, alinhado a 5)
- Fonte única: os 5 teasers premium definidos em `PREMIUM_TEASERS` (`report-overview-block.tsx`) — `frequencia`, `formatos`, `publicacoes-chave`, `diagnostico-editorial`, `prioridades`. Total = **5**.
- Hook novo `useTeaserProgress(["frequencia","formatos","publicacoes-chave","diagnostico-editorial","prioridades"])` interno ao ficheiro: um `IntersectionObserver` por anchor; marca cada um como "visto" quando entra no viewport (one-shot, sem desmarcar).
- Render: 5 segmentos `h-[3px] w-6 rounded-full`; vistos = `bg-[#22C55E]` (verde calmo), por ver = `bg-white/15`.
- Label do contador = `Faltam ${5 - viewed} secções premium` quando `viewed < 5`; quando todos vistos, oculta a linha de subtítulo e mantém só "Desbloqueia o relatório completo" para coerência. Subtítulo curto (`frequência, formatos, publicações-chave, diagnóstico, prioridades`) só quando `viewed === 0` no desktop; mobile sempre oculta.

### 3. Reconciliação do contador (single source of truth)
- Eliminar o "5 secções" hardcoded espalhado. Centralizar em constante local `PREMIUM_TEASER_IDS` e derivar `TOTAL = 5` daí. Texto da barra usa sempre esta constante.
- (Fora deste prompt) os textos "Relatório completo · 5 secções premium" em `report-overview-block.tsx` já dizem 5 — coerentes. Nenhuma alteração necessária noutros ficheiros nesta task.

### 4. Comportamento de scroll (já correcto, validar)
- Aparece quando `#frequencia` intersecta (1º teaser premium) → continua igual.
- Esconde quando `#lead-magnet-card` está visível → continua igual.
- Nenhuma alteração lógica ao `useStickyUnlockTrigger`.

### 5. Dismissal persistente em mobile
- Estado `dismissed` passa a hidratar de `sessionStorage.getItem("sticky_unlock_bar:dismissed") === "1"`.
- Ao fechar: `setDismissed(true)` e `sessionStorage.setItem("sticky_unlock_bar:dismissed","1")`.
- SSR-safe: leitura dentro de `useEffect` com lazy state initializer guard `typeof window !== "undefined"`.
- Aplica-se a ambos os variants (uma só preferência partilhada).

### 6. Layout mobile (variante info + botão)
Alinhar com o segundo mockup:
- Card empilhado em duas linhas em vez de uma:
  - Linha superior: cadeado quadrado + ("Faltam 5 secções" + "9€ · pagamento único") + 5 segmentos à direita.
  - Linha inferior: botão CTA full-width "Desbloquear relatório completo".
- Mantém `mx-3 mb-[72px]` para ficar acima da tab bar.
- Mantém `×` discreto no canto superior direito do card.

### 7. Acessibilidade
- `aria-label` no `nav`/`section` da barra.
- Indicador de progresso com `role="progressbar"` `aria-valuemin=0 aria-valuemax=5 aria-valuenow={viewed}` e `aria-label="Secções premium vistas"`.
- Botão fechar mantém `aria-label="Fechar barra"`.

## Forbidden (não tocar)
- `PUBLIC_PRODUCTS`, preços, EuPago, checkout, entitlements, credits, schema.
- AI / Apify / DataForSEO / OpenAI.
- Geração de relatório, snapshot, Pro/Lab.
- `report-overview-block.tsx`, premium teasers, gating do shell.

## Validação manual
1. Free report: barra escura aparece ao chegar ao 1º teaser; desaparece no card final.
2. Indicador mostra 5 segmentos; vão ficando verdes ao scrollar por cada teaser.
3. Contador mostra "Faltam 5 → 4 → 3 → … → 0" coerente.
4. Pro/Lab: barra não aparece (`#frequencia` não está montado nesses modos para free; gating do shell mantém-se).
5. Mobile: layout em duas linhas com CTA full-width; fechar guarda em `sessionStorage`; reload mesma sessão → não reaparece; nova janela/sessão → reaparece.
6. Preço dinâmico continua a vir de `PUBLIC_PRODUCTS.report_full_9.priceLabel`.
7. Contraste AA do branco sobre `#03045E` e do `#3772E5` sobre o mesmo fundo.
