## Cache freshness display — clarificar frescura na UI

### 1. Campos de cache disponíveis (já no payload)

| Campo | Origem | Disponível em |
|---|---|---|
| `meta.generated_at` | snapshot payload (escrito quando o relatório é gerado) | público + admin |
| `created_at` | linha `analysis_snapshots` | público + admin |
| `updated_at` | linha `analysis_snapshots` | público + admin |
| `expires_at` | linha `analysis_snapshots` (TTL real, server-truth) | público (`body.snapshot.expires_at` na resposta de `/api/public/analysis-snapshot.$username`) e admin |

`CACHE_TTL_MS = 24h` e `STALE_TOLERANCE_MS = 7d` são definidos em `src/lib/analysis/cache.ts` (server-only) — vão **ficar como estão** e ser usados apenas como fallback no cliente.

### 2. Estado atual da UI

- Já existe `src/components/report-redesign/v2/cache-status-badge.tsx`. Mostra "Atualizado há X · válido até HH:MM" com tooltip nativo (`title`).
- Limitações:
  - Não tem variante visual (cor / dot / etiqueta) por estado.
  - Deriva o `expires_at` por TTL hardcoded em vez de usar o real do servidor.
  - Devolve `null` quando o timestamp está em falta — não mostra "Estado por confirmar".
  - Tooltip é o atributo HTML `title`, não o componente Radix.
- Usado em `ReportHeroV2` (versão expandida + compact). Admin previews passam `created_at` mas **não** passam `expires_at` que já têm em mãos.

### 3. Regras de estado

| Estado | Regra (com base em `expiresAtIso` real ou derivado) | Etiqueta pt-PT | Cor (token semântico) |
|---|---|---|---|
| `fresh` | `now < expiresAt − 6h` | "Dados atualizados" | `success` (verde) |
| `expiring_soon` | `expiresAt − 6h ≤ now < expiresAt` | "A expirar em breve" | `warning` (âmbar) |
| `stale` | `now ≥ expiresAt` (ou idade > 24h se sem `expiresAt`) | "Dados antigos" | `danger` (vermelho suave) |
| `unknown` | sem `analyzedAtIso` válido | "Estado por confirmar" | `muted` (neutro) |

Janela "expiring_soon" = 6h por defeito (configurável via prop `warnWithinHours`).

### 4. Componente `CacheStatusBadge` — refactor (mesmo ficheiro)

Não criar novo ficheiro — estender o existente para preservar imports e testes futuros.

Nova API:
```ts
interface Props {
  analyzedAtIso: string | null;
  expiresAtIso?: string | null;   // novo: usar valor real do servidor quando disponível
  ttlHours?: number;              // fallback para derivar expires (24)
  warnWithinHours?: number;       // default 6
  compact?: boolean;              // mantém-se: footer denso
}
```

Estrutura visual (mobile-first):
- Layout flex com gap pequeno: `<dot/> <label> · <span muted>Atualizado há X · Válido até DD MMM HH:mm</span>`
- `compact`: só `<dot/> <label muted>` para encaixar no footer.
- Cor do dot e da etiqueta vem dos tokens semânticos (`text-success`, `text-warning`, `text-danger`, `text-content-tertiary`). Sem cores hardcoded.
- Tipografia: Inter, `text-xs`, `tabular-nums` nas datas.
- Substituir `title="..."` por `<Tooltip>` shadcn (`src/components/ui/tooltip.tsx` já existe). Conteúdo do tooltip:
  - "Última análise: DD MMM YYYY HH:mm"
  - "Cache válida até: DD MMM YYYY HH:mm" (ou "Cache expirada em ...")
  - Sem expor `cache_key`, IDs, ou nomes técnicos.
- Quando `unknown`: render dot neutro + "Estado por confirmar", sem tooltip.

Helpers internos (`formatRelative`, `formatExpires`, `formatAbsolute`) são reaproveitados; ajusta-se `formatExpires` para usar `expiresAtIso` quando passado.

### 5. Pontos de integração

| Ficheiro | Mudança |
|---|---|
| `src/components/report-redesign/v2/cache-status-badge.tsx` | Refactor para nova API, variantes, Tooltip shadcn. |
| `src/components/report-redesign/v2/report-hero-v2.tsx` | Aceitar `expiresAtIso` e propagar (forma expandida + compact). Renderizar mesmo quando `analyzedAtIso` é null para mostrar "Estado por confirmar" — atualizar as guardas atuais (`{analyzedAtIso ? ... : null}`) para deixar o badge tratar do estado `unknown`. |
| `src/components/report-redesign/v2/report-shell-v2.tsx` | Adicionar prop `expiresAtIso` e passar a `ReportHeroV2`. |
| `src/components/report-redesign/report-shell.tsx` | Adicionar prop opcional `expiresAtIso` e propagar a `ReportShellV2` (forwarding apenas). |
| `src/routes/analyze.$username.tsx` | Ler `body.snapshot.expires_at`, guardar no estado, passar ao `ReportShellV2`/`ReportShellV2Compact`. |
| `src/routes/admin.report-preview.$username.tsx` | Acrescentar `expires_at` no `snapshotMeta` e passar a `ReportShellV2`. |
| `src/routes/admin.report-preview.snapshot.$snapshotId.tsx` | Idem (já tem `expires_at` no response, falta apenas guardar e passar). |

Sem alterações em `report-shell.tsx` (legacy) que afetem o `ReportPendingAiNotice` — a prop nova é puramente opcional.

### 6. Constraints respeitadas

- 100% UI/cliente. Sem novos endpoints. Sem alterar `cache.ts`, `reports.functions.ts`, geração ou scoring.
- Sem refresh, sem chamar providers, sem PDF, sem schema.
- Sem expor `cache_key`, `snapshot.id`, provider — apenas timestamps humanos.

### 7. Validação

- `bunx tsc --noEmit`
- `bunx vitest run` (180/180 — não há testes existentes ao badge; podemos opcionalmente adicionar 1 teste leve para a função `computeStatus(now, generated, expires)` se justificar — proponho **sim**, ficheiro novo `cache-status-badge.test.ts` com 4 casos, um por variante).
- Manual:
  - `/analyze/frederico.m.carvalho` → badge no hero com etiqueta colorida; tooltip mostra ambas as datas.
  - `/admin/report-preview/...` (handle e snapshot) → mesmo comportamento.
  - 375px: badge não causa overflow (testar com handle longo).
  - Snapshot artificialmente "antigo" (forçar `analyzedAtIso` no passado via DevTools) → estado `stale`.

### 8. Resposta final esperada

Ficheiros alterados, regras de estado finais, e resultados de tsc + vitest.