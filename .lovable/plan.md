## Validação: a área pessoal já existe

A ideia, tal como descrita, **duplica funcionalidade que já está implementada e testada**. Recomendo NÃO criar `/my-reports` nem `/reports/access/:token` e em vez disso reutilizar a área existente, fechando apenas o gap de acesso sem password.

### O que já existe
- `/app/reports` — lista de relatórios do utilizador autenticado (ícones de status, link para abrir, badges de delivery). Já é mobile-first e em pt-PT.
- `/app/account` — perfil, plano, logout.
- `/app` — layout autenticado (`AppShell`) que exige sessão e redireciona para `/login`.
- `/signup` — email+password + Google OAuth (via `lovable.auth.signInWithOAuth`).
- `/login` — atualmente só com auto-login do email admin (placeholder).
- DB:
  - `report_requests` tem RLS `user_id = auth.uid()`.
  - Trigger `handle_new_user` corre `link_user_to_existing_reports(user_id, email)` no signup → liga automaticamente todos os `report_requests` cujo `lead.email_normalized` bate certo.
  - `ensureReportAssociation()` é chamado a cada entrada no `/app` para reconciliar reports criados após o último login.

### O que isto implica para o unlock flow
Quando o visitante completa o unlock no report público:
1. Já criamos/atualizamos o `lead` por `email_normalized`.
2. Já criamos um `report_request` ligado a esse lead com `request_source: "public_unlock"`.
3. Se mais tarde esse email **fizer signup** (Google ou password), o trigger liga automaticamente os reports antigos ao novo `auth.users.id` → aparecem em `/app/reports` sem trabalho extra.

A peça que **realmente falta** não é uma nova área pessoal — é dar ao visitante um caminho de entrada nessa área existente sem inventar password.

### Recomendação
1. **Reutilizar `/app/reports`** como "Área pessoal" oficial. Ajustar copy do header para "Os teus relatórios InstaBench" se quiser alinhar com o pedido.
2. **Adicionar Magic Link (Supabase OTP por email)** ao `/login`:
   - É nativo no Supabase, seguro (token assinado, single-use, expira em 1h).
   - Não precisa password.
   - Liga-se ao trigger existente, então o primeiro login com magic link já cria o profile e liga os reports do lead.
3. **No success state do unlock modal**, acrescentar uma linha:
   > "Para acederes mais tarde, recebes um link de entrada por email."
   E disponibilizar um CTA "Enviar-me link de acesso" que dispara `supabase.auth.signInWithOtp({ email, emailRedirectTo: "/app/reports" })`.

### Por que NÃO um token custom em `/reports/access/:token`
- Reinventa magic link com mais superfície de ataque (storage, expiração, single-use, hashing — tudo o que o Supabase já faz).
- Cria uma segunda fonte de verdade de identidade (token vs auth.users), o que parte o trigger `handle_new_user` e a RLS por `user_id`.
- Mais código e mais testes para entregar a mesma UX.

### Decisões a confirmar antes de avançar

1. **Aceitas reutilizar `/app/reports` como área pessoal** (em vez de criar `/my-reports`)?
2. **Aceitas adoptar Supabase magic link** como modelo de acesso sem password? (Implica enviar email — precisaria de prompt explícito separado, dado o constraint "Do not send emails in this prompt unless explicitly scoped".)
3. **Header copy**: muda-se "Relatórios — InstaBench" para "Os teus relatórios InstaBench"? Pequeno mas alinha com o pedido.

Se confirmares estas três, o próximo prompt fica reduzido a: ajustar copy + adicionar botão magic link no `/login` + adicionar CTA "enviar link" no success state do unlock modal. Sem nova área, sem novas tabelas, sem token custom.

### Riscos da abordagem proposta
- **Magic link exige email enviado**. Se ainda estamos em modo "no emails", podemos:
  - Fase A (este prompt, sem email): mostrar no success state "Cria conta com este email para acederes ao histórico" + link para `/signup` pré-preenchido. Trigger já liga os reports.
  - Fase B (prompt seguinte, com email scoped): adicionar magic link.
- Se o lead nunca fizer signup, o report continua acessível pelo URL público (`/analyze/<username>`) — comportamento atual mantém-se.

### Checkpoints (após confirmação)
☐ Confirmação das 3 decisões acima  
☐ Decisão Fase A vs Fase B (com ou sem email neste prompt)  
☐ Próximo prompt redigido em função das respostas
