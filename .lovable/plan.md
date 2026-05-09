## Auditoria

### 1. Componente da sidebar
- **Ficheiro:** `src/components/report-redesign/v2/report-block-nav.tsx`
- Exporta `ReportBlockSidebar` (desktop, sticky) e `ReportBlockTopTabs` (mobile, bottom nav + Sheet drawer).
- Renderizada em `src/components/report-redesign/v2/report-shell-v2.tsx`, linhas 113 e 118.
- O shell antigo `src/components/report-redesign/report-shell.tsx` **não usa** estes componentes — não é preciso tocar nele.

### 2. Como a sidebar recebe o variant
- `ReportShellV2` recebe `variant: ReportVariant` (default `"public_mvp"`) e calcula `features = getVariantFeatures(variant)` (`src/lib/report/report-variant.ts`).
- Calcula `visibleBlockIds = BLOCKS.filter(b => features[b.featureKey] !== "hidden")` e passa só os IDs à sidebar. **A sidebar hoje não conhece o variant nem o estado de cada feature** — só sabe quais IDs mostrar.

### 3. Visibilidade ao nível de bloco (estado atual)
- `BLOCKS` (`src/components/report-redesign/v2/block-config.ts`) liga cada bloco 01–06 a uma chave em `VariantFeatures` (`blockOverview` … `blockBenchmark`).
- Cada chave tem visibilidade `full | lightweight | teaser | hidden`.
- **Estado actual em `public_mvp`:** 01 e 02 = `full`; 03, 04, 05, 06 = `hidden`. Logo a sidebar pública só mostra 2 itens (01 + 02).
- Em `internal_lab` e `pro_preview`: tudo `full`.
- O body do shell já respeita isto — cada `<ReportBlockSection>` está guardado por `features.blockX !== "hidden"`.

### 4. Pode o bloco 03 ser representado como parcial sem renderizar conteúdo bloqueado?
Sim, com **mudança mínima e localizada ao bloco 03**:
- Adicionar um terceiro estado `"partial"` à decisão de visibilidade da sidebar (puramente derivado, sem mudar `FeatureVisibility`).
- No body: quando 03 estiver em modo parcial, o `<ReportBlockSection>` do `performance` renderiza só os **3 primeiros mini-blocos acessíveis** (`ReportTemporalChart` + insight `evolutionChart` + `ReportPostingHeatmap`) e termina com um teaser bloqueado a anunciar "2 secções premium dentro de Desempenho". Os componentes `ReportBestDays` e o insight `daysOfWeek` ficam fora da árvore — nada de dados nem custos extra.
- Não se altera a normalização de dados, scoring, providers ou Apify.

### 5. Estrutura de dados da sidebar (novo)

Acrescentar, dentro de `report-block-nav.tsx`, um cálculo derivado por bloco:

```ts
type AccessState = "accessible" | "partial" | "locked";
type SidebarItem = BlockConfig & {
  group: "incluido" | "premium";
  access: AccessState;
  partialBadge?: string; // ex.: "3/5"
};
```

Função `buildSidebarItems(variant, features)`:
- Para `internal_lab` e `pro_preview`: todos os 6 blocos no grupo `incluido`, `access = "accessible"`. Sem CTA paywall.
- Para `public_mvp`:
  - 01 Visão geral → `incluido` · `accessible`
  - 02 Diagnóstico → `incluido` · `accessible`
  - 03 Desempenho → `incluido` · `partial` (badge `3/5`)
  - 04 Conteúdo · 05 Procura · 06 Comparação → `premium` · `locked`

A sidebar passa a receber `variant` (e opcionalmente `features`) em vez de só `visibleBlockIds`. Os IDs visíveis no body continuam a derivar de `features.blockX !== "hidden"` no shell.

## Tabela de comportamento por variant

| Variant         | Header                     | 01 | 02 | 03           | 04 | 05 | 06 | Progresso              | Cofre / CTA | Badge topo               |
|-----------------|----------------------------|----|----|--------------|----|----|----|------------------------|-------------|--------------------------|
| `public_mvp`    | avatar + `@username`       | ✓  | ✓  | parcial 3/5  | 🔒 | 🔒 | 🔒 | "3 acessíveis · 3 por desbloquear" | sim ("Abrir o cofre", €3 / Bundle €13, "DESBLOQUEAR →") | — |
| `internal_lab`  | avatar + `@username`       | ✓  | ✓  | ✓            | ✓  | ✓  | ✓  | oculto (tudo acessível) | não         | "Laboratório interno"    |
| `pro_preview`   | avatar + `@username`       | ✓  | ✓  | ✓            | ✓  | ✓  | ✓  | oculto                 | não         | "Pro ativo"              |

## Plano de implementação (apenas UI / nav / visibilidade)

### A. Variant features
- `src/lib/report/report-variant.ts`: alterar `public_mvp` para
  - `blockPerformance: "lightweight"` (parcial)
  - `blockContent`, `blockSearch`, `blockBenchmark`: manter `"hidden"` (body não rende, mas a sidebar mostra-os como locked).
