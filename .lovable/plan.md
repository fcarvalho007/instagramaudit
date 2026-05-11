Diagnóstico encontrado:

1. O submenu `Tabela` já existe no código da sidebar em `src/components/admin/v2/admin-sidebar.tsx`, dentro do grupo `Contactos`, por baixo de `Pipeline`.
2. A página que aparece na captura ainda está no gate de acesso, por isso a sidebar não é renderizada enquanto não houver email admin guardado no browser. Sem entrar no gate, é esperado não ver `Pipeline` nem `Tabela`.
3. A Pipeline falha por 401 no preview do utilizador porque os pedidos para `/api/admin/leads-kanban` chegam sem `X-Admin-Email`.
4. O endpoint em si funciona quando recebe o header correto: testei `/api/admin/leads-kanban` com `X-Admin-Email: fredericodigital@gmail.com` e respondeu `200` com leads reais.
5. Ainda existem chamadas diretas com `fetch(..., { credentials: "include" })` para endpoints admin, principalmente na Command Palette, PeopleTab e LeadDetailSheet. Esse padrão não funciona com o gate simples atual, porque não há cookie/JWT; a autenticação depende do header injetado por `adminFetch`.

Plano de correção:

1. Unificar chamadas admin no helper correto
   - Substituir `fetch("/api/admin/leads-kanban", { credentials: "include" })` por `adminFetch(...)` na Command Palette.
   - Fazer o mesmo em `PeopleTab`.
   - No `LeadDetailSheet`, trocar as chamadas admin diretas por `adminFetch` para:
     - `/api/admin/lead-timeline/:id`
     - `/api/admin/generate-beta-report`
     - `/api/admin/send-report-link`
     - `/api/admin/send-feedback-request`
     - `/api/admin/send-commercial-followup`

2. Evitar recarregamento prematuro em 401
   - Ajustar `adminFetch` para continuar a limpar a sessão inválida, mas sem recarregar automaticamente a página antes de a UI conseguir mostrar uma mensagem clara.
   - Isto evita loops visuais em que a página volta ao gate sem explicar que a sessão local estava inválida.

3. Tornar `Tabela` inequívoca no menu
   - Manter `Tabela` diretamente por baixo de `Pipeline` no grupo `Contactos`.
   - Garantir que o active state distingue corretamente:
     - `Pipeline`: `/admin/beta-leads` sem `view`, ou `view=pipeline`
     - `Tabela`: `/admin/beta-leads?view=tabela`
   - Corrigir o título da topbar para mostrar `Contactos` em vez de só `Pipeline`, porque a rota serve as duas vistas.

4. Refinar mensagens da página de Contactos
   - Quando o erro for 401/403, mostrar estado de sessão/admin em falta em vez de “Não foi possível carregar contactos”.
   - Manter botão para voltar ao gate de admin.

5. Validação
   - Repetir o teste direto do endpoint com header admin.
   - Confirmar no preview, depois de login no gate, que:
     - aparece `Contactos > Pipeline` e `Tabela` na sidebar;
     - Pipeline carrega contactos;
     - `Tabela` abre a mesma listagem em tabela;
     - não há novos 401 em `/api/admin/leads-kanban` quando a sessão local existe.

Ficheiros previstos:

- `src/lib/admin/fetch.ts`
- `src/components/admin/v2/admin-command-palette.tsx`
- `src/components/admin/v2/automacoes/people-tab.tsx`
- `src/components/admin/v2/beta-leads/lead-detail-sheet.tsx`
- `src/components/admin/v2/admin-topbar.tsx`
- possivelmente `src/routes/admin.beta-leads.tsx` apenas para melhorar a mensagem de erro, se necessário.