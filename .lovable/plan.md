Plano para corrigir os botões “Exportar PDF” e “Partilhar” no relatório

Diagnóstico
- O bloco final do relatório (`ReportFinalBlock`) já tem lógica real para gerar/abrir PDF e copiar/partilhar link.
- Os botões visíveis no cabeçalho (`ReportHeader`) são apenas botões visuais: não têm `onClick`, não recebem `snapshotId` e não executam PDF nem partilha.
- Na imagem enviada, os botões no topo são precisamente esses botões inativos do cabeçalho. Por isso a correção anterior no bloco final não resolve a interação que estás a testar.

Ficheiros que precisam de edição
- `src/components/report/report-header.tsx` — locked.
- `src/components/report/report-page.tsx` — locked.
- `src/routes/analyze.$username.tsx` — para passar o `snapshotId` real ao relatório.

Como vou corrigir
1. Criar uma pequena API interna de ações do relatório, passada por props:
   - `onExportPdf?: () => void`
   - `onShare?: () => void`
   - `pdfBusy?: boolean`
   - `pdfDisabled?: boolean`
2. Fazer `ReportPage` aceitar essas ações e repassá-las ao `ReportHeader`.
3. Atualizar `ReportHeader` para:
   - Chamar `onExportPdf` no botão “Exportar PDF”.
   - Chamar `onShare` no botão “Partilhar”.
   - Mostrar estado de loading no PDF (“A preparar…” ou ícone de carregamento).
   - Desativar PDF quando não há `snapshotId`.
   - Manter `/report.example` visualmente igual: sem ações reais, ou seja, os botões continuam presentes mas sem depender de dados reais.
4. Centralizar a lógica real em `/analyze/$username`:
   - Usar o `snapshotId` já carregado para chamar `/api/public/public-report-pdf`.
   - Abrir o PDF de forma fiável usando a estratégia popup-before-await já existente, mas agora acionada pelo botão do cabeçalho.
   - Se o popup for bloqueado, mostrar um fallback clicável no bloco final ou via estado partilhado.
   - Partilha: tentar Web Share API quando disponível; se não, copiar o link para a área de transferência com fallback para `execCommand`.
5. Evitar duplicação perigosa:
   - O `ReportFinalBlock` deve reutilizar a mesma lógica/actions do topo sempre que possível, para que “Exportar PDF” funcione igual no cabeçalho e no bloco final.

Critérios de validação
- Em `/analyze/frederico.m.carvalho`:
  - Clicar “Exportar PDF” no topo gera/abre o PDF ou apresenta link fallback se a nova aba for bloqueada.
  - Clicar “Partilhar” no topo abre a partilha nativa quando suportada ou copia o link com toast de sucesso.
  - O botão do bloco final continua funcional.
  - Nenhuma chamada a OpenAI, Apify ou DataForSEO é disparada pelos cliques de PDF/partilha.
  - Sem overflow horizontal em 375px.
- Em `/report.example`:
  - Layout permanece igual e não fica ligado a dados reais.

Notas importantes
- `report-header.tsx` e `report-page.tsx` estão em `LOCKED_FILES.md`; como pediste “corrija” especificamente estes botões, vou considerar isto como autorização para esta alteração estreita nesses ficheiros. Não vou tocar noutros ficheiros locked além destes.
- Não vou editar `routeTree.gen.ts`; é gerado automaticamente.
- Não vou introduzir novas dependências.

Checklist de entrega
☐ Botão “Exportar PDF” do cabeçalho funcional.
☐ Botão “Partilhar” do cabeçalho funcional.
☐ Fallback para popup/clipboard bloqueado mantido.
☐ `/report.example` preservado.
☐ Sem chamadas a providers durante PDF/partilha.
☐ Validação visual/responsiva no relatório real.