## Diagnóstico

Os 7 templates foram reescritos com sucesso, mas a suite de testes ficou desatualizada e quebraria no próximo run de CI. Há duas suites afetadas:

### `src/lib/email/__tests__/templates.test.ts`
Falha em ~10 asserções porque referem copy antigo:

| Linha | Asserção atual | Estado novo |
|---|---|---|
| 19 | `subject = "Recebemos o teu pedido beta do InstaBench"` | agora `"Recebemos o teu pedido para @frederico.m.carvalho"` |
| 22 | `text contém "revisto manualmente"` | removido |
| 51 | `subject = "O teu relatório InstaBench já está pronto"` | agora `"O teu relatório de @frederico.m.carvalho está disponível"` |
| 72 | `subject = "Podes dar feedback ao teu relatório InstaBench?"` | agora `"O relatório de @x foi útil?"` |
| 89 | `text contém "Quando tiveres oportunidade de consultar"` | agora `"Quando tiveres oportunidade de abrir"` |
| 90 | `not contém "Notámos que já consultaste"` | sub. por `"Vimos que já abriste"` |
| 109-110 | `subject = "Próximo passo para analisar..."` | agora `"Próximos passos para o relatório completo"` |
| 112-113 | `pricingOption: "Plano mensal"` rendido em texto | removido (commercial-followup já não usa pricingOption no copy) |
| 117-123 | mapeamento `single_3_eur → "Relatório único (€3 + IVA)"` | já não existe (PRICING_LABELS removido) |
| 129 | `not contém "mostraste interesse"` | continua válido (sem alteração necessária) |
| 147 | `html contém "Vamos rever manualmente"` | sub. por novo preheader `"A análise está a ser preparada — recebes o relatório por email."` |
| 150-158 | sign-off `"Frederico — InstaBench"` | agora `"— equipa InstaBench"` |
| 168 | `subject = "O teu relatório InstaBench foi guardado"` | agora `"O relatório foi guardado na tua área pessoal"` |
| 170 | preheader `"Podes voltar a consultá-lo sempre que precisares."` | agora `"Acede sempre que precisares."` |
| 175 | `text contém "Durante a beta, este acesso é gratuito."` | agora copy mais longo sobre acesso vitalício |
| 176 | `html contém "Abrir a minha área"` | agora `"Abrir área pessoal"` |

### `src/lib/email/__tests__/report-summary.test.ts`
Falha porque a estrutura mudou de KPIs grid + top post HTML para 3 conclusões em texto:

| Linha | Asserção atual | Estado novo |
|---|---|---|
| 28 | preheader `"Os principais sinais do teu relatório InstaBench."` | agora `"As 3 conclusões principais em 60 segundos."` |
| 31-38 | grelha de 4 KPIs no HTML | já não renderizada — só aparecem inseridas em frases |
| 49-53 | gradient fallback `linear-gradient(...)` quando sem thumbnail | bloco do top-post foi removido |
| 55-61 | anchor do permalink no HTML | bloco removido |

## Alterações

### 1. `src/lib/email/__tests__/templates.test.ts`
- Atualizar cada subject/preheader literal para o novo copy.
- Substituir asserções sobre `"revisto manualmente"`, `"Frederico — InstaBench"`, `"Notámos que já consultaste"`, `"Abrir a minha área"`, `"Durante a beta, este acesso é gratuito."` pelos novos textos.
- Remover o bloco `describe("renderCommercialFollowup")` que testa `PRICING_LABELS` (`single_3_eur` → label) e o teste `"includes pricingOption sentence"` — substituir por:
  - teste que confirma novo subject/preheader,
  - teste que confirma `checkoutUrl` rende botão `Desbloquear`,
  - teste que confirma fallback `mailto:` com `replyToEmail`,
  - teste que confirma menção a `"docentes"` no copy.
- Manter testes de escape HTML, fallback de greeting, e `throws` (não dependem de copy).
- O bloco final `"uses the Frederico — InstaBench sign-off"` passa a `"uses the equipa InstaBench sign-off"` e verifica `"— equipa InstaBench"`.

### 2. `src/lib/email/__tests__/report-summary.test.ts`
- Atualizar preheader esperado.
- Remover testes da grelha KPI / gradient / anchor permalink (HTML já não os tem).
- Adicionar testes que validam:
  - 3 conclusões numeradas no texto (`1. `, `2. `, `3. `),
  - menção a `@frederico.m.carvalho`, `12 480` (ou variante NBSP), `Carrosséis`, `Reel`, `+1,2 pp`,
  - presença do botão `Ver relatório completo` e do `reportUrl`,
  - escape HTML do handle continua válido.

### 3. Verificação
- Correr `bunx vitest run src/lib/email/__tests__/templates.test.ts src/lib/email/__tests__/report-summary.test.ts` e confirmar verde.
- `rg "Frederico" src/lib/email/__tests__/` deve só devolver `BREVO_FROM_NAME` e `firstName: "Frederico"` (legítimos), nunca asserção de assinatura.

## Out of scope
- Não tocar em `lead-magnet-sequence.test.ts`, `transactional-email.test.ts`, `build-report-summary-data.test.ts` (não dependem do copy alterado).
- Não alterar registry nem callers — interfaces dos templates mantêm-se compatíveis.
- Não alterar `BREVO_FROM_NAME = "Frederico Carvalho"` (é o sender do provedor, não a assinatura visual).
