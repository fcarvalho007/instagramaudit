## Objectivo
A sidebar desktop não cabe num portátil sem scroll. Vamos libertar a primeira dobra removendo a secção "ANÁLISE DE PERFIL" + handle (`@frederico.m.carvalho`) que já está duplicada no chip de perfil do topo da página. Quando o utilizador faz scroll e esse chip sai do viewport, a sidebar passa a mostrar a versão compacta do `ProfileHeader` (como já faz hoje em scroll).

## Análise
- O `@frederico.m.carvalho` aparece em dois sítios em simultâneo no topo do relatório: chip global (FC · @handle · Escalão · seguidores · publicações) e header da sidebar (ANÁLISE DE PERFIL + avatar + handle). Redundância total na primeira dobra.
- O hook `useSidebarCompact(threshold=220)` já existe e devolve `compact=true` depois de scroll > 220px. Hoje serve só para encolher o `ProfileHeader`. Vamos reaproveitá-lo para **mostrar/esconder** o header em vez de só encolher.
- Há ainda uma linha extra `<VariantBadge>` (linha 1325–1328) que só aparece quando `!compact` — ou seja, só ocupa espaço acima da dobra. Vamos invertê-la também para libertar mais ~28px no topo (passa a aparecer apenas quando compact, alinhada com a versão "scrolled").

## Ficheiro alterado
`src/components/report-redesign/v2/report-block-nav.tsx` — função `ReportBlockSidebar` (~linha 1308) e nada mais.

### Edição 1: header da sidebar só aparece em scroll
```tsx
// Antes
<ProfileHeader profiles={profileList} paidStatus={paidStatus} compact={compact} />
{!compact && (
  <div className="mb-2 flex justify-end">
    <VariantBadge variant={variant} />
  </div>
)}

// Depois
{compact && (
  <ProfileHeader profiles={profileList} paidStatus={paidStatus} compact />
)}
{compact && (
  <div className="mb-2 flex justify-end">
    <VariantBadge variant={variant} />
  </div>
)}
```

Resultado:
- **Acima da dobra:** sidebar começa directamente em `ProgressSummary` ("2 de 7 secções acessíveis" + barras) → poupança de ~100px verticais, sidebar cabe num portátil 13" (~750px de altura útil).
- **Depois de scroll > 220px:** o chip global do topo sai do viewport e a sidebar revela `ProfileHeader` (compact) + `VariantBadge` para reforçar o contexto. Continua a caber porque a versão compact é leve (~40px).

### Edição 2: padding interior coerente
- Manter `compact ? "p-3" : "p-4 xl:p-5"` como hoje. A redução de espaço já vem do header escondido; baixar mais o padding não é necessário.
- Sem alterações a `ProgressSummary`, `SidebarList`, `ItemRow`, mobile (`ReportBlockTopTabs`) ou tokens.

## Não tocar
- Mobile bottom-tabs / drawer (`ReportBlockTopTabs`) — o chip global não está sempre visível em mobile, lá o header faz sentido.
- Chip global no topo da página (continua a mostrar handle, escalão, seguidores, publicações).
- `ProfileHeader`, `ProgressSummary`, `ItemRow`, lista de secções, comportamento de "Período de análise" / "Adicionar concorrente".
- Threshold do `useSidebarCompact` (220px continua bem — o chip global tem aprox. 180px de altura desde o topo).
- Lógica de premium, créditos, entitlements, tracking, i18n.

## Validação visual (depois do build)
1. Desktop 1280×800 (portátil): sidebar começa em "2 de 7 secções acessíveis", lista completa visível até "Período de análise" sem scroll interno.
2. Scroll 250px: `ProfileHeader` (compact: avatar pequeno + `@handle` + status) e `VariantBadge` aparecem suavemente (transição 200ms já existe). Sem layout shift no resto da página.
3. Scroll de volta ao topo: voltam a desaparecer.
4. Desktop 1920×1080: comportamento idêntico, espaço extra fica como respiro (sem buracos).
5. Mobile: top-tabs + drawer inalterados.
6. Estado premium (paid): badge "Acesso completo" continua visível no estado compact da sidebar (vem dentro do `ProfileHeader`, que volta a aparecer em scroll). Acima da dobra perde-se essa indicação, mas o `ProgressSummary` mostra "7 de 7 secções acessíveis" com todas as barras a cheio — sinal suficiente.

## Output
- 1 ficheiro alterado: `src/components/report-redesign/v2/report-block-nav.tsx`.
- Sem alterações a tokens, copy, i18n, schema, créditos, entitlements, tracking, mobile.
- Sem efeito noutras páginas (só `/report/*`).