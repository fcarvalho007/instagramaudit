## Avaliação final — fase Brevo contact sync

| Fase do prompt original | Estado |
|---|---|
| 1. Secrets `BREVO_API_KEY`, `BREVO_LEAD_MAGNET_LIST_ID=16`, `BREVO_FROM_EMAIL`, `BREVO_FROM_NAME` | ✅ presentes |
| 2. Helpers `client.server.ts` / `contacts.server.ts` / `sync.server.ts` / `types.ts` | ✅ existem |
| 3. `syncLeadToBrevo(leadId, reason)` | ✅ |
| 4. Chamada fire-and-forget no unlock (`unlock.server.ts:494-501`) | ✅ |
| 5. Payload com 11 atributos, `listIds:[16]`, `updateEnabled:true` | ✅ (após fix `goal→purpose`) |
| 6. Best-effort + eventos `brevo_contact_synced` / `brevo_contact_sync_failed` | ✅ |
| Bug `goal` vs coluna real `purpose` | ✅ corrigido |
| Testes unitários | ✅ 5/5 passam |
| `bunx tsc --noEmit` | ✅ |

**Tudo o que o prompt pediu está concluído.** Não há refinamentos de código pendentes.

## Único ponto que não consegui validar automaticamente

O endpoint `GET /v3/contacts/attributes` do gateway Brevo devolve `not_found` — o gateway só expõe `POST /v3/contacts` (o necessário para sync). Não consegui listar os atributos da conta para confirmar que `GOAL`, `PROFILE_OWNERSHIP`, `INSTAGRAM_HANDLE`, etc. existem com esse nome exato.

Comportamento real do Brevo: se um atributo não existe, ele é **criado automaticamente** no primeiro upsert (com tipo inferido). Logo, mesmo que algum nome esteja diferente do que tens na UI, a chamada não falha — apenas cria um atributo novo. Risco: ficares com `GOAL` (atributo antigo) e `GOAL` novo duplicado, ou com casing inconsistente.

## Validação manual recomendada (1 min, faz tu)

1. Faz unlock de teste em produção com um email novo.
2. Abre Brevo → Contacts → procura o email.
3. Confirma:
   - Está na lista **Lead Magnet Gratuito (ID 16)**.
   - Os 11 atributos aparecem preenchidos com os nomes esperados.
4. Em Lovable → admin → product_events: confirma evento `brevo_contact_synced`.

Se algum atributo aparecer com nome diferente, abrimos um pequeno follow-up para renomear no código.

## Próximas fases (fora do scope deste prompt)

Quando quiseres avançar, candidatos naturais:
- **Sync de cliente pago** → mover contact para lista 17 (`Clientes Pagos`) + `IS_CUSTOMER: true`. Já existe `customer-sync.server.ts` esqueleto — falta wiring quando houver pagamento.
- **Sync de intenção alta** → lista 18, regras de qualificação a definir (ex.: 2+ relatórios + `pricing_preference` alto).
- **Envio transacional via Brevo** (substituir Resend) — fase explicitamente excluída deste prompt.

## Conclusão

Fase Brevo contact sync **encerrada**. Sem ações de código a fazer agora. Aguardo decisão sobre a validação manual e qual a próxima fase a abrir.