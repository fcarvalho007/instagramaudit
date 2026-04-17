

## Entendimento

**1. Fluxo público atual**: hero (`/`) → input do username → `/analyze/$username` → `<PublicAnalysisDashboard>` (métricas + benchmark + concorrentes) → camada de conversão pós-análise → `<PremiumLockedSection>` → `<ReportGateModal>`. Após o gate, pipeline automático gera PDF e envia por email.

**2. Captura de leads / pedido de relatório**: `<ReportGateModal>` recolhe **nome (obrigatório)**, **email (obrigatório)**, **empresa (opcional)** + checkbox RGPD. Submete para `/api/request-full-report` que faz upsert em `leads` e cria `report_requests` ligado ao `analysis_snapshot_id`. Quota servida pelo servidor (2 grátis/mês por lead).

**3. Supabase / storage / email / pagamentos**:
   - **Postgres**: tabelas `leads` (email, email_normalized, name, company, source), `report_requests` (lead_id, instagram_username, competitor_usernames, snapshot_id, status fields), `analysis_snapshots` (cache 24h de dados Apify normalizados).
   - **Storage**: bucket privado `report-pdfs` com PDFs + signed URLs 7 dias.
   - **Apify**: scrape de perfis públicos do Instagram (token em secret).
   - **Resend**: envio dos PDFs por email.
   - **EuPago**: **ainda não integrado** (paywall mostra "Em breve"). Não deve aparecer em política como ativo hoje.
   - **Lovable AI Gateway / Anthropic**: insights estratégicos no PDF.

**4. Onde se processam dados pessoais**:
   - Email + nome + empresa opcional via gate modal → `leads` (persistente).
   - Email associado ao envio de PDF via Resend (transactional).
   - **Username analisado** = dado público de terceiro, não do utilizador autenticado.
   - Cookies essenciais: sessão admin httpOnly (`/admin`), sidebar UI state. **Sem analytics/tracking de marketing** (verificado: zero gtag, posthog, plausible, mixpanel).

**5. Porquê esta camada agora**: o produto recolhe email + nome + empresa de utilizadores reais, processa-os via Supabase + Resend, mostra "RGPD compliant" no hero/footer, mas **não tem página de privacidade nem termos**. Os links no rodapé apontam para `/privacidade` e `/termos` que **dão 404**. Antes de qualquer empurrão de tráfego, é preciso credibilizar a base legal — caso contrário expõe-se a risco regulatório (CNPD) e quebra a confiança quando alguém clica em "Privacidade" e cai num 404.

---

## Auditoria de tracking / cookies (resultado)

| Mecanismo | Estado | Necessita banner? |
|---|---|---|
| Google Analytics / GA4 | ❌ não existe | — |
| Posthog / Mixpanel / Plausible | ❌ não existe | — |
| Cookies de marketing | ❌ nenhum | — |
| Cookie sessão admin (httpOnly, `/admin`) | ✅ essencial | Não (estritamente necessário) |
| Cookie sidebar UI (`sidebar_state`) | ✅ funcional não-essencial mas trivial | Não obrigatório (preferência UI) |
| localStorage / sessionStorage marketing | ❌ não existe | — |

**Conclusão**: **não é necessário banner de cookies** neste momento. Basta uma secção "Cookies" dentro da Política de Privacidade a explicar honestamente que só se usam cookies essenciais (sessão admin) e uma preferência funcional (sidebar). Quando se adicionar analytics, aí sim, será preciso banner com consent.

---

## Decisões-chave

1. **2 páginas legais novas**: `/privacidade` e `/termos` em pt-PT, escritas para refletir **exatamente** o que o produto faz hoje (sem inventar EuPago ativo, sem prometer self-service de exportação).

2. **Footer está locked** mas **já tem os links corretos** para `/privacidade` e `/termos` na coluna "Empresa". **Não toco no footer.** Os links `/rgpd`, `/cookies`, `/seguranca`, `/sobre`, `/contacto` no footer continuam a 404 — flag para próximo prompt, fora do âmbito.

3. **Componente partilhado `<LegalLayout>`** com header tipográfico editorial, prose styling consistente, índice lateral em desktop. Reutilizado pelas duas páginas.

4. **Gate modal — refinar copy de consent** (não está locked):
   - Atual: "Aceito receber o relatório por email e a política de privacidade." — vago, sem link.
   - Novo: "Aceito o tratamento dos dados (nome, email) para envio do relatório, conforme a [Política de Privacidade](/privacidade)." — link explícito que abre em nova aba, wording impessoal.

5. **Disclaimer de não-afiliação Meta/Instagram** já existe no `report-footer.tsx` ("Não afiliado com Meta"). Adiciono também:
   - Linha discreta dentro das páginas legais.
   - Linha mono pequena no `<AnalysisHeader>` ou rodapé do dashboard de análise (a confirmar onde encaixa melhor sem poluir).
   - **Não toco no footer locked** que poderia ser o sítio óbvio — mencionado como follow-up.

6. **Contacto privacidade**: email `privacidade@instabench.pt` (placeholder real, registável no domínio próprio). Visível nas duas páginas legais. Sem formulário.

