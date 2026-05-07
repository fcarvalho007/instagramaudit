Diagnóstico confirmado:

- O botão “Público” abre `/analyze/frederico.m.carvalho`.
- Essa página chama `/api/analyze-public-v1`.
- O endpoint está a responder `503` com `CACHE_ONLY_NO_DATA`.
- A razão concreta é: o sistema está em modo `cache_only`, e o snapshot existente para `frederico.m.carvalho` expirou. Como já passou também a janela de fallback stale, a página pública não tem dados servíveis e mostra “Análise indisponível”.
- Isto não é um problema do URL em si; é uma combinação de copy pouco clara no Report Lab + política atual de cache sem snapshot válido.

Plano de correção:

1. Clarificar a secção “Ações de partilha” em `/admin/report-lab`
   - Separar visualmente os links por finalidade:
     - “Relatório público” — URL pública real: `/analyze/{perfil}`.
     - “Pré-visualização fullscreen admin” — URL interna: `/admin/report-preview/{perfil}?variant=...`.
     - “URL deste Lab” — estado atual de configuração do Report Lab.
   - Mostrar o URL completo em texto pequeno, copiável e legível, para que seja claro onde ver o relatório em fullscreen.
   - Renomear “Público” para algo mais explícito: “Abrir público” / “Copiar público”.
   - Renomear “Fullscreen” para “Copiar preview fullscreen admin”, para não parecer que é a mesma coisa que o relatório público.

2. Mostrar estado operacional do relatório público antes de abrir/copiar
   - Como o Report Lab já carrega dados do perfil, acrescentar uma nota de estado na zona de links:
     - Se existir snapshot válido: “Relatório público disponível”.
     - Se existir snapshot expirado: “Snapshot expirado — o público só abre se o modo Fresh estiver ativo”.
     - Se não existir snapshot: “Sem snapshot público guardado”.
   - Isto evita o clique às cegas para uma página que acaba em “Análise indisponível”.

3. Corrigir a mensagem pública para o caso real `CACHE_ONLY_NO_DATA`
   - Em `/analyze/$username`, mapear `CACHE_ONLY_NO_DATA` para uma mensagem pt-PT específica, por exemplo:
     “Este relatório ainda não tem dados públicos disponíveis. A equipa pode gerar uma nova análise no modo Fresh.”
   - Hoje este código cai no fallback genérico, o que esconde a causa real.
   - Atenção: este ficheiro está listado em `LOCKED_FILES.md` por controlar o que o público vê. Vou alterar apenas a copy de erro e, por isso, preciso da tua aprovação explícita para tocar nele.

4. Corrigir o erro de consola da pré-hidratação do tema
   - Foi detetado `Cannot read properties of null (reading 'setAttribute')` porque há scripts que fazem `document.body.setAttribute(...)` antes de `body` existir.
   - Ajustar estes scripts para serem seguros: `document.body&&document.body.setAttribute(...)`.
   - Isto não é a causa do 503, mas é um bug real na página de análise/preview.

5. Não alterar lógica de dados nem ativar Fresh automaticamente sem decisão tua
   - Não vou mudar o modo `cache_only` para `fresh` automaticamente nesta correção, porque isso pode gerar chamadas ao fornecedor de dados e custos.
   - Se quiseres que o relatório público volte já a funcionar com dados novos, a ação operacional certa é mudar temporariamente o modo para Fresh e gerar uma nova análise para `frederico.m.carvalho`; isso é separado da correção de UI/copy.

Ficheiros prováveis:

- `src/routes/admin.report-lab.tsx` — clareza dos links, URLs visíveis e estado operacional.
- `src/routes/analyze.$username.tsx` — copy específica para `CACHE_ONLY_NO_DATA` e script seguro. Ficheiro bloqueado; requer aprovação explícita.
- `src/components/report/report-theme-wrapper.tsx` — script seguro para `document.body`.
- `src/routes/admin.report-preview.$username.tsx` — script seguro equivalente.

Checkpoint:

☐ Aprovar a clarificação visual dos links em `/admin/report-lab`
☐ Autorizar alteração mínima no ficheiro bloqueado `src/routes/analyze.$username.tsx`
☐ Manter `cache_only` por agora, sem gerar novos custos automaticamente
☐ Depois da implementação, validar no browser os URLs público, preview fullscreen admin e URL Lab