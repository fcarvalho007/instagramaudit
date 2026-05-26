## Resposta directa

**Modal de feedback beta** (`beta_feedback`): grava na BD e é parcialmente consumido pelo admin — aparece como contexto em **Pipeline / Beta-leads / Follow-ups** (anexado a cada lead). NÃO existe vista agregada (intenção de compra, pricing preference, score de utilidade, texto livre) consolidada.

**Emojis inline** (`inline_report_feedback`, 5 ratings por bloco): grava na BD via `/api/public/inline-feedback`, **mas nenhuma rota admin lê esta tabela**. Hoje é dado opaco. Volume actual: 0 registos (tabela criada agora).

Conclusão: a informação está dispersa e crua. Justifica-se uma nova secção dedicada.

## Proposta — `/admin/estudo-mercado`

Nova entrada na sidebar dentro de um novo grupo **"Estudo de mercado"** (acima de "Sistema") com 1 item agora e espaço para crescer.

### Estrutura da página (3 separadores internos)

```
┌─ Pulso do produto ────────────────────────────────────────────┐
│  Resumo executivo (últimos 30 dias)                           │
│  • NPS-like médio dos emojis (1–5) + variação vs 30d ant.    │
│  • Total respostas modal + taxa de resposta (modal/relatórios)│
│  • Intenção de compra agregada (modal): % sim/talvez/não      │
│  • Top 3 frases recorrentes (clarity_text + missing_text)     │
└───────────────────────────────────────────────────────────────┘

┌─ Emojis por bloco (inline_report_feedback) ───────────────────┐
│  Tabela por `block`: overview / diagnostic / performance /    │
│  content → média, distribuição 1–5, nº respostas, %           │
│  positivas (4–5), tendência semanal (sparkline).              │
│  Drill-down: lista dos últimos 50 comentários livres com      │
│  rating + handle + timestamp + link p/ snapshot.              │
└───────────────────────────────────────────────────────────────┘

┌─ Modal beta (beta_feedback) ──────────────────────────────────┐
│  • Distribuição usefulness_score (1–5)                        │
│  • Intenção de compra (purchase_intent) — donut               │
│  • Preferência de pricing (pricing_preference) — barras       │
│  • Contact_consent — % opt-in                                 │
│  • Stream das respostas livres (clarity_text / missing_text)  │
│    com mini-pesquisa por texto e link para o lead/relatório.  │
└───────────────────────────────────────────────────────────────┘
```

### Tradução **dados → informação → insights**

Cada bloco terá um cartão "Sinal editorial" no topo (regra determinística, sem IA): por exemplo
- "Pulso ≥ 4.2 e n ≥ 20 → leitores estão a validar o produto."
- "Bloco *diagnostic* com média < 3.5 → ponto crítico para iterar."
- "Intenção de compra ≥ 40% sim/talvez → sinal de validação comercial."

Frases curtas, neutras, pt-PT, em consistência com o tom do resto do admin.

### Implementação técnica (resumida)

- **Rota:** `src/routes/admin.estudo-mercado.tsx` (createFileRoute `/admin/estudo-mercado`).
- **Server fn:** `src/lib/admin/market-study.functions.ts` com `requireSupabaseAuth` + check admin email (mesmo padrão das outras rotas admin). Lê via `supabaseAdmin` agregações de `inline_report_feedback` e `beta_feedback` (group by, contagens, percentis), filtros por janela 7/30/90 dias.
- **Sidebar:** novo grupo "Estudo de mercado" em `src/components/admin/v2/admin-sidebar.tsx`, ícone `BarChart3` ou `LineChart`, item único `/admin/estudo-mercado`.
- **UI:** mesmo design system v2 do admin (cards brancos, tokens semânticos, sem `slate-*`, Inter, métricas com `tabular-nums`). Recharts já está no projecto para sparklines.
- **Performance:** queries leves agregadas (não puxa rows individuais excepto na lista paginada de comentários, limit 50).
- **Sem migrations.** Tabelas já existem.

### Out of scope

- Não tocar em `beta_feedback` consumo existente no pipeline (continua a aparecer no lead detail).
- Não alterar o widget público nem o modal.
- Não criar email/relatório derivado destes dados (futuro).

## Checkpoint

☐ Criar `src/lib/admin/market-study.functions.ts` (3 server fns: pulse, emoji-blocks, modal-aggregate)
☐ Criar `src/routes/admin.estudo-mercado.tsx` com 3 separadores e cartões de insight determinísticos
☐ Acrescentar grupo "Estudo de mercado" à `AdminSidebar`
☐ `bunx tsc --noEmit` + `bunx vitest run` para garantir que nada parte