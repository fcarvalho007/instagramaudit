Plano para alinhar o topo real de `/analyze/$username` com o mockup anexado:

1. Ajustar o `ReportHeroV2` para funcionar como uma barra compacta única em desktop:
   - Avatar pequeno à esquerda, com badge de verificação.
   - Handle, tier e linha de métricas na mesma zona esquerda.
   - Botões de PDF e partilha em formato icon-only.
   - Botão `+ Novo` escuro ao lado das ações, como no mockup.

2. Integrar o selector de período no mesmo topo em desktop:
   - Em vez de aparecer como uma segunda card abaixo, passa para a direita da barra.
   - Mantém eyebrow `PERÍODO`, texto de amostra grátis e chips `12 pub.`, `30 dias`, `60 dias`, `90 dias`, `365 dias`.
   - Preserva o comportamento premium existente dos chips bloqueados.

3. Preservar responsividade sem mexer na lógica do relatório:
   - Desktop: identidade + ações + período numa única barra horizontal.
   - Mobile/tablet: manter layout compacto/expandível para evitar overflow.
   - Não alterar dados, premium logic, PDF/share logic, `/report.example`, nem geração de relatório.

Ficheiros previstos:
- `src/components/report-redesign/v2/report-hero-v2.tsx`
- `src/components/report-redesign/v2/analysis-period-selector.tsx`
- `src/components/report-redesign/v2/report-shell-v2.tsx`