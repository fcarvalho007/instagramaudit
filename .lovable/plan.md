# Leitura parcial para perfis restritos

## Resultado dos testes (já feitos)
Para @maisensinomaisformacao testei todas as vias públicas disponíveis:

- ScrapeCreators perfil: "Profile is restricted".
- ScrapeCreators publicações (v1 e v2) e reels: listas vazias.
- Instagram sem sessão (API web): exige login.
- Página pública do Instagram: devolve apenas nome, 2.782 seguidores, 763 a seguir e 751 publicações (nas meta tags da página). Não devolve nenhuma publicação.

Conclusão: não existe forma legítima de obter as publicações sem sessão iniciada. Por isso não há envolvimento, frequência, formatos nem benchmark para este perfil. O que é possível é uma leitura parcial.

## O que vai ser feito
Quando a fonte devolver "perfil restrito", em vez do ecrã de erro simples, mostrar um cartão de **leitura parcial**:

```text
Perfil com acesso limitado
[avatar?] +ENSINO +FORMAÇÃO | Educação Online Certificada
@maisensinomaisformacao

2.782 seguidores   763 a seguir   751 publicações

Nota: o Instagram só mostra as publicações deste perfil a quem tem sessão
iniciada. Por isso não calculamos envolvimento, frequência nem benchmark.
[Analisar outro perfil]
```

- Sem relatório completo, sem índice de perfil, sem Pro/créditos/pagamentos.
- Fonte e limitação indicadas de forma transparente (copy em pt-PT).
- Se a leitura da página pública falhar, mantém-se exactamente o ecrã atual "Perfil com acesso limitado".

## Decisões a respeitar
- Aprovado por ti: leitura própria da página pública, apesar da regra "sem scraping próprio". Fica limitada a este caso (só perfis restritos), a uma página, sem login, sem cookies, sem contas falsas.
- Cache de 24h já existente para resultados negativos: evita repetir pedidos.
- Não altero ReportData, gating, preços, créditos, PDF nem comparação V2.

## Secção técnica
1. Novo `src/lib/analysis/providers/public-profile-meta.server.ts`: GET a `instagram.com/<handle>/` com User-Agent de browser, timeout curto (8 s), extrai `og:title`, `og:description` (seguidores/a seguir/publicações, formato "2,782 Followers, 763 Following, 751 Posts") e `og:image`. Parser puro e testável; devolve `null` perante qualquer falha.
2. `analyze-public-v1.ts` (ramo `PROFILE_RESTRICTED`): chamar o leitor e incluir `partialProfile` no payload de falha, e guardar no registo de eventos/cache negativo para não repetir.
3. `analysis-error-state.tsx`: renderizar o cartão quando `partialProfile` existir (desktop e 375 px), com tokens semânticos e números Inter tabulares.
4. i18n pt/en em `analyze.json` para os rótulos e a nota.
5. Testes: parser com o HTML real deste perfil, formatos com milhares/"K"/"M", e resposta nula em falha.

## Risco a validar antes de concluir
O pedido à página do Instagram funcionou a partir do ambiente de testes, mas o servidor publicado pode ser bloqueado pelo Instagram (IPs de datacenter). Vou testar na app; se falhar, o ecrã volta ao comportamento atual e digo-te.

## Fora do âmbito
Ligação oficial do dono ao Instagram (login oficial) fica como futura funcionalidade, se quiseres análise completa de perfis restritos.
