
# Simplificar primeira dobra do relatório público

## Problema

O relatório público tem redundância visual no topo:
1. **Header global** (AppShell) mostra "Analisar agora" — redundante quando já se está a ver um relatório
2. **Hero top bar** repete "InstaBench · Relatórios · @handle" — contexto já coberto pelo hero card

## Ficheiros locked relevantes

`header.tsx` e `app-shell.tsx` estão em `LOCKED_FILES.md`. O plano evita editá-los.

## Abordagem

### 1. Remover breadcrumb do hero (`report-hero-v2.tsx`)

Eliminar a top bar (L59-87) que contém:
- "InstaBench" (logo link)
- "Relatórios › @handle" (breadcrumb)
- Pill de data (redundante — já aparece no COL 1 do hero)
- "+ Novo relatório" CTA (manter, mas mover para dentro do hero card COL 3)

Resultado: o hero card fica como primeiro elemento visual, sem barra de navegação acima.

### 2. Mover "+ Novo relatório" para COL 3 do hero card

Adicionar um botão "+ Novo relatório" no topo da coluna de acções (COL 3), antes de "Exportar PDF". Estilo secundário (outline) para não competir com "Exportar PDF" como acção primária do relatório.

### 3. Esconder "Analisar agora" do header global nas páginas de relatório

Como `header.tsx` é locked, a solução é via CSS no `ReportThemeWrapper` ou no route `analyze.$username.tsx`: aplicar uma classe/atributo ao body ou a um wrapper que esconde o CTA "Analisar agora" no header quando se está dentro do relatório.

Opção: no `analyze.$username.tsx`, no `beforeLoad` que já existe, adicionar `document.body.setAttribute("data-report-view", "true")` e limpar no cleanup. Depois, uma regra CSS em `styles.css`:

```css
[data-report-view="true"] [data-header-cta] { display: none; }
```

Isto requer apenas uma pequena adição ao `header.tsx` — um `data-header-cta` no botão. **Como header.tsx é locked, preciso de confirmação para adicionar este atributo.**

**Alternativa sem tocar no header**: aceitar que o header global aparece com "Analisar agora" e confiar no "+ Novo relatório" no hero card como CTA principal. A redundância do header é menor que a do breadcrumb.

### Ficheiros a alterar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/report-redesign/v2/report-hero-v2.tsx` | Remover top bar (L59-87); adicionar "+ Novo relatório" na COL 3 |
| `src/routes/analyze.$username.tsx` | Adicionar `data-report-view` ao body (se opção header hiding aprovada) |
| `src/styles.css` | Regra CSS para esconder CTA do header (se aprovado) |
| `src/components/layout/header.tsx` (**LOCKED**) | Adicionar `data-header-cta` ao botão (precisa aprovação) |

### Validação

- `bunx tsc --noEmit`
- `bunx vitest run`
- Screenshot visual em `/analyze/frederico.m.carvalho`
- Confirmar: sem breadcrumb, um só CTA primário, acções alinhadas com hero

## Decisão necessária

Queres que edite o `header.tsx` (locked) para adicionar o atributo `data-header-cta` e assim esconder "Analisar agora" nas páginas de relatório? Ou preferes manter o header intacto e só limpar o breadcrumb do hero?
