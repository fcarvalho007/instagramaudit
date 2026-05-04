
## Estado atual

### Concluído
- 4 KPI cards do Bloco 2 refinados e integrados
- Rotas `/login`, `/signup`, `/reset-password` criadas com copy pt-PT
- Componente `AuthCard` criado
- Layout `/app` com `Outlet` e rota placeholder `/app/reports`
- Ficheiro de migração `20260504130500_user_account_foundation.sql` no repo

### Pendente

**1. Migração de base de dados não aplicada**

O ficheiro SQL existe mas a tabela `profiles`, a coluna `report_requests.user_id`, o trigger `handle_new_user`, a função `link_user_to_existing_reports` e as políticas RLS **não existem na base de dados**. Precisam de ser aplicados via ferramenta de migração.

Conteúdo da migração (já escrito, sem alterações):
- Tabela `profiles` (id, email, display_name, avatar_url, plan, lead_id)
- Coluna `report_requests.user_id` (nullable)
- Função `link_user_to_existing_reports` (SECURITY DEFINER)
- Trigger `on_auth_user_created` → `handle_new_user`
- RLS: profiles SELECT/UPDATE own row; report_requests SELECT by user_id

**2. Google OAuth**

O botão "Continuar com Google" está na UI mas o provider Google não está configurado no backend de auth. Requer:
- Configurar o provider Google via `cloud--configure_auth`
- O utilizador precisará de fornecer Client ID e Client Secret do Google Cloud Console (ou pode ser adiado para mais tarde)

## Plano de execução

1. Aplicar a migração pendente usando a ferramenta de migração DB
2. Verificar que `profiles`, `user_id` e RLS existem
3. Tentar configurar Google OAuth (ou documentar como pendente se precisar de credenciais)
4. Correr tsc + vitest para validação final
