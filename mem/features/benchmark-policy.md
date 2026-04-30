---
name: Benchmark source policy
description: Fontes editoriais aprovadas (Socialinsider, Buffer, Hootsuite, Databox), uso por bloco, anti-invenção de métricas, etiquetagem perfil/referência/interpretação. Versão canónica em KNOWLEDGE.md.
type: feature
---

Fontes nomeáveis (nunca com link): Socialinsider, Buffer, Hootsuite, Databox.
Cada uma tem um papel:
- Socialinsider → benchmarks orgânicos por formato (~0,48% médio; Reels ~0,52%; Carrosséis ~0,55%; Imagens ~0,37%) e cadência (~4,6/semana).
- Buffer → contexto por tier de seguidores (0–1K … 500K–1M); reach só se houver dataset real.
- Hootsuite → contexto de indústria (apenas com indústria seleccionada; senão, copy genérico direcional).
- Databox → reservado para futuro autenticado (alcance, visitas, cliques).

Etiquetar sempre:
1. Dado do perfil ("Este perfil regista…").
2. Referência interna ("A referência para este tier é…").
3. Interpretação editorial com hedging: "sugere", "indica", "aponta para", "com base na amostra analisada", "como referência direcional".

Nunca inventar: crescimento, alcance, impressões, saves, partilhas, visitas, cliques, demografia, pago vs orgânico — a não ser que existam no dataset.

Uso por bloco do relatório:
- B01 Overview: envolvimento + cadência, com nota direcional. Sem sobrecarregar.
- B02 Diagnóstico: explicar PORQUÊ; não repetir KPIs.
- B03 Performance: onde o benchmark é usado mais directamente.
- B04 Conteúdo: princípios de formato (Carrosséis=educação; Reels=descoberta; Imagens=identidade).

Banidos no UI: payload, engagement_pct, result.data, keyMetrics, "API response", "Segundo a X, este perfil...".

Política completa: /KNOWLEDGE.md (locked) + KnowledgeNote "Política de fontes de benchmark" (categoria tool) injectada no prompt via formatKnowledgeContextForPrompt.
