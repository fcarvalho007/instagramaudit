Plano para corrigir o erro ao clicar em “Público geral” em `/admin/report-lab`:

1. Reproduzir a falha no próprio Report Lab após garantir sessão/admin visível no preview.
2. Corrigir a causa provável no `ReportShellV2`: quando a variante `public_mvp` deixa apenas 2 blocos visíveis, a navegação mobile ainda tenta renderizar 3 tabs e pode aceder a um bloco inexistente.
3. Tornar `ReportBlockTopTabs` resiliente para 1–2 blocos visíveis:
   - calcular apenas índices válidos;
   - não renderizar botões quando não existe bloco;
   - manter sidebar e tabs alinhadas com `visibleBlockIds`.
4. Fazer uma verificação rápida do fluxo: `internal_lab` → `public_mvp` sem cair no fallback “Something went wrong”.

Sem mexer em dados, providers, PDF, Lovable Cloud ou lógica de análise.