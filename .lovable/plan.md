## Porque é que @maisensinomaisformacao continua a falhar

A ScrapeCreators já tem créditos e respondeu desta vez. A resposta foi clara:

> "Profile is restricted" (perfil restrito)

Testei também a lista de publicações, que veio vazia. A Apify também não devolveu nada às 20:31.

O Instagram só mostra este perfil a quem tem sessão iniciada. Contigo funciona porque estás ligado (na captura vê-se "Seguido/a por…"). As fontes de dados leem o Instagram sem sessão e, para elas, o perfil está bloqueado. Normalmente isto acontece porque a conta tem uma **restrição de idade** ou uma **restrição por país**. Ambas são definidas pelo dono da conta, no Instagram ou no Meta Business Suite.

Conclusão: não é um erro da app. Nenhuma das fontes consegue ler este perfil. A regra do projeto também proíbe usar uma sessão iniciada para ler o Instagram. O problema real é a mensagem "Não encontrámos este perfil", que é falsa e confunde.

## O que vou corrigir

1. **Reconhecer o "perfil restrito".** Quando a ScrapeCreators responder "restricted", a app trata o caso como restrito e não como "não encontrado".
2. **Mensagem honesta, sem botão "Tentar novamente":**
   - Título: "Perfil com acesso limitado"
   - Texto: "O Instagram só mostra este perfil a quem tem sessão iniciada, normalmente por restrição de idade ou de país definida pela conta. As nossas fontes de dados leem apenas a versão pública, por isso não é possível analisá-lo. Se o perfil for teu, retira a restrição e volta a tentar."
   - Botão: "Analisar outro perfil"
3. **Não gastar créditos à toa.** Nos perfis restritos, a app deixa de pedir as publicações e deixa de recorrer à Apify. O resultado fica guardado durante 24 horas.
4. **Registo no admin.** O motivo "Profile is restricted" fica guardado no registo da chamada.
5. **Testes** para a deteção do perfil restrito, a ausência de recurso à Apify e o tempo de 24 horas.

Mantêm-se os preços, os créditos e as regras de acesso.

## Se o perfil for de um cliente

O dono da conta pode verificar em Definições → Conta profissional → Restrição de idade, ou nas restrições por país no Meta Business Suite. Depois de retirar a restrição, a análise deve funcionar. Para testar logo, há que esperar 24 horas ou usar a atualização forçada no admin.

## Detalhes técnicos
- Resposta observada em `/v1/instagram/profile`: HTTP 200, `success:true`, `error:"not_found"`, `errorStatus:404`, `message:"Profile is restricted"`. Em `/v2/instagram/user/posts`: `items:[]`.
- `ProviderProfileResult` ganha `unavailableReason?: "restricted"`, preenchido pelo adaptador ScrapeCreators quando `message` contém "restricted".
- O router não faz fallback quando `unavailableReason` existe, porque é uma resposta válida e não uma falha do fornecedor.
- Novo `PROFILE_RESTRICTED` (HTTP 422) em `types.ts`, `ERROR_MESSAGES`, `HTTP_STATUS`, `errors.json` pt/en e `analysis.json` (título e CTA). `AnalysisErrorState` trata-o como `PROFILE_PERSONAL_NO_FEED`, sem botão de repetir.
- `negative-cache.ts` passa a incluir `PROFILE_RESTRICTED` nos códigos com TTL de 24 horas.
- `recordProviderCall` recebe `errorMessage: "Profile is restricted"` na linha de sucesso.
