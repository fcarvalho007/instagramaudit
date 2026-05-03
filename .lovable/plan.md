
# Adicionar links de acesso rápido ao report na landing page

## O que muda

Adicionar uma pequena secção de "acesso rápido" (visível apenas em dev/admin) na página `/` com links directos para:

1. `/analyze/frederico.m.carvalho` — Report real com dados live
2. `/report/example` — Report mockup editorial

## Implementação

**Ficheiro:** `src/routes/index.tsx`

- Adicionar um bloco discreto no topo ou fundo da página (antes do `HeroSection` ou após `ProductPreviewSection`) com dois `Link` do TanStack Router apontando para as rotas acima.
- Estilo minimalista: fundo `surface-secondary`, texto pequeno, alinhado ao design system existente.
- Sem lógica de gate — links visíveis para qualquer visitante (o site está em fase de testes admin).

Nenhum outro ficheiro será alterado.
