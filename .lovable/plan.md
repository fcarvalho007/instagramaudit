## Encerramento da auditoria mobile

A fase 2 (patches 5–10) está aplicada. Restam dois itens menores para fechar a auditoria mobile/tokens limpa:

### Closeout 1 · Slate residual em `overview/format-card.tsx`

Linha 63 ainda tem:
```
unknown: { dot: "bg-slate-300", iconColor: "text-slate-500", icon: Image },
```
Mapear para tokens semânticos (consistente com os outros 9 ficheiros já migrados):
- `bg-slate-300` → `bg-content-tertiary`
- `text-slate-500` → `text-content-tertiary`

Único ficheiro `report-redesign/v2/**` que ainda viola a regra core "Never use slate-*". Mudança visual nula (já era cinza neutro).

### Closeout 2 · `/report.print/$snapshotId` (v1 legacy) — fora de escopo, registar

A rota de impressão/PDF continua a montar componentes `report-redesign/*` v1 (`report-hero.tsx`, `report-shell.tsx`, `report-kpi-grid.tsx`, `report-editorial-patterns.tsx`, `report-ai-reading.tsx`, `report-pending-ai-notice.tsx`, `report-tokens.ts`). Estes ficheiros têm slate-* mas não fazem parte do report público v2 nem do flow mobile auditado.

Proposta: **não tocar agora**. Registar como dívida técnica separada — "Migrar print route v1 → v2 ou limpar slate em v1". Justificação: a rota de print é desktop-only (A4), nenhum dos issues mobile P0/P1/P2 a afecta, e migrar v1→v2 é refactor maior que merece o seu próprio ciclo.

### Validação final

Após Closeout 1:
```
rg "slate-" src/components/report-redesign/v2/
```
Deve devolver vazio. Confirma que o relatório público v2 está 100 % token-based.

---

Aprovas entrar em build mode para aplicar Closeout 1 (single-line fix) e fechar a auditoria?