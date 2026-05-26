## Estado atual

A Fase 1 do rebranding (`InstaBench` → `AuditProfiles`) **já foi executada** numa task anterior. Uma pesquisa global confirma que **não restam ocorrências visíveis** de `InstaBench`, `instabench` ou `instagramaudit` no código de UI público ou app autenticada.

As **3 únicas ocorrências restantes** são intencionais (Class B na auditoria) e devem permanecer:

| Ficheiro | Ocorrência | Razão |
|---|---|---|
| `supabase/migrations/20260429163700_*.sql` | `'InstaBench dataset interno'` | Migration histórica congelada — nunca editar |
| `src/lib/analysis/cost.ts` | `"instabench-default-salt"` (fallback) | Alterar invalida todos os IP hashes existentes |
| `src/i18n/index.ts` | `LANG_STORAGE_KEY = "instabench.lang"` | Alterar perde preferência de idioma de todos os utilizadores |

O `src/lib/brand/legal.ts` central já tem `productName: "AuditProfiles"` e `domain: "auditprofiles.com"`.

## O que falta (escopo desta fase)

A peça que **ainda não foi feita** é o requisito técnico #1 do prompt: adicionar nomes de **produto** centralizados (separados do nome da plataforma), para evitar copy ambígua entre plataforma (`AuditProfiles`) e serviço atual (`Instagram Profile Audit` / `Auditoria de Perfil Instagram`).

### Mudanças propostas

**1. Estender `src/lib/brand/legal.ts`** com 2 novos campos:
```ts
primaryProductName: "Instagram Profile Audit",  // EN
ptProductName: "Auditoria de Perfil Instagram", // PT
```

**2. Adicionar chaves i18n** em `src/i18n/locales/{pt,en}/common.json` (ou no namespace existente mais apropriado — a confirmar durante exploração):
- `brand.productName` → "Auditoria de Perfil Instagram" / "Instagram Profile Audit"
- `brand.startingWith` → "Começámos pelo Instagram." / "We're starting with Instagram."

**3. Auditar 3 superfícies-chave** onde se diz apenas "AuditProfiles" e onde clarificar o produto Instagram adiciona valor (sem overpromise):
- Landing page hero/subtítulo (`src/routes/index.tsx`)
- Pricing `/precos` (`src/routes/precos.tsx`) — clarificar que o tier inicial é Instagram
- Página de unlock / report gates — mencionar produto, não só plataforma

Estas 3 superfícies já dizem "AuditProfiles" corretamente; só ajustamos onde a frase ficaria mais clara com `Auditoria de Perfil Instagram`. Não vou reescrever copy alargado — só pequenos ajustes cirúrgicos.

**4. Validação final:**
- `rg -i 'instabench|instagramaudit'` deve devolver apenas as 3 ocorrências intencionais acima
- `bunx tsc --noEmit`
- `bunx vitest run`

### Fora de escopo (não tocar)

- Migration histórica, salt de hash, `LANG_STORAGE_KEY`
- Pricing logic, Apify/OpenAI/DataForSEO, geração de relatórios, emails
- Routes (nenhuma contém `instabench`)
- Texto legal (`Fomentar Sonhos, Lda.`)
- Reescrita ampla de copy — só substituições onde clarifica produto vs plataforma

### Risco

Baixo. As alterações são aditivas (novos campos no brand config + novas chaves i18n) e edits cirúrgicos em 3 ficheiros de rota. Sem mudanças de schema, sem mudanças de comportamento.