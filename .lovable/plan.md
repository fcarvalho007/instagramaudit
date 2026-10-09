## Diagnóstico — @maisensinomaisformacao

O que os registos mostram (09/10/2026, 19:37–19:39 UTC):
- 4 tentativas, todas com a fonte de dados (Apify) a responder sem erro, mas com **zero resultados** para este perfil.
- Sem resultados, o sistema classifica como "perfil não encontrado".
- A fonte está a funcionar: no mesmo período, @italbox, @ach.brito e @clausporto foram analisados com 12 publicações cada.

Conclusão: o problema não é da app nem da fonte em geral. A fonte não consegue ler este perfil. As causas mais prováveis são:
1. O nome do perfil está escrito de outra forma (por exemplo, com ponto ou sublinhado).
2. O perfil é privado, foi restringido ou tem limite de idade ou de país.
3. O Instagram bloqueou temporariamente a leitura pública deste perfil.

Problema adicional: as 4 tentativas seguidas foram todas pagas (cerca de 0,01 USD no total). Um "não encontrado" recente devia ficar guardado durante uns minutos para evitar cobranças repetidas.

## Proposta (só avança depois da tua aprovação)

1. Confirmar no Instagram o nome exato e se o perfil é público. Não exige alterações.
2. Quando a Apify não devolver nada, tentar uma vez a fonte alternativa (ScrapeCreators) antes de mostrar "perfil não encontrado".
3. Guardar o resultado "não encontrado" durante 15 minutos para não pagar tentativas repetidas.
4. Melhorar a mensagem: "Não conseguimos ler este perfil. Confirma o nome e se é público."

## Detalhes técnicos
- Os registos mostram `outcome=not_found`, `error_code=PROFILE_NOT_FOUND` e `posts_returned=0`, com `http_status` 200, nos 4 pedidos.
- O passo 2 fica no encaminhamento de fontes (`providers/router.server.ts`), limitado a uma chamada e registado como custo.
- O passo 3 aproveita a cache negativa que já existe, mas que não está a ser usada quando o resultado é `not_found`.
- Mantêm-se os preços, os créditos e as regras de acesso.
