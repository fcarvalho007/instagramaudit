## Auditoria UX/UI · Cockpit /admin

A base é sólida: tokens consistentes, tipografia editorial, dark-first coerente. Os refinamentos focam-se em **legibilidade operacional** e em criar uma leitura imediata de **"é seguro ativar o Apify?"** para um administrador não-técnico.

---

### Diagnóstico por área

#### 1. Header e contexto admin
- O header (`src/routes/admin.tsx`) já é self-contained — não há `<Header>` público nem CTA "Analisar agora" dentro de `/admin`. ✅ A queixa nos screenshots refere-se provavelmente ao `<AdminGate>` antes do login (que mostra fundo limpo, está OK) ou a uma rota pública. **Sem ação necessária aqui** — confirmo em validação.
- Falta um indicador discreto da identidade autenticada (email + dot verde) no header. Hoje o operador não vê com que conta entrou.

#### 2. Navegação por tabs
- A ordem actual é `Diagnóstico · Análises · Perfis · Custos · Alertas · Pedidos`. A ordem operacional natural antes de ativar o Apify é: **Diagnóstico → Custos → Alertas → Pedidos → Análises → Perfis** (primeiro saúde, depois acompanhamento). Reordenar tabs apenas se houver concordância — proposta opcional.
- As tabs não comunicam contagens. Adicionar **contador discreto** em `Alertas` (nº ativo, vermelho se >0) e `Pedidos` (nº pendente) torna a navegação accionável sem clicar.
- Ícones (lucide) por tab ajudam o reconhecimento mobile.

#### 3. Hierarquia de cards e espaçamento
- `StatCard` está bom, mas `KV` em diagnóstico tem o mesmo "peso visual" — perde-se a distinção entre "métrica importante" e "configuração". Sugestão: KV usa fundo `bg-surface-base` (mais discreto), StatCard mantém `bg-surface-elevated`.
- As `Section` em diagnóstico e custos não têm separador visual entre si. Adicionar um `<hr class="border-border-subtle/40" />` ou aumentar `space-y-6 → space-y-8` ajuda o scan vertical.
- Tabelas (`DataTable`) são compactas demais (`py-2.5`). Subir para `py-3` melhora densidade percebida; manter `min-w-[640px]`.

#### 4. Empty states
- O `EmptyState` actual diz "Sem dados" + título + descrição opcional. Falta: **call-to-action contextual** ou pelo menos uma sugestão de próximo passo.
- Exemplos a melhorar:
  - "Sem chamadas registadas." → "Sem chamadas registadas. Após ativar o Apify e correr a primeira análise, aparecerão aqui as últimas 50 chamadas."
  - "Sem alertas ativos." → manter, mas com ícone discreto (`ShieldCheck`) em verde para reforçar "tudo OK" em vez de "vazio".
  - "Sem snapshots." → idem com `Database` ou `Camera`.
- Adicionar slot opcional `icon?: ReactNode` ao `EmptyState`.

#### 5. Diagnóstico — readiness summary (P0)
**Falta o ponto mais crítico**: um cartão de topo que responda em 2 segundos a "posso ativar o Apify agora?". Proposta:

```text
┌─────────────────────────────────────────────────────┐
│ ● PRONTO PARA APIFY  /  ⚠ CONFIGURAÇÃO INCOMPLETA   │
│                                                     │
│ ✓ APIFY_TOKEN configurado                           │
│ ✓ Modo de teste ativo (allowlist com 1 handle)      │
│ ✗ APIFY_ENABLED desligado — esperado nesta fase     │
│ ✓ INTERNAL_API_TOKEN configurado                    │
│ ✓ RESEND_API_KEY configurado                        │
└─────────────────────────────────────────────────────┘
```

Lógica simples client-side (sem novo endpoint):
- **Pronto (verde)**: `APIFY_TOKEN` presente + (`testing_mode.active` && `allowlist.length > 0`) + `INTERNAL_API_TOKEN` presente.
- **Atenção (âmbar)**: tudo o resto — falta token, allowlist vazia mas modo de teste ativo, ou modo de teste inativo (perigoso para o primeiro smoke test).
- **Crítico (vermelho)**: `APIFY_ENABLED=true` **e** `testing_mode.active=false` simultaneamente (= chamadas reais sem allowlist → potencial gasto descontrolado).

**Allowlist vazia** deve aparecer com badge `warning` explícito ("Allowlist vazia — nenhuma análise vai disparar Apify"), não apenas com texto cinza pequeno.

