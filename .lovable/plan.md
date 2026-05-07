
# Reorganização do menu /admin

## Problema actual

10 pills numa linha flat sem qualquer agrupamento — difícil de perceber o que pertence a quê. À medida que o viewport encolhe, as pills fazem wrap sem lógica visual.

## Proposta: agrupar por domínio funcional

Organizar as tabs em 3-4 grupos visuais com separadores subtis (linha vertical fina ou espaço extra) e etiquetas de grupo opcionais em eyebrow discreto (10px, uppercase, tertiary):

```text
┌─────────────────────────────────────────────────────────────────┐
│  GERAL                    │  PIPELINE              │  PRODUTO  │
│  Visão geral              │  Leads                 │  Perfis   │
│  Receita                  │  Pedidos               │  Relatórios│
│  Clientes                 │                        │  Report Lab│
│                           │                        │  Conhecimento│
│                                                    │  Sistema  │
└─────────────────────────────────────────────────────────────────┘
```

Layout final em pills (como aparece no ecrã):

```text
  NEGÓCIO                      PIPELINE             PRODUTO & SISTEMA
  [Visão geral] [Receita] [Clientes]  |  [Leads] [Pedidos]  |  [Relatórios] [Perfis] [Conhecimento] [Report Lab] [Sistema]
```

### Mudanças nos labels

| Actual              | Novo            | Razão                              |
|---------------------|-----------------|------------------------------------|
| Receita e despesas  | Receita         | Mais curto, "despesas" implícito   |
| Beta Leads          | Leads           | Remover "Beta" — já não é beta     |
| Beta Requests       | Pedidos         | Mais claro em pt-PT                |

### Alterações de design

- Separadores entre grupos: `border-r border-admin-border` fino (1px, 14% opacity) com `mx-2` de espaçamento
- Etiquetas de grupo (eyebrow): opcionais, 10px uppercase em `admin-text-tertiary`, acima de cada grupo de pills — só aparecem em desktop (`hidden sm:block`)
- Pills mantêm o mesmo estilo glassmorphism actual (inactiva/activa)
- Em mobile, as etiquetas de grupo desaparecem e as pills fazem wrap normalmente — mas os separadores visuais (linha ou espaço) mantêm alguma estrutura

## Ficheiros alterados

1. **`src/components/admin/v2/admin-tabs-nav.tsx`** — refactoring completo: tabs agrupadas por secção, separadores, labels de grupo, nomes actualizados
2. **Rotas `/admin/beta-leads` e `/admin/beta-requests`** — sem alteração de ficheiro (as rotas mantêm os mesmos paths, só o label muda no nav)

## Sem alterações

- Sem mudança de lógica, rotas, ou dados
- Sem novos ficheiros
- Sem alteração nos tokens CSS
