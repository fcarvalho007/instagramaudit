# Auditoria de Privacidade & Consent — Beta Externa

## 1. O que existe hoje

**Unlock modal** (`src/components/product/unlock-modal.tsx`)
- 5 passos. Eyebrow "PASSO X DE 5". Subtítulo passo 1 menciona "Acesso gratuito durante a beta" ✅
- Checkbox `gdpr_consent` **obrigatório**: "Aceito o tratamento dos meus dados … li a política de privacidade". Liga a `/termos` (errado, devia ligar a `/privacidade` na frase "tratamento") e a `/privacidade` ✅
- Checkbox `marketing_consent` **opcional**: "Quero receber análises e dicas de marketing digital por email (cancelas quando quiseres · ~1 email/semana)" ✅
- Footer passo 1: "Operador: {nome} · {cidade} · NIF {nif} · Sem spam." ✅

**Política de privacidade** (`/privacidade`)
- Bem estruturada, RGPD-compliant na forma. Lista subcontratantes, transferências, retenção, direitos.
- ⚠️ **Subcontratantes desatualizados**: lista só **Supabase, Lovable Cloud, Cloudflare, Apify, Resend**. Faltam: **Brevo** (contact sync + transacional primário), **OpenAI** (insights), **DataForSEO** (keywords).
- ⚠️ Diz "Não é efetuado envio de comunicações de marketing … sem consentimento expresso e separado" — alinhado com o checkbox marketing, mas a sequência lead-magnet (welcome-beta + report-summary) está atualmente a sair sempre, não condicionada ao `marketing_consent`. **Inconsistência entre o que se promete e o que se executa.**
- ⚠️ Não menciona o estatuto **beta/piloto**.

**Termos** (`/termos`) — existe.

**Footers de email** (`src/lib/email/shared.ts::wrapHtml`)
- Footer único: `"InstaBench · Análise competitiva para Instagram"`
- ❌ **Sem identificação do operador (nome legal, NIF, morada).** RGPD/Lei 7/2004 exigem identificação em emails comerciais.
- ❌ **Sem link de cancelamento ("preferências de email").** Aplica-se mesmo a transacionais quando há sequência de marketing.
- ❌ **Sem link para política de privacidade.**
- ❌ Não distingue "transacional" vs "lead-magnet". `welcome-beta` e `report-summary` são lead-magnet (consent-based) e por lei **têm de ter unsubscribe**.

**Tracking de eventos** (`product_events`)
- Nenhuma menção na política à recolha de eventos de uso (`page_view`, `report_viewed`, `unlock_started`, etc.). Cair-se na cláusula "registos técnicos … segurança e diagnóstico" é debatível para tracking de funil.

**Brevo sync**
- `BREVO_LEAD_MAGNET_LIST_ID` adiciona contacto à lista mesmo sem `marketing_consent` claro — confirmar lógica.

## 2. Gaps por categoria

### P0 (bloqueiam beta externa)

1. **Subcontratantes Brevo / OpenAI / DataForSEO ausentes da política.** Risco RGPD direto.
2. **Sem unsubscribe nem identificação do operador no footer dos emails.** Bloqueador legal para `welcome-beta` e `report-summary` (lead-magnet).
3. **Sequência lead-magnet ignora `marketing_consent`.** Promessa partida.
4. **Tracking de produto não mencionado na política.**

### P1 (corrigir antes de divulgar)

5. **Aviso explícito "estás a entrar numa beta privada"** no unlock e no welcome (já existe em `welcome-beta`, falta no modal e no relatório).
6. **Link errado no checkbox obrigatório**: "tratamento dos meus dados" aponta para `/termos` em vez de `/privacidade` (linha 785).
7. **Política refere apenas "Resend" como envio**: atualizar para "Brevo (primário) + Resend (fallback)".
8. **Inconsistência menor**: política diz "PDF para o email", mas atualmente envia link ao relatório online.

### P2 (refinamento)

9. Frase "Sem spam" no footer do modal — substituir por "Cancela quando quiseres" para não soar a promessa absoluta enquanto enviamos sequência.
10. `report-ready` e `report-summary` deviam ter linha "Recebes este email porque desbloqueaste @{handle}. Cancelar emails: {link}".

## 3. Sugestões de copy pt-PT (para aprovar antes de implementar)

**Footer email (substitui o atual)**
```
InstaBench · Análise competitiva para Instagram
Operado por {Nome Operador}, NIF {NIF}, {Morada}.
Recebes este email porque desbloqueaste uma análise no InstaBench.
Política de privacidade · Cancelar emails de novidades
```
- Para emails puramente transacionais (`report-ready`, `personal-area-saved`, `request-received`, `feedback-request`): linha de cancelamento omitida; "Recebes este email porque pediste …".
- Para lead-magnet (`welcome-beta`, `report-summary`, `commercial-followup`): linha de cancelamento obrigatória.