#### 6. Tab Custos
- Os 4 `StatCard` estão bem mas falta **hoje vs ontem** ou uma seta de tendência (↑/↓) — útil para detectar picos sem ter que comparar mentalmente 24h/7d.
- A "Metodologia" deveria estar dentro de um `<details>` colapsável (fechado por defeito) — é importante mas ocupa muito espaço.
- O cartão de poupança deve dizer "Estimativa" em vez de valor seco para reforçar que é cálculo, não fatura.

#### 7. Tab Alertas
- O segundo card "Os alertas são informativos. Nenhum utilizador é bloqueado." parece ruído visual. Mover para tooltip ou nota inferior.
- Quando há 0 alertas, a tabela mostra empty state. Bom. Quando há alertas, falta **agrupar por severidade** (críticos primeiro) e **destacar a row** com cor de fundo subtil quando `severity=critical`.
- Os "Limites configurados" são úteis mas estão no fim — o operador esquece-se que existem. Mover para um `<details>` ao lado dos limites ou marcar com badge "Configuração".

#### 8. Mobile readability
- `TabsList` com 6 tabs faz wrap em mobile mas as tabs ficam quase ilegíveis (`text-sm` + padding pequeno). Em mobile, considerar `<Select>` em vez de `<TabsList>` quando viewport < 640px, ou usar tabs-as-pills com scroll horizontal.
- StatCards em `grid-cols-2 sm:grid-cols-4`: os valores grandes (`text-2xl sm:text-3xl`) podem partir em mobile com strings tipo `$1,234.56`. Adicionar `tabular-nums` (já é fonte mono — confirmar) e `truncate` ou `text-balance`.
- DataTable com `min-w-[640px]` força scroll horizontal em mobile — está correcto, mas adicionar uma sombra subtil à direita para sinalizar "há mais conteúdo a deslizar".

#### 9. Acessibilidade e contraste
- `text-content-tertiary` em `text-xs` aparece em vários sítios (descrições de Section, sublabels). Verificar contraste vs `bg-surface-base` e `bg-surface-elevated`. Em dark mode com 70% opacity, pode falhar AA para texto pequeno.
  - **Recomendação**: descrições de `Section` passar para `text-content-secondary` (mais legível) ou aumentar o tamanho para `text-sm`.
- `font-mono text-[0.625rem]` (10px) é muito pequeno para AA mesmo em uppercase. Subir para `text-[0.6875rem]` (11px) e manter o tracking.
- `PresenceBadge` e `ProviderStatusBadge` — confirmar que a cor não é o único transmissor de estado (já têm texto, OK, mas verificar se os dots têm `aria-label`).
- `Button "Atualizar"` com ícone spinner em loading: adicionar `aria-busy` e `aria-label` quando o estado for "A atualizar".

#### 10. O que NÃO mudar
- `requireAdminSession`, `whoami`, `adminFetch`, fluxo Google Sign-in. ✅ Recém-validado.
- `RequestsPanel` (Pedidos) — funcional crítico, alteração separada se necessário.
- `cockpit-types.ts` — sem mudanças, todos os refinamentos vivem no UI.
- Logica de `useCockpitData` — só apresentação muda.
- Tokens (`tokens.css`, `styles.css`).
- `/report.example`, PDF, email, landing.

---

### Prioridades recomendadas

| # | Issue | Prioridade | Esforço |
|---|---|---|---|
| 1 | Diagnóstico: card "Readiness Apify" no topo | **P0** | Médio |
| 2 | Allowlist vazia: badge warning explícito | **P0** | Trivial |
| 3 | Empty states com ícone + descrição contextual | **P1** | Baixo |
| 4 | Email do admin no header (identificação) | **P1** | Trivial |
| 5 | Custos: "Metodologia" em `<details>` colapsável | **P1** | Trivial |
| 6 | Alertas: remover card ruído + ordenar por severidade | **P1** | Baixo |
| 7 | Tabs: contadores em `Alertas` (vermelho >0) | **P1** | Baixo |
| 8 | Contraste: `text-content-tertiary` xs → secondary sm | **P1** | Baixo |
| 9 | Mobile: TabsList → Select em <640px | **P2** | Médio |
| 10 | StatCards: tendência ↑/↓ vs período anterior | **P2** | Médio (precisa série temporal extra) |
| 11 | Reordenar tabs por fluxo operacional | **P2** | Trivial (necessita confirmação) |

---

### Mudanças por componente/ficheiro

