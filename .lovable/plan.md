## Problemas identificados na secção "Controlo Operacional"

1. **Layout desequilibrado** — Modo de Execução (coluna esquerda) tem muito espaço vazio vertical enquanto Perfis de Teste (direita) é denso e comprimido
2. **Badge de status flutuante** — "MODO FRESH · CUSTOS ATIVOS" fica abaixo da coluna esquerda mas desalinhado do contexto
3. **Cache maintenance** — visualmente colada ao bloco principal sem separação semântica clara
4. **Hierarquia visual fraca** — os 3 sub-blocos (modo, perfis, cache) não têm headers visuais consistentes
5. **Densidade excessiva nas profile rows** — handle + badge + custo + expiry + botões + chips tudo numa linha causa leitura confusa

## Plano de refinamento

### 1. Reestruturar layout — stack vertical com 3 sub-cards

Em vez de grid 2-col com cache tacked-on, usar **3 sub-blocos empilhados** dentro do card principal:

```
┌─────────────────────────────────────────────┐
│ ① Modo de Execução (full width, compact)    │
├─────────────────────────────────────────────┤
│ ② Perfis de Teste (full width, clear rows)  │
├─────────────────────────────────────────────┤
│ ③ Expirar Cache (full width, secondary)     │
└─────────────────────────────────────────────┘
```

O **Modo de Execução** fica como barra horizontal: segmented control à esquerda, badge de status à direita, descrição abaixo. Ocupa menos espaço vertical.

### 2. Modo de Execução — layout horizontal compacto

- Segmented control + status badge na mesma linha (flexbox)
- Texto descritivo abaixo em texto mais curto
- Remover espaço vertical excessivo

### 3. Perfis de Teste — melhorar legibilidade

- Cada perfil num mini-card com border sutil
- Row 1: handle (bold) + badge + cost + expiry (agrupados logicamente)
- Row 2: status chips (já existem, manter)
- Botões "Abrir" e "Fresh" alinhados à direita da row 1
- Spacing mais generoso entre perfis

### 4. Cache maintenance — visual secundário

- Background mais subtil (muted) para indicar que é ferramenta auxiliar
- Layout inline: label + input + botão numa só linha

### Ficheiros alterados

| Ficheiro | Alteração |
|----------|-----------|
| `src/routes/admin.sistema.tsx` | Reestruturar layout do bloco Controlo Operacional |
| `src/components/admin/v2/sistema/execution-mode-card.tsx` | Layout horizontal compacto |
| `src/components/admin/v2/sistema/test-profiles-card.tsx` | Mini-cards por perfil, melhor hierarquia |
| `src/components/admin/v2/sistema/cache-maintenance-card.tsx` | Layout inline, visual mais discreto |
