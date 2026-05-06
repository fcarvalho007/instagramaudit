## Alteração

Adicionar uma micro-legenda abaixo dos dots de enriquecimento na secção "Custos por análise fresh" em `/admin/sistema`.

### Conteúdo da legenda

| Ícone | Significado |
|-------|-------------|
| ● verde | Concluído |
| ● amarelo | Em processamento |
| ● vermelho | Falhou |
| ● cinza 50% | Não aplicável |
| ● cinza 50% | Desativado |

### Ficheiro

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/admin/v2/sistema/analysis-cost-breakdown.tsx` | Adicionar legenda compacta no bloco de legenda existente (linha ~250) |

Apenas texto + ícones no footer da secção. Zero alterações de backend.
