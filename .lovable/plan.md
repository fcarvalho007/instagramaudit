## Objetivo

Adicionar um bloco compacto de **Checklist de Prontidão** no tab **Diagnóstico**, abaixo do `ReadinessCard` existente, com os 8 itens pedidos. Foco: dar a um administrador não-técnico uma leitura imediata de "estou pronto para ligar o Apify?".

Sem alterações a APIs, endpoints, migrações ou outros tabs.

## Scope

- **Único ficheiro editado:** `src/components/admin/cockpit/panels/diagnostics-panel.tsx`
- Tudo o resto fica intocado: `/report.example`, rotas API, fluxos de PDF/email, public UI, design tokens, outros panels.

## Comportamento dos 8 itens

| # | Item | Estado verde | Estado warning | Estado neutro |
|---|------|---|---|---|
| 1 | Token Apify configurado | `secrets.APIFY_TOKEN === true` | token ausente | — |
| 2 | Estado do fornecedor | `apify.enabled === false` → "Fornecedor desligado — sem custo" (success) | `apify.enabled === true && testing_mode.active === false` (perigoso) | `apify.enabled === true && testing_mode.active === true` (ok controlado, success) |
| 3 | Modo de teste activo | `testing_mode.active === true` | inactivo | — |
| 4 | Allowlist tem ≥1 handle | `allowlist.length > 0` | vazia | — |
| 5 | Allowlist inclui `frederico.m.carvalho` | inclui (case-insensitive, sem `@`) | não inclui mas tem outros | allowlist vazia → herda warning do item 4, mostrar neutro aqui |
| 6 | Última chamada ao provedor | sem chamadas → "Ainda sem chamadas reais" (neutro) ou última `status === 'success'` (verde) | última `status` não-success | — |
| 7 | Última snapshot | sem snapshots → "Sem snapshots — esperado antes do primeiro teste" (neutro) ou existe snapshot recente (verde) | erro na leitura | — |
| 8 | Custo estimado hoje | `analytics.last_24h.estimated_cost_usd === 0` → "Sem custo nas últimas 24h" (verde/neutro) | >0 mostra valor formatado (informativo, neutro) | — |

**Tons usados:** `success` (verde), `warning` (âmbar), `neutral` (cinza/secondary). Nunca `danger` neste bloco — o `ReadinessCard` acima já trata o estado crítico.

**Nunca expor segredos** — só presença/ausência. Os valores reais de tokens nunca são lidos nem mostrados.

## UI

Card único, mesma estética dos cards já existentes:

```text
┌──────────────────────────────────────────────────┐
│ CHECKLIST · PRONTIDÃO                            │
│ Verificações operacionais para o primeiro teste. │
│                                                  │
│ ✓ Token Apify configurado                        │
│ ✓ Fornecedor desligado — sem custo               │
│ ✓ Modo de teste ativo                            │
│ ⚠ Allowlist vazia · adiciona um handle           │
│ • Perfil de teste permitido                      │
│ • Ainda sem chamadas reais                       │
│ • Sem snapshots — esperado antes do 1.º teste    │
│ ✓ Sem custo nas últimas 24h · $0.00              │
└──────────────────────────────────────────────────┘
```

Layout responsivo: `grid-cols-1 sm:grid-cols-2`. Cada item é uma row com ícone à esquerda (`CheckCircle2` para success, `AlertTriangle` para warning, `Circle` para neutro), label e hint opcional por baixo. Padding e bordas iguais ao `ReadinessCard`. Sem novos tokens.

## Código (estrutura)

Dentro de `diagnostics-panel.tsx`, adicionar:

```tsx
type ChecklistTone = "success" | "warning" | "neutral";
interface ReadinessRow { tone: ChecklistTone; label: string; hint?: string; }

function buildReadinessRows(data: CockpitData): ReadinessRow[] { /* 8 itens */ }
function ReadinessChecklistCard({ data }: { data: CockpitData }) { /* render */ }
```

E inserir `<ReadinessChecklistCard data={data} />` no JSX do `DiagnosticsPanel`, **logo a seguir ao `<ReadinessCard data={data} />`** (linha 58).

Reutiliza `cn`, `Badge`, ícones já importados (`CheckCircle2`, `AlertTriangle`) + adiciona `Circle` ao import do `lucide-react`.

## Restrições respeitadas

- ☐ Sem alterações a rotas API, edge functions ou migrações
- ☐ Sem novos endpoints
- ☐ Sem mexer em `/report.example`, PDF, email, public UI
- ☐ Usa apenas tokens/componentes existentes (`Badge`, `cn`, ícones lucide)
- ☐ Nenhum valor de segredo é lido ou mostrado — só `secrets.APIFY_TOKEN: boolean`
- ☐ Copy 100% pt-PT, AO90, sem pt-BR

## Validação

- ☐ `bunx tsc --noEmit` sem erros
- ☐ `/admin` → tab Diagnóstico continua a renderizar
- ☐ Nos restantes 5 tabs, nada muda
- ☐ A 375px (mobile) o card colapsa para 1 coluna e fica legível
- ☐ Confirmar visualmente que nenhum valor de token aparece no DOM
- ☐ Com allowlist vazia: item 4 mostra warning, item 5 mostra neutro
- ☐ Com `frederico.m.carvalho` na allowlist: item 5 mostra success
