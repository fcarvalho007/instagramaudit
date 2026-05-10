## Avaliação do estado actual do lead magnet

### O que está bem
- API `POST /api/public/report-unlock` funcional, persistência em `leads` + `report_requests`, anti-duplicação por email.
- Modal multi-step com Zod, validação por passo, success state com CTA "Ver relatório".
- Persistência da unlock em `sessionStorage` (`ib_unlock:<snapshotId>`) e toggle imediato de `setUnlocked(true)`.

### O que falta / bugs detectados

1. **Título não está em Fraunces** — o componente usa `className="font-fraunces"` mas em Tailwind v4 o token só está exposto como `--font-display` (linha 80 de `styles.css`). Não existe utility `font-fraunces`, logo cai para a fonte herdada (Inter). Por isso o título aparece sem serifa. Solução: trocar para `font-display`.

2. **Sincronização Brevo NÃO ligada ao unlock** — `unlock.server.ts` não dispara nenhum sync Brevo (zero referências). Faz parte da Fase 1 do plano Brevo, mas hoje quem desbloqueia entra em `leads` mas **não** entra na lista "Lead Magnet Gratuito" da Brevo nem recebe email de boas-vindas. É a maior peça em falta para "concluir" o lead magnet.

3. **Sem confirmação visual de que a área desbloqueou** — após sucesso, `setUnlocked(true)` é chamado mas o utilizador continua a ver o modal de sucesso. Quando fecha, o report já está desbloqueado mas sem qualquer scroll/animação para mostrar isso. Pode dar a sensação de "não desbloqueou".

4. **Sem email de confirmação** — não é enviado nenhum email transacional após o unlock (link para guardar, sumário, etc.). Tem de ser a Fase 1 do Brevo.

5. **Pergunta de pricing mal calibrada** — pergunta "por mês" quando o utilizador ainda nem sabe o que vai receber. Confirma a tua intuição.

---

## Sobre mover a pergunta de pricing para depois

**Concordo plenamente.** Pedir preço a alguém que ainda não viu o produto produz dados ruidosos: respostas de ancoragem ("só uso se for grátis") por desconhecimento, não por preferência real.

**Proposta:** retirar a pergunta do unlock e disparar um *micro-survey contextual* assim que o utilizador atinge um marco de engagement claro:

- 70% de scroll do report **OU**
- click em "Exportar PDF" **OU**
- 90 segundos no report

…o que ocorrer primeiro. Aparece como sheet inferior (não bloqueante), uma só pergunta, ignorável. Liga-se ao `lead_id` já existente e atualiza `leads.pricing_preference` via endpoint dedicado. Isto fica como **Fase 2** (depois de fechar o que está em falta agora).

Resultado prático: o unlock fica com **4 passos** em vez de 5 (mais conversão), e a pricing question chega num momento em que a resposta tem valor.

---

## Plano de execução (ordenado por prioridade)

### A. Correcções imediatas no modal (esta iteração)

**Ficheiros:** `src/components/product/unlock-modal.tsx`, `src/lib/unlock-flow.ts`, eventualmente `src/components/ui/dialog.tsx` apenas se necessário (não vamos tocar se não for).

1. **Tipografia do título** — trocar `font-fraunces` → `font-display` em ambas as `DialogTitle` (passo principal + success state). Acrescentar `tracking-[-0.01em]` para densidade editorial.

2. **Refinamento elegante do modal (design system)**
   - `DialogContent`: passar de `sm:max-w-md` → `sm:max-w-[460px]`, adicionar `p-0` e wrapper interno com `px-6 py-7 sm:px-7 sm:py-8` para respiro vertical maior.
   - Cabeçalho: eyebrow `PASSO X DE Y` em `text-eyebrow-sm text-content-tertiary` (mais discreto), título Fraunces 28px (`text-[28px] sm:text-[30px] leading-[1.1]`), descrição em `text-[13px] text-content-secondary` com separador subtil `border-b border-border-default/40 pb-5` em vez da progress bar grossa.
   - Progress bar: passar a 2px de altura, cor `bg-primary/15` com fill `bg-primary`, `mt-1`.
   - Cards de radio: bordas `border-border-default/60`, raio `rounded-xl`, padding `px-4 py-3.5`, hover `bg-surface-muted/40`, selected com `border-primary bg-primary/[0.04] shadow-[0_0_0_1px_var(--color-primary)/0.15]`. Substituir o `<input type="radio">` nativo por um indicador desenhado (anel + ponto) para alinhar com Iconosquare.
   - Botões: "Voltar" como `variant="outline"` com seta menor; CTA principal `bg-primary text-white` com micro-radius `rounded-lg`, peso `font-medium`, sem maiúsculas.
   - Footer: usar `gap-3` e separador subtil `border-t border-border-default/40 pt-5` antes do bloco de botões.
   - Aviso "Sem spam": passar de bloco com fundo para uma única linha com ícone de cadeado pequeno (`Lock`), `text-[12px] text-content-tertiary`, sem caixa.
   - Success state: ícone numa moldura quadrada com cantos arredondados (`size-12 rounded-2xl bg-primary/10`), título Fraunces, lista de 2-3 next-steps em vez de só um CTA.
   - Garantir que tudo usa apenas tokens semânticos (`text-content-*`, `bg-surface-*`, `border-border-*`, `text-primary`) — zero hex.

