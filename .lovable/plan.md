Plano de correção para o card “Frequência de publicação”

1. Corrigir o gráfico que não aparece
- Alterar o gráfico `WeeklyRhythmChart` para que as barras tenham área visual real e previsível.
- Causa provável encontrada: as barras são renderizadas como `<span>` inline com `height`/`width`; elementos inline podem ignorar dimensões visuais, fazendo o gráfico parecer vazio.
- Tornar cada barra `block`, com largura/altura explícitas, base alinhada, fundo visível e escala estável.
- Manter o gráfico sempre legível: zero posts aparece como linha mínima, dias com posts aparecem como barras, e o pico semanal ganha destaque visual.

2. Tornar o gráfico visualmente mais apelativo
- Reformatar a zona “Ritmo por dia da semana” como um bloco visual dentro do card: fundo subtil, border hairline, padding e grid estável.
- Usar barras verticais com azul principal no pico e azul suave nos restantes dias.
- Adicionar uma baseline discreta para dar leitura de gráfico, sem parecer decorativo vazio.
- Garantir labels de dias e números alinhados e legíveis em mobile e desktop.

3. Alinhar as caixas/KPIs de frequência com o visual do exemplo anexado
- Reestruturar a faixa dos 3 KPIs (“cadência”, “consistência”, “pico semanal”) para seguir o padrão visual mostrado:
  - ícone circular no topo;
  - label/eyebrow em cima;
  - valor principal por baixo;
  - unidade/caption ao lado ou abaixo, conforme espaço;
  - separadores verticais subtis em desktop;
  - empilhamento limpo em mobile.
- Remover a sensação de “valor em cima, título em baixo” que hoje quebra a clareza.

4. Harmonizar o header com “Índice do perfil”
- Adicionar eyebrow acima do título do card, com o mesmo estilo editorial dos outros cartões.
- Manter “Frequência de publicação Alta/Média/Baixa” como título principal, mas com hierarquia clara.
- Usar ícone/identidade visual de ritmo/calendário onde fizer sentido, sem criar ruído.

5. Ficheiros a alterar
- `src/components/report-redesign/v2/overview/frequency-card.tsx`
  - corrigir `WeeklyRhythmChart`;
  - redesenhar KPI strip;
  - ajustar header/eyebrow/ícones;
  - manter os cálculos e copy existentes.
- Se necessário, apenas pequenos ajustes de copy em:
  - `src/i18n/locales/pt/report.json`
  - `src/i18n/locales/en/report.json`

6. Validação
- Verificar no preview `/admin/report-preview/frederico.m.carvalho?variant=pro_preview`.
- Confirmar que:
  - o gráfico aparece claramente;
  - as 7 barras têm dimensão visível;
  - o pico semanal está destacado;
  - os KPIs seguem a hierarquia do exemplo anexado;
  - não há regressão no `/admin/report-lab` nem no layout mobile.

Fora de escopo nesta correção: alterar dados, cálculo de frequência, pagamentos, gates, novas fontes de dados ou outros cards do relatório.