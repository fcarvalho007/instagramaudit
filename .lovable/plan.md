
# Report Lab — Reorganização UX/UI

## Problemas identificados

### Repetições de informação
1. **Visibilidade dos blocos aparece 3 vezes:**
   - Tabela inline na secção "Perfil e variante" (blocos × variantes, badges Visível/Oculto/Teaser)
   - Painel colapsável "Diferenças entre variantes" (módulos × variantes, incluindo os mesmos blocos)
   - Painel colapsável "Checklist de prontidão pública" (módulos com visibilidade MVP + estado + risco)

2. **Descrição da variante aparece 3 vezes:**
   - Banner topo ("Versão de trabalho · módulos completos...")
   - Descrição sob o switcher de variante (texto de `VARIANT_OPTIONS`)
   - `MODE_LABELS` (não usado diretamente mas definido)

3. **Nota "não altera dados" aparece 2 vezes:**
   - Sob a tabela de blocos
   - No footer

4. **URL do lab** repetido no footer e na secção "Ações de partilha"

### Problemas de layout
- Secção "Perfil e variante" demasiado longa — mistura controlos (perfil + variante) com tabela de referência
- 3 painéis colapsáveis consecutivos na secção "Configuração e diagnóstico" criam uma parede de accordions
- Status de loading/erro (lines 548-568) aparece DEPOIS da secção "Configuração e diagnóstico", fora de ordem visual

---

## Plano de reorganização

### Estrutura proposta (de cima para baixo):

```text
┌─────────────────────────────────────────────┐
│ 1. BANNER DE CONTEXTO (mais compacto)       │
│    Variante activa + nota inline            │
├─────────────────────────────────────────────┤
│ 2. CONTROLOS (Perfil + Variante)            │
│    Sem tabela — apenas selectores           │
├─────────────────────────────────────────────┤
│ 3. ESTADO DO SNAPSHOT                       │
│    Loading / erro / validade — antes do     │
│    conteúdo que depende dele                 │
├─────────────────────────────────────────────┤
│ 4. LINKS RÁPIDOS (se snapshot ready)        │
│    3 colunas de ações de partilha           │
├─────────────────────────────────────────────┤
│ 5. PAINEL ÚNICO: Módulos e prontidão        │
│    Tabela consolidada (colapsável):          │
│    Módulo | Público | Interno | Pro |        │
│    Estado | Risco | Nota                     │
│    + Gestor de visibilidade (colapsável)     │
├─────────────────────────────────────────────┤
│ 6. REPORT PREVIEW (se snapshot ready)       │
├─────────────────────────────────────────────┤
│ 7. FOOTER (uma linha, sem repetições)       │
└─────────────────────────────────────────────┘
```

### Mudanças concretas

**`src/routes/admin.report-lab.tsx`** (UI-only):

1. **Compactar banner**: manter apenas a frase curta + tone color, remover `MODE_LABELS` (unused).

2. **Separar controlos da tabela**: remover a tabela de visibilidade de blocos da secção "Perfil e variante". Fica só perfil + switcher + descrição curta.

3. **Mover status do snapshot** para logo após os controlos (antes das ações de partilha), para o utilizador ver imediatamente se há dados.

4. **Consolidar 3 painéis em 1 tabela única** ("Visibilidade e prontidão dos módulos"):
   - Colunas: Módulo | Público | Interno | Pro | Estado | Risco | Nota
   - Substitui: tabela inline de blocos + VariantDiffPanel + ReadinessChecklist
   - Coluna da variante activa fica highlighted
   - Um único collapsible, aberto por defeito

5. **Manter** o Gestor de visibilidade (ModuleVisibilityMatrix) como collapsible separado — é funcional, não informativo.

6. **Remover nota duplicada** do footer — fica apenas na tabela consolidada.

7. **Remover** `MODE_LABELS` (não usado no render) e `MODULE_INTERPRETATIONS` (absorvido pelas notas de readiness).

Sem alterações a dados, providers, PDF, ou lógica de variantes.
