Adicionar indicação visual "Em desenvolvimento · Julho 2026" aos botões "Comparar concorrente" e "PDF" no hero do report v2, de forma transparente para o utilizador.

## Alterações

### 1. Traduções (i18n)
- `src/i18n/locales/pt/report.json` — adicionar `hero.actions.coming_soon` = "Em breve" e `hero.actions.coming_soon_detail` = "Julho 2026"
- `src/i18n/locales/en/report.json` — adicionar as mesmas chaves em inglês ("Coming soon", "July 2026")

### 2. Report Hero v2
- `src/components/report-redesign/v2/report-hero-v2.tsx`
  - Botão **"Comparar concorrente"**: substituir o badge "PRO" atual por um badge cinzento/subtil "Em breve · Julho 2026".
  - Botão **"PDF"**: adicionar o mesmo badge "Em breve · Julho 2026" ao lado do texto do botão, alinhado com o padrão do botão de cima.
  - Os botões mantêm o seu aspeto e funcionalidade atual (clique continua a abrir modal/executar ação); apenas o texto do badge muda para refletir o estado real do roadmap.