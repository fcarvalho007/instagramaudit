## Diagnóstico

Confirmei no preview que a homepage está a carregar o hero escuro, mas há inconsistência visual no chrome:

- Header aparece com faixa branca/translúcida por cima do hero.
- A área fora/entre blocos deixa ver fundo branco.
- O footer pode cair para a versão light ou revelar branco quando a página não está toda coberta pelo fundo dark.
- O código já tenta usar `Header variant="dark"` e `DarkFooter`, por isso o problema parece ser de cobertura de fundo e estilos globais/herdados, não de conteúdo da página.

## Plano de correção

1. **Fechar a homepage num contexto dark explícito**
   - Garantir que o shell da rota `/` pinta o wrapper inteiro, `main`, e o fundo base com `rgb(var(--hero-bg-base))`.
   - Evitar que `body`/fundo global branco apareça em qualquer gap entre hero, ilha dark e footer.

2. **Tornar o header dark independente do scroll/cache visual**
   - Ajustar o `Header` quando `variant="dark"` para usar fundo navy real e texto/bordas coerentes.
   - Manter translucidez apenas se não revelar branco por trás.

3. **Eliminar a falha branca entre primeira e segunda dobra**
   - Rever a transição `HeroSection` → `LandingDarkIsland`.
   - Remover margens/gaps que exponham `surface-base` branco.
   - Garantir que `LandingDarkIsland` começa imediatamente em fundo dark.

4. **Garantir footer dark na homepage**
   - Confirmar que `/` usa sempre `DarkFooter`.
   - Dar ao footer e ao wrapper externo um fundo dark contínuo para não depender de transparência.

5. **Verificação no preview**
   - Abrir `/` no viewport atual `1445x885`.
   - Validar topo, dobra hero→segunda secção e footer.
   - Confirmar que páginas internas continuam com header/footer light normais.