## Refinamentos da `CommunicationHistory`

Sem bugs de runtime detectados (sem erros, sem logs). A revisão visual + leitura do código identificou cinco refinamentos e dois pequenos bugs de UI/convenção. Tudo dentro de `src/components/admin/v2/beta-leads/communication-history.tsx` — sem alterar `lead-detail-sheet.tsx`, sem schema, sem mutações.

### Bugs

1. **`font-mono` em vez de `admin-code`** (convenção do projeto). O `src/styles/admin-tokens.css` define `.admin-code` (JetBrains Mono 12px) precisamente para IDs internos. Trocar `className="… font-mono"` por `className="… admin-code"` nas linhas do `message_id` e do `error_code`.

2. **Borda inferior na última linha**: `borderBottom` é aplicado a todos os itens, incluindo o último visível, criando uma linha solta antes do botão "Ver mais" / fim. Aplicar a borda a todos menos ao último (`index < visible.length - 1`).

### Refinamentos

3. **Link discreto para abrir o URL público** quando o evento o expõe (`metadata.public_url` em `report_link_sent`, `metadata.feedback_url` em `feedback_requested`). Botão `<a target="_blank" rel="noopener noreferrer">Abrir link →</a>` em `admin-meta`, cor `--admin-info-700`, ícone `ExternalLink` 12px. Não envia nada — só abre o URL que já foi mandado ao lead. Útil para QA do admin.

4. **Botão "Copiar ID"** ao lado do `message_id` (ícone `Copy` 11px), usa `navigator.clipboard.writeText` com `toast.success("ID copiado")`. Sem pedido de rede. Só aparece se o ID existir.

5. **Ordenação consciente**: o endpoint devolve DESC (mais recente primeiro). Adicionar comentário a explicitar e garantir que a colapsagem `report_viewed` continua correcta nessa direção (já está — agrupa runs consecutivos independentemente da direção).

6. **Resumo no topo (`StatsRow`)**: pequena linha acima da lista com 3 contadores compactos: `Enviados: N · Aberturas: N · Submissões: N`, derivados do array já filtrado. Em `admin-meta`, sem cards, sem ícones — apenas texto separador. Esconde-se quando `events.length === 0`.

7. **Badge: `whitespace-nowrap`** explícito para impedir que "Submetido" quebre em duas linhas no cenário extremo de viewport ≤320px com label longo.

### Restrições mantidas

- UI only, read-only. Sem novos eventos, sem mutações, sem schema, sem providers, sem CRM Webinar, sem SMS/WhatsApp.
- Tokens `--admin-*` e classes `admin-*`. pt-PT/AO90.
- Mobile-first; testar a 411px (viewport actual do utilizador).

### Validação

- `bunx tsc --noEmit` → 0 erros.
- `bunx vitest run` → 163/163.
- Manual em `/admin/beta-leads`:
  - Lead com `report_link_sent` → vê badge `Enviado`, botão `Abrir link`, botão `Copiar ID`, e o ID em `admin-code`.
  - Lead com várias `report_viewed` → linha colapsada `×N` com badge `Aberto`, sem borda solta no fim.
  - Stats no topo coerentes com as linhas listadas.
  - 411px sem overflow horizontal; nenhum badge partido.
  - Lead sem comunicações → empty state pt-PT.