**Modal — checkbox obrigatório (correção mínima)**
> Aceito o **tratamento dos meus dados** [link → /privacidade] para guardar e aceder a este relatório, e li a **política de privacidade** [link → /privacidade].

**Modal — passo 1 subtítulo (adicionar nota beta)**
> Continuam premium: Conteúdo · Procura · Comparação. **Acesso gratuito durante a beta privada — podemos contactar-te para feedback.**

**Política — secção 4 (subcontratantes), adicionar:**
- **Brevo** — envio de email transacional e gestão de lista de contactos opt-in (UE).
- **OpenAI** — geração de insights textuais a partir de dados agregados, sem PII (EUA, com salvaguardas RGPD).
- **DataForSEO** — pesquisa de tendências e termos relacionados (EUA).

**Política — secção 3 (finalidades), acrescentar:**
> **Comunicações de marketing por email** (newsletter, novidades de produto) — apenas mediante consentimento expresso opt-in marcado no momento do desbloqueio. Base legal: consentimento (Art.º 6.º, n.º 1, alínea a). O consentimento pode ser retirado a qualquer momento via link de cancelamento em cada email.

**Política — secção nova "Análise de utilização":**
> São registados eventos pseudonimizados de utilização do produto (páginas vistas, passos do unlock, secções abertas) para diagnóstico, deteção de abuso e melhoria do serviço. Base legal: interesse legítimo. Não são utilizados cookies de tracking publicitário nem partilhados com terceiros.

## 4. Mínimo recomendado antes de beta externa

Ordem sugerida (todos P0/P1, sem mexer em fluxo):

| # | Mudança | Ficheiros | Tipo |
|---|---|---|---|
| 1 | Adicionar Brevo, OpenAI, DataForSEO à secção 4 da política | `src/routes/privacidade.tsx` | copy |
| 2 | Adicionar parágrafo de tracking + finalidade marketing à política | `src/routes/privacidade.tsx` | copy |
| 3 | Footer dos emails com identificação operador + link política | `src/lib/email/shared.ts::wrapHtml` | template |
| 4 | Adicionar parâmetro `includeUnsubscribe` ao `wrapHtml` e ligar nos templates lead-magnet | `shared.ts` + `welcome-beta.ts` + `report-summary.ts` + `commercial-followup.ts` | template + rota `/email/cancelar` |
| 5 | Condicionar `sendLeadMagnetSequence` ao `marketing_consent` do lead | `lead-magnet-sequence.server.ts` + leitura do lead | lógica mínima |
| 6 | Corrigir link do checkbox obrigatório (linha 785) | `unlock-modal.tsx` | trivial |
| 7 | Subtítulo passo 1 do modal: nota "beta privada" | `unlock-modal.tsx` constantes (linhas 150-170) | trivial |

Itens 4 e 5 implicam infraestrutura nova (rota pública `/email/cancelar?token=…` + tabela de tokens ou query parametrizada). Pode ficar para sprint dedicado pós este audit; nesse caso os emails lead-magnet **não devem ser enviados na beta externa** — desligar via `LEAD_MAGNET_EMAIL_SEQUENCE_ENABLED="false"` (kill switch já existe) até o unsubscribe estar pronto.

## 5. Próximo prompt sugerido (após aprovação deste audit)

> "Aplica os itens 1, 2, 6 e 7 da auditoria de privacidade: atualiza `src/routes/privacidade.tsx` para incluir Brevo/OpenAI/DataForSEO em subcontratantes, adiciona finalidade 'marketing por consentimento' e parágrafo sobre tracking de eventos pseudonimizados; corrige o link do checkbox obrigatório no `unlock-modal.tsx` (linha ~785) para `/privacidade`; adiciona ao subtítulo do passo 1 a nota 'beta privada — podemos contactar-te para feedback'. Não implementes ainda o footer do email nem o unsubscribe — fica para prompt seguinte. Não toques em fluxo, só copy."
>
> E em paralelo: "Mantém `LEAD_MAGNET_EMAIL_SEQUENCE_ENABLED='false'` na beta externa até existir mecanismo de unsubscribe."

## Checkpoint

- ☐ Aprovar este audit
- ☐ Aprovar copy proposto (ou propor variantes)
- ☐ Decidir: implementar unsubscribe agora vs desligar lead-magnet via kill-switch
- ☐ Confirmar dados legais do operador (nome, NIF, morada) para footer
