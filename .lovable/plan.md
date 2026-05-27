## Auditoria mobile · `/analyze/frederico.m.carvalho`

Read-only. Perfil testado: `@frederico.m.carvalho` (allowlist). Capturado nos 3 viewports pedidos.

### 1. Resultado por viewport

| Viewport | Hero | Block 1 | KPI strip | Format/Frequency | Hashtags / Top posts | Lock gate | Bottom nav | Horizontal scroll | Veredito |
|---|---|---|---|---|---|---|---|---|---|
| 360 × 800 | ⚠️ handle quebra meio da palavra ("@frederico.m.c / arvalho") | PASS | PASS | bloqueado (blur premium) | bloqueado (blur premium) | PASS — barra compacta com CTA "UNLOCK" | PASS | nenhum | PASS com 1 P1 |
| 390 × 844 | ⚠️ idem ("@frederico.m.ca / rvalho") | PASS | PASS (cards empilhados, "8.9 per post", "0 per post", "2.8 posts/week" todos legíveis) | idem | idem | PASS | PASS | nenhum | PASS com 1 P1 |
| 414 × 896 | ⚠️ idem ("@frederico.m.carval / ho") | PASS | PASS | idem | idem | PASS | PASS | nenhum | PASS com 1 P1 |

Notas:
- Block 1 editorial (Overview / "How is this profile doing overall?") renderiza limpo nos 3 widths; H2 Fraunces não corta.
- KPI strip mobile = stack vertical com 3 cards (likes/comments/rhythm), eyebrow + valor + hint todos ≥ 12px.
- Referências (Socialinsider/Buffer/Hootsuite) no fundo: cards full-width, badges de mês não sobrepõem, link externo visível.
- Lock gate atual: barra navy fixa no fundo (`3 premium sections still locked · UNLOCK`). Continua elegante e legível nos 3 widths. Não vi a página completa do paywall porque o conteúdo premium aparece blurred — esperado.
- Bottom tab bar (Overview / Diagnosis / Menu) sobrepõe ligeiramente o language switcher do footer. P2 cosmético — apenas perceptível quando se scrolla até ao fim.
- Nenhum scroll horizontal detectado (sem scrollbar horizontal nos screenshots; todos os cards respeitam o container).
- FormatCard / FrequencyCard / Hashtags / Post comparison / Benchmark chart estão em sections premium e ficam atrás do blur — não auditáveis sem unlock. Para QA completo destes blocos é preciso uma sessão unlocked.
- Mistura PT/EN nos textos editoriais aparece quando o language switcher está em EN mas a narrativa AI volta a PT — não é regressão de layout, é uma inconsistência de copy/AI a registar em ticket próprio (fora do âmbito desta auditoria).

### 2. Issues ranqueados

| # | Severidade | Onde | Descrição | Repro |
|---|---|---|---|---|
| 1 | **P1** | Hero do report (`@frederico.m.carvalho`) | Handle quebra **meio da palavra** "carvalho" em 360/390/414. Fraunces bold em ~30px sem hyphens nem overflow-wrap controlado → leitura confusa. | Abrir `/analyze/frederico.m.carvalho` em qualquer mobile. |
| 2 | **P2** | Footer ↔ bottom tab bar | Language switcher do footer fica meio-tapado pela barra fixa de navegação inferior em todos os widths. | Scroll até ao fim. |
| 3 | **P2** (não auditado) | FormatCard / FrequencyCard / Hashtags / Post comparison / Benchmark chart | Estão bloqueados pelo paywall; **não validados** neste audit. | Precisa de sessão unlocked para confirmar mobile QA. |

### 3. Veredicto

- **Estado:** **READY para beta com 1 P1 cosmético no hero do report.**
- Sem regressões desktop visíveis nos tamanhos próximos (414 transita bem para tablet).
- Sem cores hardcoded forbidden detectadas visualmente.
- Recomendo corrigir o P1 antes de abrir beta — é a primeira coisa que o utilizador vê no relatório.
- P2 do footer pode esperar; P2 das premium cards precisa de teste separado em conta unlocked.

### 4. Pequeno prompt de implementação proposto (P1 apenas)

> **Fix:** No componente do hero do `/analyze/$username` (provavelmente `src/components/product/analysis-header.tsx`), aplicar à linha do handle (`@frederico.m.carvalho`):
> - `overflow-wrap: anywhere` em vez de quebra automática que parte palavras a meio
> - reduzir o tamanho do handle em mobile (`text-2xl sm:text-3xl md:text-4xl` em vez de tamanho fixo) e manter Fraunces
> - garantir `min-w-0` no flex parent para o `truncate`/wrap funcionar
> - validar em 360 / 390 / 414 com `@frederico.m.carvalho` e com handles longos sintéticos (`@nome.muito.muito.longo.de.utilizador`)
>
> Sem alterações de lógica, providers ou tokens. Apenas tipografia responsiva no hero.

### Checkpoints (read-only audit)

- ☐ Aprovar o prompt de fix do hero handle wrap (P1)
- ☐ Confirmar se queres que eu também investigue o P2 do footer / tab bar nesta passagem
- ☐ Confirmar se queres uma 2ª passagem em sessão unlocked para auditar FormatCard / FrequencyCard / Hashtags / Post comparison / Benchmark chart em mobile