- Sem alterações em `internal_lab` nem `pro_preview`.
- Sem alterações na shape de `VariantFeatures` (sem campo novo, sem migração).

### B. Sidebar (`report-block-nav.tsx`)
1. Aceitar nova prop `variant: ReportVariant` e `features: VariantFeatures` (em vez de só `visibleBlockIds`). Manter compat com a anterior se trivial.
2. Aceitar `profile: { handle: string; avatarUrl: string | null; displayName?: string | null }` para o cabeçalho.
3. Derivar `items` (grupos `incluido` / `premium`) com `buildSidebarItems(variant, features)`.
4. **Layout novo (desktop e mobile drawer):**
   - **Header card**: avatar circular azul (placeholder com inicial quando não há `avatarUrl`) + `@handle` em Inter SemiBold.
   - **Grupo "INCLUÍDO"** com contador à direita ("3"). Itens com nº mono (`01` …), label, indicador activo, e — quando aplicável — badge `3/5` em âmbar.
   - **Grupo "PREMIUM"** apenas em `public_mvp`. Itens com ícone de cadeado e label em itálico, cliques abrem CTA do cofre (não scrollam).
   - **Barra de progresso segmentada** (verde + âmbar + cinza) com legenda "X acessíveis" / "Y por desbloquear" — escondida fora de `public_mvp`.
   - **Card "Abrir o cofre"** com fundo escuro/azul, dois cartões de preço (Uma vez €3 + Bundle 5 €13 com badge "★ POUPA €2") e botão `DESBLOQUEAR →`. Renderiza só em `public_mvp`. Botão é placeholder (sem fluxo de pagamento — o stack ainda não tem checkout).
   - **Badge topo opcional** (`Laboratório interno` em `internal_lab`, `Pro ativo` em `pro_preview`).
5. Item parcial: continua a usar `scrollToBlock(block.id)` (o bloco existe no body em modo `lightweight`).
6. Item locked: `aria-disabled`, ícone cadeado; `onClick` → scroll para o card "Abrir o cofre" (via id `#cofre`).
7. Mobile: o `ReportBlockTopTabs` mantém os 3 ícones contextuais entre apenas itens **acessíveis**; o Sheet drawer recebe a mesma estrutura grupos+cofre da sidebar para paridade.

### C. Body (`report-shell-v2.tsx`)
1. Mudar a guarda do bloco 03 para renderizar versão lightweight quando `features.blockPerformance === "lightweight"`:
   - Mostra `ReportTemporalChart` + insight `evolutionChart` + `ReportPostingHeatmap` (3 elementos acessíveis).
   - Em vez de `ReportBestDays` / insight `daysOfWeek`, renderiza um teaser inline ("2 secções dentro de Desempenho disponíveis no relatório completo") com botão que faz scroll para o cofre.
2. Passar à sidebar: `variant`, `features` e `profile = result.data.profile`.
3. Não renderizar 04/05/06 no body em `public_mvp` (já é o comportamento, garantir que continua hidden mesmo com o novo lightweight).

### D. Estilos
- Usar tokens existentes (`content-primary/secondary/tertiary`, `surface-muted`, `border-default`, accent `#3772E5`, âmbar `#BA7517`). Sem novas cores hardcoded. Sem `slate-*`.
- Cofre escuro: pode usar `bg-content-primary` ou um surface escuro existente; confirmar contra `tokens-light.css` antes de adicionar.

### E. Testes manuais (sem providers)
1. `/analyze/frederico.m.carvalho?variant=public_mvp` → ver 01, 02 acessíveis, 03 parcial, 04–06 locked + cofre.
2. `?variant=internal_lab` → 6 acessíveis, sem cofre, badge "Laboratório interno".
3. `?variant=pro_preview` → 6 acessíveis, sem cofre, badge "Pro ativo".
4. Confirmar 375px (drawer) e 1280px (sidebar sticky) sem overflow.

## Constraints respeitadas
- Sem chamadas a Apify / OpenAI / DataForSEO.
- Sem alterações em scoring, dados, providers, Supabase, PDF.
- Sem fluxo de pagamento — o botão `DESBLOQUEAR →` é placeholder.
- Sem mudanças no `report-shell.tsx` antigo, no PDF nem nos fluxos do servidor.

## Checkpoint final
☐ Sidebar nova com header avatar + `@handle`.
☐ Grupos "Incluído" e "Premium" com contadores.
☐ Bloco 03 mostra badge `3/5` na sidebar e renderiza versão parcial no body.
☐ Cards 04–06 aparecem locked com cadeado em `public_mvp`.
☐ Barra de progresso + cofre + dois cartões de preço + CTA visíveis só em `public_mvp`.
☐ `internal_lab` e `pro_preview` mostram tudo acessível, sem cofre, com badge respetivo.
☐ Mobile drawer espelha a estrutura.
☐ Sem chamadas externas, sem alterações em dados/scoring/PDF.