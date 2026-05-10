## Estado dos pedidos recentes

### ✅ Concluído nas últimas iterações
1. **Email transacional após unlock** — template, sender, eventos, integração no `processReportUnlock`.
2. **Refinamentos do email**:
   - Migração: índice único parcial `report_requests_lead_snapshot_unique` em `(lead_id, analysis_snapshot_id) WHERE analysis_snapshot_id IS NOT NULL`.
   - `unlock.server.ts`: tratamento de `code === "23505"` (race) — refetch e segue como existente, sem disparar segundo email.
   - `send-personal-area-saved.server.ts`: remetente configurável via `RESEND_FROM` com fallback para sandbox.
   - `resolveAppUrl()` já lê `PUBLIC_APP_BASE_URL` → `PDF_PUBLIC_BASE_URL` → fallback.

### ⏳ Fase pendente do pedido anterior (Command Palette)
Na verificação do `AdminCommandPalette` ficou identificado um único gap não aplicado:
- A pesquisa **não filtra por estado comercial**. O `value` do `CommandItem` concatena apenas `name + email + handle + company + id`, ignorando `getLifecycleMeta(lead.commercial_status).label`.

Resultado: pesquisar `"qualificada"`, `"contactada"`, `"convertida"` etc. não devolve resultados, mesmo havendo o badge visível ao lado do nome.

---

## Plano operacional (1 alteração)

### Ficheiro
`src/components/admin/v2/admin-command-palette.tsx`

### Alteração
Incluir o label do estado comercial no `value` do `CommandItem`, de modo a que o `cmdk` o considere para filtragem.

```ts
const value = [
  lead.name,
  lead.email,
  lead.handle,
  lead.company,
  meta.label,           // ← novo: "Qualificada", "Contactada", etc.
]
  .filter(Boolean)
  .join(" ");
```

Sem alterações ao layout, à query, ao endpoint, à navegação ou ao atalho. `meta` já é calculado uma linha acima — zero custo adicional.

### Validação
- `bunx tsc --noEmit`
- `bunx vitest run`
- Manual no `/admin/*`:
  - ⌘K abre o palette
  - Procurar `"qualif"` filtra leads com estado `qualified`
  - Procurar `"convert"` filtra leads com estado `converted`
  - Pesquisa por nome/email/handle/empresa continua a funcionar

### Checkpoint
☐ `value` inclui `meta.label`
☐ tsc verde
☐ vitest 180/180 verde
☐ Reportar de forma detalhada o que ficou aplicado e o estado final dos pedidos recentes
