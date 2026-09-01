# Report UX 6B.2.2 — Alinhamento do topo, navegação lateral e corte Free

Ronda de consolidação visual. Sem tocar em métricas, dados, providers, pagamentos, preço, entitlements, analytics nem arquitectura do relatório.

## O que a leitura do código confirmou

Antes de propor, verifiquei os ficheiros envolvidos:

- **Header desalinhado — causa identificada.** A barra "Auditoria Instantânea" (`instant-audit-bar.tsx`), o banner de saldo de packs e o bloco "Aprofundar" (`deepen-analysis-cta.tsx`) são renderizados pela rota `analyze.$username.tsx`, **fora** do `ReportShellV2`, e por isso herdam o container do `AppShell` (`px-6 md:px-8 lg:px-10`, largura do `Container`). O relatório usa outro container: `mx-auto max-w-[1520px] px-4 sm:px-5 md:px-6 lg:px-8`. São duas grelhas diferentes na mesma página — daí a sensação de que o topo "vive noutra largura".
- **Navegação lateral — causa identificada.** O sticker é um único componente com prop `compact`. Em `report-block-nav.tsx`, o modo compacto remove deliberadamente: os badges (`showBadge && !compact`), os títulos de grupo "leitura gratuita"/"relatório completo" (`!compact`) e a barra de progresso (`!premiumUnlocked && !compact`). Ao entrar em sticky sobra uma lista nua — é isso que faz parecer outro componente.
- **Corte Free — já está quase todo feito.** Em `report-overview-block.tsx` o `FormatCard` já está atrás de `access !== "anon"`, e o Estado A já renderiza Identidade → Engagement → Frequência → `PostComparisonPreview` com gate. Em `block-config.ts`, `formatos` já é `free_email`. Ou seja: o ponto 3 do pedido está implementado; falta **fixá-lo com testes** e afinar a copy do gate. Não vou reescrever o que já está correcto.

## 1. Header — uma só grelha

Introduzir um wrapper de grelha partilhado (mesmo `max-w-[1520px]` e mesmo ritmo de `padding-x` do shell) e aplicá-lo à chrome que a rota renderiza acima e abaixo do relatório:

- barra "Auditoria Instantânea" + CTA "Guardar esta auditoria";
- banner de saldo de packs;
- bloco "Aprofundar gratuitamente".

O relatório **não** passa a full-width: mantém-se a largura controlada actual; apenas o que estava fora dela entra na mesma coluna. O CTA "Guardar esta auditoria" mantém comportamento e tracking — só muda o alinhamento e o encaixe visual com o card do hero.

Fora de âmbito: branding, logo, header global do site, tipografia base.

## 2. Navegação lateral — mesma linguagem em sticky

O modo compacto passa a ser uma versão **densa** do mesmo componente, não uma versão amputada:

- manter os dois grupos (leitura gratuita / relatório completo) com os títulos em versão reduzida;
- manter o badge "GRÁTIS" nas secções gratuitas também em sticky (badge mais pequeno, sem tracking uppercase largo);
- manter o cadeado e a marcação premium nas secções pagas;
- manter a barra de progresso, em versão fina, para a progressão de leitura ficar mais evidente;
- manter o realce da secção activa (indicador lateral + peso do label), já existente.

Reduz-se altura de linha, espaçamento e tamanho do badge — nunca a informação que distingue gratuito de premium. Não se muda o sistema visual base do sticker.

## 3. Corte Free — Estado A termina em "Melhores vs piores publicações"

Confirmar e blindar a composição já existente:

```text
A — Auditoria Instantânea (anónimo)
  01 Índice do perfil
  02 Engagement
  03 Frequência / cadência
  04 Melhores vs piores publicações  → preview protegido
     gate gratuito com email
  fim

B — Análise Aprofundada (email)
  tudo de A + Publicações completas + Formatos + Conversas + CTA Pro 9 EUR

C — Pro
  tudo de B + Diagnóstico Editorial + Prioridades + camada comparativa
```

Formatos não aparece em A. Conversas continua fora de A. Diagnóstico e Prioridades continuam Pro.

## 4. Preview de publicações — reforçar o papel de gate

Mantém-se o que já lá está (thumbnails nítidos, etiquetas Melhor/Pior, métricas protegidas com blur leve e glifos neutros). Afinação apenas na moldura e na copy do gate para deixar clara a progressão:

- parte gratuita responde a **"O que está a acontecer neste perfil?"**;
- a partir do gate a promessa é **"Porquê?"**, **"que conteúdos explicam estes sinais"** e **"o que fazer a seguir"**.

Sem linguagem de contagem de secções nem de completude artificial. Sem alongar o bloco.

## 5. Testes

Actualizar/adicionar em `__tests__`:

- A não inclui Formatos;
- A inclui Frequência e o preview de publicações-chave;
- o gate começa em publicações-chave;
- B inclui Formatos e Conversas; C é cumulativo;
- badges "GRÁTIS" coerentes na nav em modo normal **e** compacto;
- sem regressão em `access-gating` A/B/C.

## 6. Validação

Desktop 1280 e 1440; mobile 375 e 390. Verificar alinhamento do topo com o corpo, integração do CTA, coerência do sticker antes/depois do scroll, e ausência de regressões em Pro e na camada comparativa.

## Detalhes técnicos

- Ficheiros previstos: `src/routes/analyze.$username.tsx` (só wrapper de grelha), `src/components/product/instant-audit-bar.tsx`, `src/components/product/deepen-analysis-cta.tsx`, `src/components/report-redesign/v2/report-block-nav.tsx` (`ItemRow`, `LockedItemRow`, `ProgressSummary`, `SidebarList` no ramo `compact`), `src/components/report-redesign/v2/report-post-comparison.tsx` e `report-overview-block.tsx` (apenas moldura/copy do gate), `src/i18n/locales/{pt,en}/report.json`.
- Sem alterações a `access-gating.ts`, `block-config.ts` (tiers já correctos), pagamentos, `premium-cta-context.tsx`, providers ou eventos de analytics.
- Novo wrapper de grelha como componente de apresentação simples, sem lógica.

## Entrega

Resumo das alterações, before/after do header e da navegação lateral, confirmação da ordem do Estado A e da ausência de Formatos em A, screenshots desktop e mobile, testes executados, e nota explícita de que dados, métricas, pagamentos e lógica Pro ficaram intactos.
