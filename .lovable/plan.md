
## Diagnóstico

O problema não está no facto de o token ser “o mesmo”. A evidência que partilhaste indica que o bloqueio é do **plano**, não do token.

### O que foi validado
- O código atual já usa o ator certo: `apify/instagram-scraper`
- A chamada é server-side via `run-sync-get-dataset-items`
- O token é lido de `process.env.APIFY_TOKEN`
- Não há sinal, no código lido, de fallback para os dois atores antigos

### Evidência direta dos PDFs
1. **PDF de billing**
   - O plano **Creator** mostra: **Access to Actors = Universal only**
   - Não mostra acesso a “All”

2. **PDF do ator**
   - A própria consola do ator diz:
   - **“You cannot run this public Actor on your current Creator Plan. The Creator Plan does not include permission to run public Actors.”**

3. **Página pública do ator**
   - `apify/instagram-scraper` é um **public Actor** da Store

### Conclusão
Sim: **o plano Creator não permite correr este ator público**.  
Se o `APIFY_TOKEN` pertence à conta Creator, o comportamento esperado continua a ser **403 / public-actor-disabled**.

Ou seja:
- não é um bug do endpoint `/api/analyze-public-v1`
- não é um problema de normalização
- não é por o token estar desatualizado, se ele for mesmo da conta Creator
- o PDF que partilhaste já contém a explicação do bloqueio

## Implicação prática
Mesmo com o token correto, enquanto a conta ligada ao `APIFY_TOKEN` estiver em **Creator**, este ator continuará bloqueado.

## Menor próxima ação
Escolher uma destas vias:

1. **Upgrade para Starter (ou superior)**  
   - mantém a arquitetura atual
   - depois repete-se o smoke test

2. **Mudar de estratégia de scraping**
   - deixar de depender deste public Actor
   - procurar um ator/abordagem compatível com Creator
   - isso já implica novo plano técnico

3. **Hardening separado depois**
   - o cliente Apify atual ainda envia o token na query string server-side
   - isso é um tema de segurança/higiene, mas **não é a causa deste 403**

## Plano de trabalho se quiseres avançar
- Confirmar qual das 2 vias queres:
  - manter Apify Store e fazer upgrade para Starter+
  - ou redesenhar a integração para não depender deste public Actor
- Depois, em modo de execução:
  - revalidar o `APIFY_TOKEN`
  - repetir o smoke test end-to-end
  - confirmar se a análise volta a 200 e se o pipeline continua até PDF/email

## Checkpoint
- ☑ Código atual alinhado com o ator unificado
- ☑ PDFs lidos e usados como prova
- ☑ Causa isolada: **Creator não permite este public Actor**
- ☑ Não parece ser bug de código
- ☐ Decidir entre **upgrade para Starter+** ou **migrar a integração**
- ☐ Só depois repetir o smoke test real
