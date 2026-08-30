# Auditoria de arquitectura do relatório (read-only) + proposta de simplificação

## 1. O que existe hoje, na prática

Rota real: `/analyze/$username` → `ReportShellV2` com `lockBoundary="engagement"`.

Estado de um visitante anónimo (sem email, sem compra):

```text
Hero (identidade, período, acções)
01 · Overview  → MethodologyLine
                 EditorialIdentityCard (índice do perfil)
                 EngagementCardRefined
                 "Relatório completo · 5 secções premium"
                 5 × PremiumTeaserCard (Frequência, Formatos,
                     Publicações-chave, Diagnóstico, Prioridades) → 9€
Blocos 02–06   → NÃO renderizam (só com premiumUnlocked)
InstantAuditBar        → CTA "guardar auditoria" (email)
DeepenAnalysisCta      → CTA Comment Intelligence (email)
ReportEndCta           → CTA "guardar e aprofundar" (email)
StickyUnlockBar        → CTA 9€ (fixo, sempre visível)
ReportEndOfFreeBlock   → CTA 9€ (só depois do email)
```

### Respostas às perguntas colocadas

- **O que recebe toda a gente:** identidade editorial + índice do perfil, engagement vs benchmark, linha de metodologia (amostra/janela) e 5 teasers bloqueados. Nada mais.
- **O que o email desbloqueia:** hoje, formalmente, apenas Comment Intelligence + guardar/histórico. Não abre nenhum dos 5 teasers.
- **O que justifica 9€:** os 5 blocos (Frequência, Formatos, Publicações-chave, Diagnóstico, Prioridades) mais janelas 30/90 dias e concorrentes.
- **CTA principal em cada momento:** não existe um. Existem quatro em simultâneo (barra instantânea, aprofundar, fim de relatório, barra sticky 9€), servidos por três motores distintos: `ConversionSheet` (email), `usePremiumCta` (9€) e o legado `UnlockModal`.

### Defeitos identificados (factuais)

1. **Conflito de oferta no mesmo ecrã.** O único bloco de valor gratuito termina imediatamente numa lista rotulada "5 secções premium" enquanto três CTAs gratuitos disputam a mesma atenção. O utilizador não distingue o que é grátis-com-email do que é pago.
2. **`ReportCommentIntelligence` está órfão.** O componente existe em `src/components/report-redesign/v2/report-comment-intelligence.tsx` mas não é importado em lado nenhum. A promessa do email (Nível 2) não tem superfície de entrega no relatório.
3. **Três motores de CTA.** `ConversionSheet`, `PremiumCtaProvider` e `UnlockModal` coexistem; `UnlockModal` continua ligado a `onUnlockClick` do shell.
4. **`StickyUnlockBar` a 9€ aparece antes do email.** Pede-se dinheiro antes de o utilizador ter recebido o segundo nível gratuito.
5. **Densidade.** O bloco 01 acumula metodologia + índice + engagement + 5 teasers longos com preview; não há um resumo executivo de 10 segundos.

## 2. Arquitectura proposta (confirma a tua intuição)

```text
NÍVEL 0 · AUDITORIA INSTANTÂNEA  (grátis, sem email)
  Veredicto em 1 frase + índice do perfil
  Engagement vs benchmark
  1 insight accionável
  1 teaser único e honesto → "Aprofundar gratuitamente"

NÍVEL 1 · EMAIL  (grátis)
  Comment Intelligence (bloco real, no sítio)
  Contexto editorial adicional
  Guardar + histórico

NÍVEL 2 · PRO 9€
  30/90 dias · concorrentes · diagnóstico editorial completo
  prioridades avançadas (+ calendário editorial no futuro)
```

Regra de ouro: **um só CTA visível por estado**.

| Estado | CTA único | Superfície |
| --- | --- | --- |
| Anónimo | "Aprofundar gratuitamente" | sticky bar + fim do bloco |
| Lead (email dado) | "Desbloquear Pro · 9€" | fim do relatório |
| Pro | nenhum (partilha/PDF) | barra de utilidades |

## 3. Hierarquia de leitura (10s / 30s / 2min)

- **10 s:** veredicto + índice + delta de engagement vs benchmark, num cartão executivo único acima da dobra.
- **30 s:** três cartões compactos (engagement, cadência, formato dominante) + 1 insight accionável.
- **2 min:** Comment Intelligence e leitura editorial (Nível 1); tudo o resto é Pro, apresentado uma vez, no fim.

## 4. Trabalho proposto (fases)

**Fase A — clarificar a oferta (sem redesenho)**
- Esconder `StickyUnlockBar` e os teasers 9€ enquanto o visitante for anónimo; mostrar em vez disso um único teaser "Aprofundar gratuitamente".
- Depois do email: revelar Comment Intelligence e passar a exibir os teasers Pro + sticky bar 9€.
- Retirar `ReportEndCta`/`InstantAuditBar` duplicados quando o `DeepenAnalysisCta` estiver visível.

**Fase B — ligar o Nível 2**
- Renderizar `ReportCommentIntelligence` no bloco 01 (ou novo bloco 02 "Conversas") quando `unlockStatus` estiver disponível, com estados queued/processing/degraded já suportados pelo i18n `conversion.unlock.*`.

**Fase C — compactar o relatório**
- Novo cartão executivo (veredicto + índice + delta) acima do `EngagementCardRefined`.
- Teasers Pro reduzidos de 5 cartões longos para uma grelha compacta de 5 linhas com um único botão.
- Reduzir espaçamentos verticais dos blocos (`ReportFramedBlock`) em mobile.

**Fase D — copy e consistência**
- Alinhar `tier-copy.ts`, `report.json` e sidebar com os três níveis (0/1/2), eliminando a mistura "gratuito vs premium" que hoje ignora o nível intermédio.

## 5. Detalhes técnicos

- Ficheiros centrais: `report-shell-v2.tsx`, `report-overview-block.tsx`, `premium-teaser-card.tsx`, `sticky-unlock-bar.tsx`, `end-of-free-block.tsx`, `analyze.$username.tsx`, `report-comment-intelligence.tsx`.
- Gate actual: `premiumUnlocked` (entitlement `report_full_9`) controla blocos 02–06; `unlocked` (lead) só controla o `ReportEndOfFreeBlock`. A Fase A introduz o uso real de `unlocked` para revelar o Nível 1.
- Nada de alterações a pagamentos, entitlements, `/report.example` ou pipeline de dados.

## 6. Riscos

- Esconder os teasers 9€ a anónimos reduz exposição ao preço; mitigado por mostrá-los imediatamente após o email.
- `UnlockModal` legado precisa de decisão: manter como fallback ou remover na Fase A.
