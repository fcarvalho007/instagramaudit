# Ronda 3 — Experiência anónima de primeiro valor

Objectivo: um visitante novo vai da landing ao resultado sem email, nome, password, conta, qualificação ou modal. Captura de lead fica para a Ronda 4.

`PUBLIC_BASELINE_NO_EMAIL` mantém-se desactivado em produção; toda a validação é feita em local/staging.

## 1. Hero e entrada

- Manter `HeroActionBar` e `normalizeInstagramHandle` (aceita `@handle`, `handle`, URL).
- Copy PT-PT proposta (i18n `landing.json`, pt + en):
  - H1: "Analisa o desempenho de qualquer perfil de Instagram"
  - Sub: "Introduz um perfil público e vê engagement, conteúdos com melhor desempenho e oportunidades de melhoria."
  - Label do input: "Inserir perfil público do Instagram"
  - CTA: "Analisar gratuitamente"
  - Microcopy sob a barra: "Sem registo · Apenas dados públicos · Resultado em segundos"
- Remover, para visitantes anónimos, qualquer abertura de `OnboardingModal` a partir do hero: submissão navega sempre para `/analyze/$username`.

## 2. Linguagem neutra de posse

- Varrer copy do relatório, loader e erros: substituir "o teu perfil / os teus seguidores / a tua marca" por "o perfil / este perfil / os seguidores do perfil" enquanto `profile_relationship` não estiver declarado.
- Aplica-se a `analyze.json`, `errors.json`, copy do report V2 e teasers.

## 3. Estado de processamento

- Reutilizar `AnalysisSkeleton`, com passos reais e sem percentagens: localizar perfil → analisar publicações → calcular engagement → preparar diagnóstico.
- Reduzir o piso mínimo de exibição de 3000 ms para ~800 ms, para não atrasar cache hits.
- Nenhum modal durante o processamento.

## 4. Primeiro viewport = momento AHA

Reordenar apenas a apresentação (sem novas métricas) para que o topo responda a: que perfil, métrica principal, leitura forte/médio/fraco, uma descoberta concreta.

- Cabeçalho: avatar, @handle, seguidores, nº de publicações analisadas, período observado.
- Cartão principal: taxa de engagement + leitura qualitativa e benchmark quando existir.
- Um destaque concreto já disponível (melhor conteúdo/sinal) acima da dobra em desktop e a um scroll curto em mobile.
- Sem overlay, sem blur, sem gate.

## 5. Auditoria Instantânea

- Nomear o resultado anónimo "Auditoria Instantânea".
- Remover qualquer linguagem de completude parcial ("70% completo", "faltam secções") no estado anónimo; os teasers passam a comunicar aprofundamento, não falta.

## 6. Pontos de conversão (placeholders, não funcionais)

- A. Acção discreta "Guardar esta auditoria" no cabeçalho do relatório — visível, sem formulário; clique regista evento e mostra nota "disponível em breve".
- B. Bloco contextual "Aprofundar a análise" onde entrará Comment Intelligence.
- C. CTA no final do relatório.
- Cada ponto fica documentado com comentário `// Ronda 4:` a indicar o ponto de integração.

## 7. Protecção do baseline anónimo

- `PUBLIC_ANON_MAX_FRESH_PER_IP_DAY` default passa de 3 para 10.
- Adicionar limite horário por IP (`PUBLIC_ANON_MAX_FRESH_PER_IP_HOUR`, default 4).
- Confirmar por teste que só análises FRESH com sucesso contam; cache hit dentro do TTL não consome quota.
- Caps globais e por provider mantêm-se inalterados.
- Risco documentado: a contagem falha-aberto se a query à base de dados falhar; e IPs partilhados (empresa/rede móvel) partilham quota — mitigado pelo aumento para 10/dia.

## 8. Analytics

Novos eventos no allowlist de `src/lib/tracking.functions.ts` e emissão via endpoint público existente (sem IP em bruto, apenas hash já usado):

`landing_view`, `instagram_handle_submitted`, `anonymous_analysis_started`, `anonymous_analysis_success`, `anonymous_analysis_failed`, `instant_audit_viewed`, `instant_audit_scroll_25/50/75/100`, `save_audit_cta_viewed`, `level2_cta_viewed`.

- Dedupe por chave em `useRef` + `sessionStorage`, reaproveitando o padrão `TRACKED_SNAPSHOTS` já existente em `analyze.$username.tsx`.
- Marcos de scroll disparam uma única vez por snapshot; observadores de viewport com `IntersectionObserver` e flag `once`.

## 9. Estados de erro

Copy dedicada e próxima acção para: perfil inexistente, privado, sem feed suficiente, username inválido, provider indisponível, rate limit anónimo, orçamento esgotado. Sem códigos HTTP nem nomes de fornecedores — o mapeamento em `errors.json` já esconde os códigos; falta rever texto e CTA por caso.

## 10. Mobile first

Validar hero, teclado e submit, loading, primeiro viewport, cards, scroll, CTAs e erros a 320/375/390/430 px.

## Detalhes técnicos

Ficheiros previstos:

- `src/components/landing/hero-action-bar.tsx`, `hero-section.tsx` — copy e remoção do gate anónimo.
- `src/i18n/locales/{pt,en}/{landing,analyze,errors}.json` — copy nova e neutra.
- `src/components/product/analysis-skeleton.tsx` e `analyze.$username.tsx` — passos reais, piso de exibição, sem modal antes do resultado.
- `src/components/report-redesign/v2/**` — ordem do primeiro viewport, rótulo "Auditoria Instantânea", placeholders de conversão.
- `src/lib/security/public-rate-limit.server.ts` — novos defaults e limite horário.
- `src/lib/tracking.functions.ts` + hook de analytics do relatório — eventos novos e dedupe.
- Testes: `src/routes/api/__tests__/` (limite anónimo, cache não conta como fresh) e testes de copy i18n (nenhuma copy assume posse).

Fora de âmbito: formulário de email, password/magic link, unlock de Comment Intelligence, envio de relatório por email, área privada, pagamentos, plano Pro, novos indicadores, redesenho profundo do relatório.

## Configuração

- Staging: `PUBLIC_BASELINE_NO_EMAIL=true`, `PUBLIC_ANON_MAX_FRESH_PER_IP_DAY=10`, `PUBLIC_ANON_MAX_FRESH_PER_IP_HOUR=4`.
- Produção: flag mantém-se `false` até autorização explícita.