3. **Nova pergunta + opções (mantém-se no passo 5 nesta iteração; será removida na fase B)**
   - Enunciado: **"Quanto pagarias por um relatório completo (uso único)?"**
   - Opções (alteração de `PRICING_PREFERENCES` em `src/lib/unlock-flow.ts`):
     - `under_3` → "Até 3 € por relatório"
     - `under_9` → "Até 9 € por relatório"
     - `under_19` → "Até 19 € por relatório"
     - `free_only` → "Só uso se for gratuito (mesmo para ver concorrência)"
     - `not_sure` → "Ainda não sei"
   - Coluna `leads.pricing_preference` é `text` sem CHECK, logo **não exige migration**. Os tests `unlock-flow.test.ts` e `unlock-schema.test.ts` precisam de actualização das constantes.
   - O agregador de admin (`src/lib/admin/feedback-intent.ts`) tem mapeamento por chaves antigas — actualizar para reconhecer as novas chaves (`under_3` = baixo, `under_9` = médio, `under_19` = alto).

4. **Confirmação visual pós-unlock** — quando o modal fecha em sucesso, fazer `scrollIntoView` suave para o primeiro bloco previamente bloqueado, com um flash subtil (`outline-2 outline-primary/40 outline-offset-4` durante 1.2s). Implementação em `analyze.$username.tsx` no callback `onUnlock`.

### B. Reformular timing da pergunta de pricing (próxima iteração — fora deste prompt)

- Remover passo 5 do unlock (passa a 4 passos).
- Criar `<PricingFeedbackSheet>` que monta no `analyze.$username.tsx` e dispara em scroll≥70% OU `onExportPdf` OU 90s.
- Endpoint `PATCH /api/public/leads/:id/pricing-preference` ou reutilizar `feedback.$requestId`.
- Persistir flag em `sessionStorage` para não voltar a perguntar.

### C. Ligação à Brevo (Fase 1 do plano Brevo já aprovado — fora deste prompt)

- Em `unlock.server.ts`, depois do `INSERT/UPDATE` do lead, chamar `brevoUpsertContact()` + `brevoAddToList(BREVO_LEAD_MAGNET_LIST_ID)`.
- Mapeamento de atributos: `EMAIL`, `INSTAGRAM_USERNAME`, `GOAL`, `USER_TYPE`, `PRICING_PREFERENCE`, `SOURCE=lead_magnet`.
- Try/catch com log em `provider_call_logs`; falha de Brevo não pode bloquear o unlock.
- Email de boas-vindas via template Brevo (template criado no painel).

---

## Checkpoint desta iteração (☐)

- ☐ `font-fraunces` → `font-display` no `unlock-modal.tsx` (título + success)
- ☐ Refinamento estético do modal (paddings, radii, radio cards desenhados, footer)
- ☐ Aviso "Sem spam" simplificado
- ☐ Success state com lista de next-steps
- ☐ Constantes `PRICING_PREFERENCES` + labels actualizadas em `unlock-flow.ts`
- ☐ Pergunta do passo 5 reformulada para "uso único"
- ☐ `feedback-intent.ts` actualizado para as novas chaves
- ☐ Tests `unlock-flow.test.ts` e `unlock-schema.test.ts` actualizados
- ☐ Scroll + flash no bloco desbloqueado em `analyze.$username.tsx`
- ☐ Verificação visual em viewport 375px (`browser--screenshot` no modal)

## Fora deste prompt (próximas fases)
- ☐ Mover pricing para survey contextual pós-engagement (Fase B)
- ☐ Sync Brevo + email de boas-vindas no unlock (Fase Brevo 1)
