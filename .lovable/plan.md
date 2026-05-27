## Problema

A última alteração ao `report-shell-v2.tsx` aplanou o fluxo em apenas 2 estados (free vs premium) e perdeu o gating do lead magnet. Resultado:
- O utilizador anónimo vê de imediato **todo** o Bloco 1 (Identity + Engagement + Frequência + Formato + Top vs Worst posts) sem ter de deixar contacto.
- O `BlockFeedback` e o `ReportEndOfFreeBlock` (“Há mais por trás deste perfil”) aparecem sempre, mesmo antes da captura de lead.
- O `ReportLockGate` (lead magnet) deixou de ser renderizado.

## Fluxo correto (3 estados)

**A · Anónimo** (`lockBoundary="engagement" && !unlocked && !premiumUnlocked`)
- Bloco 1 renderiza apenas `mode="free"` → só o **Editorial Identity Card** (“índice do perfil”).
- Logo a seguir, o **lead magnet card** (`ReportLockGate`) com CTA para abrir o `UnlockModal`.
- Sem `BlockFeedback`, sem `ReportEndOfFreeBlock`, sem blocos 2–6.

**B · Lead capturado** (`unlocked && !premiumUnlocked`)
- Bloco 1 renderiza **inteiro** (`mode="all"`) → Identity + Engagement + Frequência + Formato + Best vs Worst posts.
- `BlockFeedback` (emojis “breve pausa para te ouvirmos”) imediatamente a seguir.
- `ReportEndOfFreeBlock` (“Há mais por trás deste perfil” → Premium) como fronteira final.
- Sem blocos 2–6.

**C · Premium** (`premiumUnlocked`)
- Tudo igual ao B, mais blocos 2–6 (Diagnóstico, Performance, Conteúdo, Procura, Benchmark).

## Alterações (apenas `src/components/report-redesign/v2/report-shell-v2.tsx`)

1. **Re-importar `ReportLockGate`** de `@/components/product/report-lock-gate`.
2. **Bloco 1 condicional por estado:**
   - Anónimo (`!unlocked`): `ReportOverviewBlock` com `mode="free"` (apenas Identity Card).
   - Lead/Premium (`unlocked`): `ReportOverviewBlock` com `mode="all"`.
3. **Lead magnet em estado A:**
   - Logo após o Identity Card, renderizar uma `<section id="lead-magnet-card">` com o `ReportLockGate` (handle do perfil, `onUnlockClick={handleUnlockClick}`, `unlocked={false}`, `children` vazios ou um placeholder mínimo — não renderizamos os cards locked desfocados por baixo, para evitar a duplicação que o utilizador rejeitou).
   - Alternativa mais limpa: usar o `ReportLockGate` apenas pela sua secção de CTA (card frosted), sem children blurred — fazer um wrapper local que aproveita só o card. Decisão final: passar children vazios e adicionar uma classe ao gate para esconder a coluna blurred quando não há conteúdo (mais simples: condicionar a render do bloco blurred a `children` truthy dentro do `ReportLockGate`, alteração mínima e retro-compatível).
4. **`BlockFeedback`** passa a renderizar **só quando `unlocked === true`** (i.e. estados B e C).
5. **`ReportEndOfFreeBlock`** passa a renderizar **só quando `unlocked === true && !premiumUnlocked`** (estado B). Em estado A o lead magnet substitui-o; em estado C não faz sentido.
6. **Blocos 2–6** mantêm-se atrás de `premiumUnlocked` (sem alteração).
7. **Anchor `#lead-magnet-card`** mantém-se: em estado A no wrapper do `ReportLockGate`; em estado B no wrapper do `ReportEndOfFreeBlock` (para deep-links existentes continuarem a funcionar).

## Pequena alteração paralela

Em `src/components/product/report-lock-gate.tsx`: condicionar a render da coluna blurred ao facto de existirem `children` (sem children, não desenha o bloco desfocado nem os gradientes — o card de CTA fica isolado). Mantém compatibilidade com qualquer outro chamador que ainda passe children.

## Validação

- `bunx tsc --noEmit`
- QA manual no preview `/analyze/frederico.m.carvalho`:
  1. Sem session unlock: ver Identity Card + lead magnet card; sem feedback emoji; sem CTA Premium; sem blocos 2–6.
  2. Após submeter o lead no modal: ver Bloco 1 completo + BlockFeedback + “Há mais por trás deste perfil”; sem blocos 2–6.
  3. `sessionStorage.removeItem("ib_unlock:<id>")` + reload volta ao estado A.

## Fora de âmbito

- Sem alterações ao Bloco 1 em si, ao fluxo de captura de lead, ao tracking, à i18n, ou a blocos premium.
- Sem alterações de schema, copy ou pricing.
