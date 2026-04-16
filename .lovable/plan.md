

## Revisão pós-fix: estado actual e refinamentos sugeridos

### O que está confirmado OK

**Bug do ícone do Input — RESOLVIDO correctamente:**
- `iconPaddingMap` actualizado: `sm: pl-10`, `md: pl-12`, `lg: pl-14` (mirror para right) ✅
- `iconPositionMap` actualizado: md/lg agora a `left-4`/`right-4` ✅
- Math validada: ícone md acaba aos 32px, texto começa aos 48px → 16px de respiração limpa
- Variantes, sizes, error, `aria-invalid`, `InputLabel`, `InputHelper`, ref forwarding intactos ✅
- Outros locked files (button, badge, card, switch, layout, tokens) não tocados ✅
- Sem runtime errors, sem console errors ✅

### Refinamentos detectados (não bloqueantes para Prompt 0.4)

Encontrei **3 questões menores** no showcase (`src/routes/index.tsx`) — não no Input em si. Decisão tua se queres limpá-las antes ou deixar para quando o `/design-system` substituir este showcase no Prompt 0.4:

**R1. Cabeçalho do showcase desactualizado** (linha 72)
```
"Sprint 0 · Prompt 2b · Container & Input"
```
Já estamos pós-Prompt 3. Sugestão: `"Sprint 0 · Prompt 3 · Atoms & Shell"` ou simplesmente remover (vai ser substituído na próxima prompt).

**R2. Indentação inconsistente** (linhas 64–94, 96+)
O `<header>` e as `<Section>` têm indentação extra de um nível (legacy do wrapper `<div>` que foi removido quando se migrou para `<Container>`). Funciona, mas é desleixo visual no código. Re-indentar para alinhar com o `<Container>`.

**R3. Texto desnecessariamente "tu"** (linha 156)
```
"Precisas de mais informação?"
```
A regra do projeto pede impessoal sempre que possível. Sugestão pt-PT impessoal: `"É necessária mais informação?"` ou `"Mais informação?"`.

### Recomendação

O fix do Input está **production-grade**. Os 3 refinamentos acima são cosmética do showcase temporário que vai desaparecer no Prompt 0.4.

**Duas opções:**

**Opção A — Avançar já para Prompt 0.4** (recomendado)
Os refinamentos R1/R2 morrem com o showcase; R3 vale a pena corrigir junto (1 linha).

**Opção B — Limpar showcase agora** (10 minutos)
Corrigir R1 + R2 + R3 antes de avançar. Apenas `src/routes/index.tsx` tocado, nenhum locked file.

Se aprovares a Opção B, o âmbito é exactamente:
- Linha 72: actualizar texto do micro-label
- Linhas 64–334: re-indentar para nível correcto dentro de `<Container>`
- Linha 156: trocar `"Precisas de"` → `"É necessária"`

Nada mais. Sem alterações estruturais, sem mudanças de componentes, sem novos imports.

