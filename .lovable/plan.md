## Banner de retenção 15d em `/app/reports`

### Estado actual (do prompt anterior)

Já implementado:
- `RetentionBadge` por cartão: "Disponível" / "Expira em N dias" / "Expirado".
- Linha de metadata `Gerado a … · Expira a …` em cada cartão.
- Link "Abrir relatório" → `/reports/$snapshotId` (snapshot exacto, sem providers).
- Quando expirado: CTA disabled "Expirado — gerar novo" com tooltip.
- `/app/reports/$id` mostra dias restantes + CTA "Gerar novo relatório" se expirado.

### Lacunas a corrigir neste prompt

1. **Banner explicativo** no topo de `/app/reports` (antes dos stats) com a cópia exacta pedida pelo utilizador — ainda não existe.
2. Ajustar **CTA expirado no cartão** para texto "Gerar nova análise" (estava "Expirado — gerar novo") e torná-lo um `<Link to="/">` real, não um botão `disabled` — mais útil ao utilizador (clica e gera nova análise).

### Plano

#### Passo 1 — `RetentionNotice` no topo

Em `src/routes/app.reports.tsx`, adicionar componente `RetentionNotice` renderizado logo a seguir ao header da página (antes do grid de stats). Card discreto com `Info` icon e cópia em pt-PT:

> "Os relatórios ficam guardados durante 15 dias. Durante esse período, podes voltar a abrir exatamente a análise gerada, sem recalcular dados. Depois disso, removemos os dados antigos para manter o serviço sustentável e eficiente."

Estilo:
- `rounded-xl border border-border-default/20 bg-surface-muted px-4 py-3`
- Icon `Info` (lucide) em `text-content-tertiary`
- Texto `text-sm text-content-secondary leading-relaxed`
- Sem cor hardcoded, mobile-first (375px ok — flex column natural)

Renderizar só quando `!loading && !error` para não competir com estados de loading.

#### Passo 2 — Cartão expirado: CTA accionável

No `ReportCard`, substituir o botão `disabled` "Expirado — gerar novo" por:

```tsx
<Link to="/" className="… variante primária discreta …">
  <Search className="size-3" />
  Gerar nova análise
</Link>
```

Mantém o aria/label semântico de "expirado" via badge + título do cartão; o CTA fica accionável (princípio de "não bloquear o utilizador, oferecer caminho").

#### Passo 3 — Validação

- `bunx tsc --noEmit`
- `bunx vitest run`
- Manual @ 375px:
  - Banner não causa overflow horizontal
  - Cartão com retenção activa: badge "Disponível" ou "Expira em N dias"
  - Cartão expirado: badge "Expirado" + CTA "Gerar nova análise" leva a `/`

### Constrangimentos respeitados

- Sem providers, sem deletes, sem cálculos alterados.
- Sem mexer em admin nem email.
- Tudo via tokens semânticos existentes.

### Ficheiros tocados

- `src/routes/app.reports.tsx` (banner + ajuste CTA expirado)

### Checkpoints

- ☐ Banner com a cópia exacta visível no topo de `/app/reports`
- ☐ CTA expirado é um Link accionável "Gerar nova análise" → `/`
- ☐ `tsc` + `vitest` verdes
- ☐ Sem overflow a 375px
