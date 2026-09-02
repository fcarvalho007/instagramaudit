# Conversion UX 10B — Qualificação anónima no loading + polish do email gate

Uma só pergunta ("Qual é a tua relação com @handle?"), integrada no loading, nunca bloqueante, e um ConversionSheet mais limpo e acessível. Sem novo onboarding multi-passo, sem gate de email antes do valor.

## Fluxo antes / depois

```text
ANTES
homepage → username → loading (só loader) → Auditoria Instantânea
        → gate email → ConversionSheet (email → pergunta de relação) → Estado B

DEPOIS
homepage → username → análise arranca já → loading
        └─ ≥3 s: pergunta opcional de relação (inline, "Agora não" sempre visível)
        → Auditoria Instantânea → gate email → ConversionSheet (só email)
        → Estado B (+ sync da relação, ou pergunta apenas se não houve oportunidade)
```

Loading < 3 s (cache hit): a pergunta nunca aparece; a qualificação é feita no ConversionSheet depois do email (estado C).
Loading > 3 s: a pergunta aparece; se o relatório ficar pronto durante a leitura/selecção, o relatório abre imediatamente e a pergunta desaparece.

## Componentes

Reutilizar:
- `AnalysisSkeleton` — passa a aceitar uma prop opcional `secondarySlot?: ReactNode` renderizada abaixo do rodapé. Neutro por omissão; `/reports/$snapshotId`, previews e dev routes ficam inalterados.
- `GridSelectField` (onboarding) — ganha uma variante `compact` (altura menor, 2 col mobile / 5 col desktop). Mantém radio semantics, teclado e focus-visible existentes.
- `PROFILE_RELATIONSHIPS` + labels PT/EN já existentes; endpoint `/api/public/report-relationship` sem alterações.

Novos (mínimos):
- `src/components/conversion/profile-relationship-field.tsx` — fonte única de opções + ícones sobre `GridSelectField`. Passa a ser usado tanto no loading como no ConversionSheet (substitui os botões manuais lá).
- `src/components/conversion/loading-qualification.tsx` — bloco secundário do loader (label "Enquanto analisamos…", pergunta, campo, "Agora não").
- `src/lib/leads/qualification-session.ts` — leitura/escrita do estado em sessão.

## Persistência em sessão (sem BD, sem cookie, sem lead)

Chave: `auditprofiles:qualification:v1:<handle normalizado>` em `sessionStorage`.

```json
{ "question_id": "profile_relationship_v1", "handle": "pingodoce",
  "status": "answered" | "skipped", "relationship": "competitor",
  "timestamp": 1756800000000, "version": 1 }
```

Estado `not_shown` = ausência de chave. Nada é gravado antes do email.

## Timing e regras no loader

- Elegível só após ~3 s de loading contínuo; nunca reinicia nem altera fases; não prolonga o loading.
- Desmonta assim que o relatório fica ready; a resposta nunca é esperada.
- Uma vez por handle por sessão; "Agora não" respeitado durante toda a experiência.

## Handoff para o ConversionSheet

- A — `answered`: sem pergunta. Após email → `lead-capture` devolve `cache_key` + `grant` → POST `/api/public/report-relationship` com a relação guardada (`relationship_source = user_declared`, inalterado). Só confirmação/unlock no estado done.
- B — `skipped`: sem pergunta, só confirmação.
- C — `not_shown`: mantém a pergunta actual pós-email, agora com `ProfileRelationshipField`.
- Falha do POST: fail-soft, sem erro alarmante; marcado `pending` em sessão para retry idempotente.

## Polish do ConversionSheet

- CTA passa a `Button` do design system (mesmo tamanho/hierarquia).
- `aria-describedby` (ajuda + erro), `aria-invalid`, `aria-busy` na submissão, anúncio do estado done e foco movido para o conteúdo relevante em desktop.
- Foco automático no email só em desktop; no Sheet mobile sem autofocus.
- Benefício explícito em lista curta: publicações completas · mix de formatos · análise das conversas (nada de Pro).
- Microcopy separa serviço de marketing: "Sem pagamento. O marketing é opcional." Checkbox continua opcional e não pré-seleccionada.
- Email nunca guardado em localStorage/sessionStorage/cookie.

## Analytics

Reutiliza o pipeline anónimo. Novos eventos na allowlist (cliente + `funnel-event`), com dedupe por handle:
`qualification_prompt_viewed`, `qualification_answered`, `qualification_skipped`.
Metadata mínima: `question_id`, e `relationship` apenas quando respondido. Sem email, sem fingerprint, sem identificadores novos.

## Testes

Loading: não aparece antes do delay; aparece depois; cache hit não bloqueia; um clique responde; skip; escopo por handle; nova montagem respeita a sessão.
ConversionSheet: answered/skipped não repetem; not_shown mantém pergunta; relação enviada só após `cache_key`/`grant`; falha não bloqueia unlock; marketing false por omissão; descrição/invalid/busy do input.
Regressão: Estados A/B iguais; `OnboardingModal` e checkout intactos.

## QA visual

Loader sem e com pergunta, opção seleccionada, 375/390 e 1280/1440; ConversionSheet form e done (com e sem resposta prévia). Verificação explícita da altura do loader em ecrãs pequenos.

## Fora de âmbito e dívida

- Report UX 09.1 intacto: cards, gates, ordem A/B/C, sidebar, Pro, checkout, cálculos.
- `OnboardingModal` e schema legacy inalterados.
- CHECKOUT QUALIFICATION TAXONOMY DEBT: divergência `mine/my_brand/client/competitor` vs `PROFILE_RELATIONSHIPS` fica documentada, sem alteração.
- CROSS-SESSION FREQUENCY CAP: NOT IMPLEMENTED. Recomendação: só após confirmar que o banner de cookies cobre armazenamento funcional; caminho apropriado é uma chave `localStorage` funcional com TTL (ex. 90 dias) declarada na política, e não cookie de tracking nem identificador persistente.

Confirmações: NO PRE-VALUE EMAIL GATE · NO PASSWORD IN PUBLIC FLOW · NO LOADING BLOCK · NO DUPLICATE RELATIONSHIP QUESTION · NO CROSS-SESSION TRACKING ADDED
