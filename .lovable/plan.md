## Corrigir identidade legal do operador no unlock modal

### Problema

`src/components/product/unlock-modal.tsx` (linhas 53–57 e 677–679) mostra:

> Operador: **DIGITALFC** · Lisboa, Portugal · NIF 509XXXXXX · Cancela quando quiseres.

Inconsistente com `/privacidade`, `/termos`, `/cookies` e `/aviso-legal`, que identificam o responsável como **Fomentar Sonhos, Lda.** com sede em **Rua da Carvalha n.º 570, 2400-441 Leiria, Portugal**. O NIF real não está exposto em nenhuma página legal pública — não pode ser inventado.

### Decisão sobre o NIF

Como o NIF não está em parte nenhuma do código nem das páginas legais públicas, **remover a linha do NIF**. Se mais tarde o NIF for adicionado às páginas legais, basta repor o campo.

### Cópia final

```
Operador: Fomentar Sonhos, Lda. · Leiria, Portugal · Cancela quando quiseres.
```

### Alterações

**`src/components/product/unlock-modal.tsx`**

1. Substituir o objecto `OPERATOR_INFO`:
   ```ts
   const OPERATOR_INFO = {
     name: "Fomentar Sonhos, Lda.",
     city: "Leiria, Portugal",
   };
   ```
2. Remover o trecho `· NIF {OPERATOR_INFO.nif}` no JSX (linha 679), mantendo o resto: ícone Lock, "Operador:", nome a bold, cidade, "Cancela quando quiseres."

### Fora de scope (mantém-se intacto)

- Lógica do unlock, validação, consent schema, telemetria
- Brevo/Resend, providers, schema Supabase, cálculos, pricing
- Restantes 1280 linhas do modal

### Validação

- `bunx tsc --noEmit`
- `bunx vitest run` (sem testes a referenciar `OPERATOR_INFO`/`DIGITALFC` — confirmado por `rg`)
- Manual: abrir unlock modal no preview, confirmar nova frase no step 1; mobile readable; links `/privacidade` e `/termos` continuam a funcionar.

### Checkpoint (☐)

- ☐ `OPERATOR_INFO.name` = "Fomentar Sonhos, Lda."
- ☐ `OPERATOR_INFO.city` = "Leiria, Portugal"
- ☐ Campo `nif` removido do objecto e do JSX
- ☐ Sem placeholder `509XXXXXX` em lado nenhum
- ☐ `tsc --noEmit` limpo
- ☐ Suite vitest verde
