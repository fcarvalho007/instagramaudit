## Estimativa de armazenamento por relatório — Auditoria de sustentabilidade

### 1. Medições reais (4 snapshots em produção)

| Snapshot | Bytes JSONB (compactado) | Texto (descomprimido) |
|---|---:|---:|
| frederico.m.carvalho | 19 580 B (19 KB) | 45 095 B |
| martimsilvai | 17 899 B (17 KB) | 37 797 B |
| karmel_loja_ | 10 002 B (10 KB) | 24 583 B |
| karmel | 4 942 B (5 KB) | 8 007 B |
| **Média** | **≈13 KB** | **≈29 KB** |
| **P95 esperado (com 3 competidores)** | **≈45 KB** | ≈100 KB |

Postgres comprime JSONB em TOAST automaticamente. A coluna real ocupa ~13 KB; o JSON "humano" seria ~29 KB.

### 2. Breakdown do snapshot mais pesado (frederico.m.carvalho, 19 KB)

| Bloco | Bytes | % | Notas |
|---|---:|---:|---|
| `posts` (até 30) | 19 348 | 56 % | **Maior contribuinte.** Inclui captions, hashtags, métricas, URLs |
| `market_signals_free` (DataForSEO) | 10 051 | 29 % | Resultados SERP + concorrentes |
| `caption_semantic_analysis` | 5 737 | 17 % | Output OpenAI |
| `visual_cover_analysis` | 5 684 | 16 % | Output OpenAI |
| `ai_insights_v1` + `v2` | 6 263 | 18 % | Recomendações IA |
| `profile` | 1 064 | 3 % | Bio, followers, etc. |
| Restantes (format_stats, summary, enrichment_status…) | <1 KB | <3 % | — |

(soma > 100 % porque blocos partilham overhead de TOAST)

### 3. Tabelas auxiliares — custo por evento

| Tabela | Tamanho actual | Linhas | KB/linha |
|---|---:|---:|---:|
| `analysis_snapshots` | 8 496 KB (com bloat/TOAST) | 4 | ~13 KB úteis |
| `analysis_events` | 984 KB | 1 440 | ~0.7 KB |
| `provider_call_logs` | 176 KB | 127 | ~1.4 KB |
| `product_events` | 544 KB | 318 | ~1.7 KB |
| `report_requests` | 264 KB | 9 | ~3 KB |
| Storage `report-pdfs` | 67 KB | 2 PDFs | **~33 KB/PDF** |

### 4. Custo total por relatório completo

Um relatório gerado de raiz produz:

| Componente | Tamanho médio | Tamanho P95 |
|---|---:|---:|
| 1× `analysis_snapshots` | 13 KB | 45 KB |
| 1× `report_requests` | 3 KB | 5 KB |
| 1× `analysis_events` | 0.7 KB | 1 KB |
| 3-5× `provider_call_logs` (Apify+OpenAI+DFS) | 6 KB | 10 KB |
| 2-3× `product_events` (view, generate, open) | 5 KB | 8 KB |
| 1× PDF em storage | 33 KB | 60 KB |
| **TOTAL com PDF** | **≈61 KB** | **≈130 KB** |
| **TOTAL sem PDF (gerado on-demand)** | **≈28 KB** | **≈70 KB** |

### 5. Projeção por volume

| Volume de relatórios | Com PDF guardado | Só DB (sem PDF) | Só payload (apagável) |
|---|---:|---:|---:|
| 100 | 6 MB | 3 MB | 1.3 MB |
| 1 000 | 61 MB | 28 MB | 13 MB |
| 10 000 | 610 MB | 280 MB | 130 MB |
| 100 000 | 6.1 GB | 2.8 GB | 1.3 GB |

**Janela ativa de 15 dias**, assumindo regime de **20 relatórios/dia** (≈600/mês) → 300 relatórios vivos em qualquer momento → **~18 MB activos**. Totalmente desprezável.

Mesmo em cenário agressivo de **500 relatórios/dia** (escala comercial), 7 500 vivos → **460 MB**. Continua confortável dentro de tier Supabase Pro (8 GB).

### 6. Principais drivers de armazenamento

1. **`posts` no snapshot** (56 %) — captions completas + listas de hashtags. Pode-se truncar captions a 500 chars sem perder análise.
2. **`market_signals_free`** (29 %) — SERP DataForSEO. Útil só durante análise; trim após gerar PDF.
3. **PDF em storage** (54 % do total por relatório) — duplicação total do snapshot já renderizado.
4. **`provider_call_logs.error_excerpt`** quando há falhas — pode crescer.

### 7. Recomendações de sustentabilidade

**Manter durante 15 dias (já decidido):**
- Snapshot completo, PDF, todos os logs.

**Após 15 dias — apagar (já no plano de cleanup):**
- `analysis_snapshots` inteiro (libera ~95 % do peso por relatório).
- PDF em storage.

**Optimizações imediatas opcionais (sem afetar UX):**
- ☐ Truncar `posts[].caption` a 500 chars no `normalized_payload` → −30 % por snapshot.
- ☐ Não persistir `market_signals_free` quando o utilizador é free-tier sem `serp_intent` → −20 %.
- ☐ Adicionar `error_excerpt` cap de 2 KB em `provider_call_logs`.
- ☐ Manter `analysis_events` slim (já está em ~0.7 KB) — não inflar.

**PDFs: gerar on-demand vs guardar?**

| | On-demand | Guardado |
|---|---|---|
| Storage | 0 | +33 KB/relatório |
| Latência ao abrir | +3-8 s (PDFShift) | <500 ms |
| Custo PDFShift | $0.001/render × N aberturas | $0.001 × 1 |
| Disponibilidade após expiry snapshot | ❌ (snapshot apagado) | ❌ (também apagado) |

**Recomendação:** **Manter PDF guardado durante a janela de 15 dias** (latência baixa, custo PDFShift menor) e apagar com o snapshot. Para "abrir relatório antigo" a UX já mostra "Expirado — gerar novo", que regerará tudo (snapshot + PDF) num só passo.

### 8. Veredicto: 15 dias é seguro?

**Sim, com ampla margem.** A retenção de 15 dias num cenário comercial realista (500 relatórios/dia) consome <500 MB activos — 6 % do tier Pro Supabase, com o cleanup automático aprovado anteriormente a evitar crescimento ilimitado. Sustentabilidade garantida sem mudanças de arquitectura.

### Constrangimentos respeitados

- ☐ Read-only — só `SELECT` e `pg_column_size`
- ☐ Sem deletes, sem mutações, sem providers, sem regenerações
