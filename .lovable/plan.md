Plano para concluir e refinar o editor de emails em `/admin/automacoes`:

1. Ligar o botão “Editar” dos cartões do fluxo
- Em `AutomationNode`, trocar o botão desativado por um link real para `/admin/automacoes/templates/$key` quando existir `templateKey`.
- Manter “Bloqueado” para blocos de sistema/não editáveis.
- Manter “Configurar trigger” desativado para automações sem trigger, porque isso é outra funcionalidade.

2. Garantir navegação direta ao separador certo
- Ao voltar do editor, direcionar para `/admin/automacoes?tab=templates` ou preservar o contexto quando fizer sentido.
- Ajustar `AutomationFlowPage` para aceitar `?tab=templates` e abrir automaticamente o separador correto.

3. Refinar a lista de templates
- Remover comentário antigo “Edição não implementada”.
- Tornar o CTA “Editar” mais claro e consistente com o botão do fluxo.
- Se um template já tiver override, mostrar estado “Editado”/data quando os dados estiverem disponíveis sem criar nova tabela.

4. Validar o editor existente
- Rever `TemplateEditor` para garantir que carrega, pré-visualiza, guarda e repõe overrides via `/api/admin/email-templates/*`.
- Ajustar mensagens de erro para explicar sessão expirada/sem permissão, em vez de falhar silenciosamente.
- Não mexer nos ficheiros locked nem nos templates públicos fora do escopo.

5. Verificação
- Confirmar que o clique em “Editar” já navega para o editor.
- Confirmar que guardar chama `PUT /api/admin/email-templates/$key` e que o botão deixa de estar inativo depois de uma alteração.

☐ Botão “Editar” funcional nos cartões do fluxo
☐ Separador `templates` abrível por URL
☐ Editor com feedback de erro mais claro
☐ Lista de templates limpa e coerente
☐ Sem alterações a ficheiros locked