7. **Conteúdo legal — o que vou escrever honestamente**:
   - **Responsável**: nome a confirmar (pergunta abaixo) ou placeholder "InstaBench (operado por [a definir])".
   - **Dados recolhidos**: nome, email, empresa opcional, username analisado, snapshot dos dados públicos do Instagram, registos técnicos (IP, user-agent) ao chamar APIs.
   - **Finalidades**: gerar e entregar o relatório, controlo de quota mensal, comunicação operacional sobre o pedido.
   - **Bases legais**: execução do serviço pedido (Art. 6(1)(b) RGPD); interesse legítimo para prevenção de abuso (quota).
   - **Subcontratantes**: Supabase (UE), Resend (EUA — DPF), Apify (UE/EUA), Lovable Cloud (UE), Anthropic via Lovable Gateway. Cloudflare como CDN/runtime.
   - **Retenção**: leads e report_requests indefinidamente até pedido de eliminação; snapshots expiram em 24h; PDFs com signed URLs 7d.
   - **Direitos RGPD**: acesso, retificação, eliminação, portabilidade, oposição — exercidos por email.
   - **Transferências internacionais**: para fora UE (Resend, Apify) com base em DPF/SCC.
   - **Cookies**: secção curta a esclarecer só essenciais.

8. **Termos — o que vou escrever**:
   - Descrição do serviço (análise de perfis públicos, relatórios PDF).
   - Aceitação ao usar.
   - Uso aceitável (não scrape massivo, não tentativa de aceder a perfis privados, não revenda do PDF como se fosse próprio).
   - Quotas e gratuitidade atual.
   - Pagamentos: secção curta a dizer que pagamentos one-time/subscrições serão regulados em adenda quando ativos (não inventar EuPago hoje).
   - Limitação de responsabilidade calma — dados do Instagram podem mudar/falhar, recomendações são orientadoras.
   - Propriedade intelectual: relatório fica licenciado ao utilizador para uso interno.
   - Disponibilidade: "best effort", sem SLA.
   - Lei aplicável: portuguesa. Foro: comarca de Lisboa.
   - Alterações aos termos com data de última atualização.

9. **Sem novas dependências, sem novo schema, sem novos endpoints, sem CMP, sem cookie banner.**

---

## Ficheiros

**Novos (3):**
- `src/components/legal/legal-layout.tsx` — wrapper editorial partilhado (header serif + meta data + prose container + nota de não-afiliação no fim)
- `src/routes/privacidade.tsx` — Política de Privacidade pt-PT, head com title/description/noindex parcial (deixar indexável para credibilidade)
- `src/routes/termos.tsx` — Termos e Condições pt-PT

**Editados (1):**
- `src/components/product/report-gate-modal.tsx` — refinar texto da checkbox RGPD com link real para `/privacidade` (target="_blank", rel="noopener"), sem alterar UX de validação

**Locked files**: 
- `LOCKED_FILES.md`: footer já aponta para `/privacidade` e `/termos` ✅. Não toco em footer.
- `report-gate-modal.tsx`: **não está locked** ✅.
- Adiciono os 3 novos ficheiros à lista de locked files no fim, em nova secção "Legal/Compliance (Sprint 1, Prompt 1.X)".

---

## Mapa de cobertura por exigência do prompt

| Requisito | Onde fica resolvido |
|---|---|
| Página `/privacidade` em pt-PT | Nova route |
| Página `/termos` em pt-PT | Nova route |
| Footer com links legais | ✅ já existe (footer locked) |
| Disclaimer não-afiliação Meta | Dentro das duas páginas + já presente no report-footer |
| Consent no gate com link à política | Edição cirúrgica do modal |
| Providers reais refletidos | Supabase, Resend, Apify, Lovable AI, Cloudflare na política |
| Auditoria cookies/tracking | Feita acima — sem banner necessário |
| Contacto privacidade | Email visível nas páginas legais |

---

## Pergunta pendente (não bloqueante — posso usar placeholders)

**Identidade do responsável pelo tratamento**: o domínio é `instabench.pt`. Como deve aparecer na política?
- (A) "InstaBench, operado por [Nome / NIF a definir]" (placeholder honesto, fácil de substituir depois)
- (B) Nome real do responsável (se já tiveres, partilha no próximo prompt)
- (C) Apenas "InstaBench" com email de contacto e adicionar dados completos numa revisão posterior

Sem resposta, avanço com (A) — coloco marcador `[Nome do responsável · NIF · morada]` em duas linhas claramente identificadas para edição manual posterior.

---

## Validação dos guardrails

| Guardrail | Estado |
|---|---|
| Sem certeza legal falsa — texto é trabalho honesto, não substitui revisor jurídico | ✅ aviso explícito no fim das páginas |
| Sem redesign landing/análise | ✅ |
| Sem GDPR self-service completo | ✅ só email de contacto |
| Sem CMP / cookie banner pesado | ✅ auditoria mostra que não é preciso |
| Sem novas libs | ✅ |
| Sem secrets hardcoded | ✅ |
| Locked files intactos | ✅ footer não tocado |
| Copy pt-PT pós-1990, impessoal | ✅ |
| Mobile 375px | ✅ prose responsivo |
| Sem afirmações inventadas (EuPago ativo, self-service GDPR, etc.) | ✅ |

---

## Checkpoints

- ☐ `<LegalLayout>` criado com header editorial + prose + nota de não-afiliação
- ☐ `/privacidade` criada em pt-PT, refletindo Supabase/Resend/Apify/Lovable/Cloudflare reais
- ☐ `/termos` criada em pt-PT, refletindo MVP atual (sem fingir EuPago ativo)
- ☐ Disclaimer de não-afiliação Meta/Instagram presente nas duas páginas
- ☐ `<ReportGateModal>` consent reescrito com link real para `/privacidade`
- ☐ Email de contacto `privacidade@instabench.pt` visível nas páginas legais
- ☐ Secção "Cookies" honesta (só essenciais) dentro da política — sem banner
- ☐ Aviso final em ambas as páginas: "Este texto não substitui aconselhamento jurídico formal"
- ☐ Footer locked não tocado — links `/privacidade` e `/termos` deixam de dar 404
- ☐ `LOCKED_FILES.md` atualizado com nova secção
- ☐ Zero novas dependências, zero schema, zero endpoints
- ☐ Mobile 375px validado

