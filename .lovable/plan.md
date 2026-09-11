# Reorganização do menu superior do relatório Editorial V2

## Objetivo
Menu mais limpo: encurtar rótulos e colapsar as secções finais (após "Melhor vs Pior") num único item "outros campos no pro".

## Âmbito
Apresentação apenas — só a camada de chrome do Editorial V2. Não altera `COMMERCIAL_SECTIONS`, IDs funcionais, gating, acesso, dados, PDF, pagamentos, créditos, comparação, nem o relatório legacy.

## Rótulos novos (override só no chrome)

| Ancora atual | Rótulo atual | Rótulo novo |
|---|---|---|
| visao-geral | Visão geral | Visão |
| engagement | Engagement | Engagement (sem mudança) |
| frequencia | Cadência semanal | Cadência |
| formatos | Mix de formatos | Formatos |
| publicacoes-chave | Melhor vs pior publicação | Melhor vs Pior |

Implementação: adicionar `LABEL_MAP` em `chrome-sections.ts` que faz override do `shortLabel` vindo de `COMMERCIAL_SECTIONS`. O `COMMERCIAL_SECTIONS` fica intacto (afeta legacy sidebar, testes, etc.).

## Colapsar secções finais

Após "Melhor vs Pior" (04), as três secções restantes (Conversas 05, Diagnóstico 06, Prioridades 07) colapsam num único item de menu:

- **Rótulo:** "outros campos no pro"
- **Ícone:** cadeado (Lock)
- **Sem número de apresentação** (ou "Pro")
- **Comportamento ao clicar (não-Pro):** scroll para a secção do Pro Gate (primeira secção bloqueada — conversas)
- **Comportamento ao clicar (Pro desbloqueado):** scroll para Conversas (primeira secção do grupo colapsado)

Quando o utilizador é Pro, o menu mantém os três itens visíveis individualmente (com rótulos encurtados: "Conversas", "Diagnóstico", "Prioridades") para preservar a navegação completa de quem pagou.

## Ficheiros a editar

1. **`src/components/report-editorial-v2/chrome/chrome-sections.ts`**
   - Adicionar `LABEL_MAP` com os overrides de rótulo
   - Modificar `buildChromeSections`: quando `!premiumUnlocked`, substituir as três secções finais por um item colapsado "outros campos no pro"; quando `premiumUnlocked`, manter todas com rótulos encurtados

2. **`src/components/report-editorial-v2/chrome/editorial-report-chrome.tsx`**
   - Sem mudança estrutural — já itera `sections` e renderiza `label` + `Lock`. O item colapsado funciona naturalmente com o render existente (label + lock).
   - Apenas garantir que o clique no item colapsado faz scroll para o sítio certo (conversas ou pro-gate).

## Validação
- Typecheck (`tsgo`)
- Testes Editorial V2 (`chrome-sections` / `section-access`)
- QA browser a 1280px e 375px: menu limpo, item "outros campos no pro" visível com cadeado, sem overflow
- Verificar que o menu legacy (sidebar de produção) não é afetado