| Refinamento | Ficheiros |
|---|---|
| Readiness card + allowlist warning | `src/components/admin/cockpit/panels/diagnostics-panel.tsx` (criar `<ReadinessCard data={data} />` no topo) |
| Empty states com ícone | `src/components/admin/cockpit/parts/empty-state.tsx` (adicionar prop `icon`); usado em `diagnostics-panel.tsx`, `alerts-panel.tsx`, `analyses-panel.tsx`, `profiles-panel.tsx` |
| Email no header admin | `src/routes/admin.tsx` (passar `adminEmail` do `whoami` para o header) |
| Metodologia colapsável | `src/components/admin/cockpit/panels/costs-panel.tsx` |
| Alertas: ordenar + limpar | `src/components/admin/cockpit/panels/alerts-panel.tsx` |
| Tabs com contadores + ícones | `src/components/admin/cockpit/cockpit-shell.tsx` |
| Contraste: descrições Section | `src/components/admin/cockpit/panels/diagnostics-panel.tsx`, `costs-panel.tsx`, `alerts-panel.tsx` |
| Mobile tabs (P2) | `cockpit-shell.tsx` |

Nenhum ficheiro fora de `src/components/admin/cockpit/**`, `src/components/admin/cockpit/panels/**`, `src/components/admin/cockpit/parts/**` ou `src/routes/admin.tsx` é tocado.

---

### Smallest safe implementation step

Aplicar **apenas P0 (#1 + #2)** numa primeira passagem:

1. Criar componente `<ReadinessCard data={data} />` em `diagnostics-panel.tsx` (mesmo ficheiro, helper local). Lê `data.secrets`, `data.apify.enabled`, `data.testing_mode`. Calcula um dos 3 estados e renderiza um card com checklist.
2. No `Section "Modo de teste"` quando `allowlist.length === 0`, substituir o `<p class="text-xs text-content-tertiary">Allowlist vazia.</p>` por um `<Badge variant="warning" dot>Allowlist vazia — nenhuma análise vai disparar Apify</Badge>`.

Custo estimado: ~80 linhas, 1 ficheiro, zero novos endpoints, zero migrações, zero novos tokens.

---

### Ficheiros a manter trancados

- `LOCKED_FILES.md` — manter.
- `src/components/report/**` (qualquer coisa).
- `src/routes/report.example.tsx`.
- `src/routes/index.tsx` (landing).
- `src/routes/analyze.$username.tsx`.
- `src/lib/pdf/**`, `src/lib/email/**`.
- `src/lib/orchestration/run-report-pipeline.ts`.
- `src/integrations/supabase/client.server.ts`, `client.ts`, `types.ts`.
- `src/styles.css`, `src/styles/tokens*.css`.
- `src/lib/admin/session.ts`, `src/lib/admin/fetch.ts` (recém-validados).
- `src/routes/api/**`.

---

### Validação

- [ ] `bunx tsc --noEmit` zero erros.
- [ ] `/admin` em desktop: Readiness Card aparece no topo do Diagnóstico com 3 estados visualmente distintos.
- [ ] Com `APIFY_ENABLED=false` + allowlist com 1 handle → estado "Pronto" verde.
- [ ] Com allowlist vazia → estado "Atenção" âmbar + badge warning na secção Modo de teste.
- [ ] Com `APIFY_ENABLED=true` + `testing_mode.active=false` (simulado) → estado "Crítico" vermelho.
- [ ] Mobile 375px: Readiness Card legível, sem overflow.
- [ ] Contraste do checklist passa AA (lighthouse ou contrast checker).
- [ ] Nenhuma alteração em rotas `/`, `/analyze/...`, `/report.example`, `/api/*`.

---

### Decisão pedida

Diz qual aplicar:

- **A) Apenas P0 (#1 + #2)** — Readiness Card + allowlist warning. ~80 linhas, 1 ficheiro. **Recomendado antes do smoke test do Apify.**
- **B) P0 + P1 (#1–#8)** — acima + empty states, email no header, custos colapsável, alertas limpos, tabs com contadores, contraste corrigido. ~250 linhas, ~6 ficheiros.
- **C) Tudo (P0+P1+P2)** — acima + mobile tabs como Select + tendências nos StatCards. ~400 linhas. Reordenar tabs precisa confirmação adicional tua.

Recomendação: **A** agora (desbloqueia smoke test com clareza máxima), **B** depois do primeiro teste com Apify confirmar que tudo funciona em dados reais.
