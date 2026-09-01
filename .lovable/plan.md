# Garantir imagens reais em “Melhores e piores publicações”

## Diagnóstico confirmado

A extracção e a persistência já funcionam para análises novas: a última análise de `frederico.m.carvalho` guardou **12 de 12 imagens** no armazenamento permanente e o adaptador do relatório preserva `thumbnail_storage_url` até ao cartão.

O problema visível está na escolha do snapshot:

- o endpoint público ordena os registos por `created_at`;
- uma actualização recente pode reutilizar um snapshot mais antigo através do seu `cache_key`, alterando `updated_at` sem alterar `created_at`;
- neste caso concreto, o snapshot actualizado às 20:49 tem 12 imagens, mas o endpoint escolhe outro, criado mais tarde no passado, que tem 0 imagens;
- o nível gratuito não remove as imagens na sanitização, portanto o bloqueio comercial não é a causa.

## Alterações

1. **Escolher a versão realmente mais recente**
   - No endpoint público por perfil, ordenar primeiro por `updated_at` decrescente e usar `created_at` como desempate.
   - Considerar apenas snapshots com estado pronto quando essa informação estiver disponível.
   - Aplicar a mesma regra ao endpoint equivalente do admin/report lab para evitar divergências entre o relatório público e a pré-visualização interna.

2. **Manter o percurso de imagem real**
   - Preservar a prioridade actual: imagem guardada permanentemente → URL original do fornecedor → ícone de formato apenas quando nenhuma imagem real estiver disponível ou o carregamento falhar.
   - Não usar imagens inventadas, placeholders fotográficos ou o screenshot enviado como conteúdo.

3. **Blindar com testes de regressão**
   - Testar que, entre dois snapshots do mesmo perfil, vence o que foi actualizado mais recentemente, mesmo que tenha sido criado antes.
   - Confirmar que `thumbnail_storage_url` chega a `thumbnailUrl` nos cartões de melhor e pior publicação.
   - Confirmar que a sanitização Free/Lead mantém as miniaturas e que o fallback só aparece sem URL válida.

4. **Corrigir e validar os casos reais**
   - Executar uma análise nova de `pingodoce`, cujo snapshot actual ainda tem 0 imagens porque foi gerado antes da correcção do extractor.
   - Validar no registo de persistência que existem imagens tentadas e guardadas.
   - Abrir o relatório de teste e confirmar visualmente, em desktop e mobile, que as miniaturas reais aparecem nos dois cartões.

## Ficheiros previstos

- `src/routes/api/public/analysis-snapshot.$username.ts`
- `src/routes/api/admin/snapshot.$username.ts`
- testes dos endpoints/adaptador de relatório; apenas se necessário, teste local do `PreviewThumb`

Não será alterada a lógica de métricas, o gate comercial, o desenho do card ou `/report.example`.
