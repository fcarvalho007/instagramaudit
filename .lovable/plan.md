## Avaliação de consolidação

Após o refinamento de tokens no `FeedbackRequestDialog`, fiz um sweep ao `lead-detail-sheet.tsx` (1406 linhas) e flows admin adjacentes. Encontrei **inconsistência de design no mesmo padrão visual repetido 3 vezes** — banners de aviso amber dentro de dialogs. Cada um usa cores diferentes:

| # | Local | Fundo | Borda | Texto/Ícone | Avaliação |
|---|---|---|---|---|---|
| 1 | `GenerateReportDialog` (L775–796) "Aviso de custo" | `rgba(234,179,8,0.08)` (amarelo) | `rgba(234,179,8,0.2)` | `#D97706` | ❌ Cor errada (yellow-600, não o amber #BA7517 do sistema) |
| 2 | `SendLinkDialog` resend banner (L1045–1056) | `rgba(186,117,23,0.08)` ✓ | `rgba(186,117,23,0.25)` ✓ | `#8A560F` | ⚠️ Cor certa mas hardcoded em vez de tokens |
| 3 | `FeedbackRequestDialog` (L1210–1234) "Sem visualização registada" | `rgb(var(--tint-warning))` | `rgb(var(--signal-warning) / 0.25)` | `rgb(var(--signal-warning))` | ✅ Tokenizado (já feito) |

Três variantes do mesmo conceito visual = dívida técnica de design system. A regra core de memória diz literalmente *"never hardcode colors/fonts in components"* e *"Gold demoted to subtle amber #BA7517"*. O #1 é o pior caso: é literalmente uma cor diferente (amarelo Tailwind em vez do amber sóbrio do sistema).

---

## Plano de consolidação

### Passo 1 — Criar componente reutilizável

Novo ficheiro: `src/components/admin/v2/admin-callout.tsx`

```tsx
// Componente único para banners informativos dentro de dialogs/cards admin.
// Variants: "warning" (amber) | "info" (blue, futuro)
type Props = {
  variant?: "warning";
  icon?: ReactNode;       // default: <AlertTriangle size={15} />
  title: string;
  children: ReactNode;    // body
};
```

Estilo via tokens existentes:
- `warning` → `--tint-warning` / `--signal-warning`
- title + ícone usam `rgb(var(--signal-warning))`
- body usa `text-admin-text-secondary`
- spacing/radius/border match dos 3 sítios atuais (`rounded-lg p-3 text-[13px]`, ícone `mt-0.5 shrink-0`, gap-2)

### Passo 2 — Migrar os 3 sítios

**`GenerateReportDialog`** (L780–796):
- Substituir bloco inteiro por `<AdminCallout variant="warning" title="Aviso de custo">`
- Body: copy atual sobre créditos Apify
- Ganho: cor passa de yellow-600 errado para amber #BA7517 oficial

**`SendLinkDialog`** (L1046–1056):
- Substituir bloco resend banner por `<AdminCallout variant="warning" title="Link já enviado">` (novo título mais semântico)
- Body: "Já foi enviado um link a este lead em **{lastSentLabel}**. Confirma o reenvio."
- Ganho: tokens em vez de hardcoded, e ganha ícone (atualmente não tem) → consistência visual

**`FeedbackRequestDialog`** (L1210–1234):
- Substituir bloco já tokenizado por `<AdminCallout variant="warning" title="Sem visualização registada">`
- Body: copy atual
- Ganho: -25 linhas, mesma aparência

### Passo 3 — Limpeza

- Verificar se `AlertTriangle` continua a ser importado em `lead-detail-sheet.tsx` (provavelmente não — fica encapsulado no callout). Remover import órfão se aplicável.
- `tsc --noEmit` + `vitest run` (esperado 156/156 verdes — mudança puramente visual, sem lógica).
- QA manual rápido nos 3 dialogs.

---

## O que NÃO está neste plano (deixar para futura iteração)

- **Extrair dialogs para ficheiros próprios**: `lead-detail-sheet.tsx` tem 1406 linhas e contém `GenerateReportDialog`, `SendLinkDialog`, `FeedbackRequestDialog`, `RegenerateConfirmDialog` inline. Faz sentido extrair para `src/components/admin/v2/beta-leads/dialogs/` mas é refactor maior — se quiseres, faço como passo separado depois deste.
- **Outras cores hardcoded encontradas no sweep** (`rgba(44,44,42,0.04)`, `rgba(83,74,183,0.06)`, etc.): são tints subtis de surface/accent já consistentes, baixa prioridade.
- **Receita/relatórios `#FAF9F5`**: cores de chart, fora do escopo deste pedido.

---

## Constraints respeitados

- Não toca em endpoint, lifecycle, schema, providers, PDF, public form
- Mantém comportamento funcional 100% idêntico
- Apenas 1 ficheiro novo + 1 editado (mais 0 a 1 import limpo)
- Sem novas dependências

## Validação

- `bunx tsc --noEmit` limpo
- `bunx vitest run` mantém 156/156
- Inspeção visual dos 3 dialogs (Generate, SendLink resend, FeedbackRequest sem view)

Dou seguimento?