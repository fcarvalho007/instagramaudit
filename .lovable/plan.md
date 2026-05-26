
# Integrar dados Socialinsider (Mai 2026) na Knowledge Base e no relatório

Fonte: https://www.socialinsider.io/blog/social-media-posting-frequency/  
Janela do estudo: Out 2025 – Mar 2026

## 1. Knowledge Base (`/admin/conhecimento`)

### 1.1. Nova fonte (`knowledge_sources`)
Migração SQL para inserir 1 linha:
- `name`: "Socialinsider — Social Media Posting Frequency vs Engagement (Mai 2026)"
- `type`: `study`
- `url`: link do post
- `published_at`: 2026-05-26
- `sample_size`: NULL (Socialinsider não publica n exacto no post)
- `notes`: "Janela do dataset: Out 2025 – Mar 2026. Cobre IG, Facebook e LinkedIn — médias agregadas por formato, sem segmentação por tier de seguidores."

### 1.2. Notas editoriais (`knowledge_notes`)
Inserir 4 notas, todas com `source_id` apontando para a fonte acima.

| category | title | resumo do body |
|---|---|---|
| `format` | "Instagram: carrosséis lideram engagement, Reels lideram volume" | Tabela: Carrosséis 5/mês · 0,52% · Reels 10/mês · 0,50% · Imagens 8/mês · 0,35%. Leitura: volume e performance não andam juntos; carrosséis rendem mais com metade dos posts. |
| `format` | "Facebook: Reels lideram engagement, imagens/links dominam volume" | Tabela 5 formatos. Links com 10/mês mas só 0,05% engagement — pior ROI de cadência. |
| `format` | "LinkedIn: documentos nativos com 6,90% engagement com só 2 posts/mês" | Tabela 7 formatos. Imagens lideram volume (7/mês) mas só 5% engagement; native docs e multi-imagens lideram impacto. |
| `trend` | "Cadência sem estratégia é ruído (Socialinsider 2026)" | 4 princípios: 1) benchmarks são ponto de partida, não regra; 2) consistência > volume; 3) cada plataforma é estratégia própria; 4) testar e ajustar continuamente. |

**Porque não entram em `knowledge_benchmarks`:** a tabela é `tier × format` e o estudo é agregado (sem segmentação por nº de seguidores). Misturar nas linhas-alvo distorceria os benchmarks por tier que já temos. Ficam como **notas editoriais** disponíveis para a IA citar.

## 2. Relatório — fonte suave nos cards

Princípio: linha pequena (`text-xs text-content-tertiary`), com o nome da fonte clicável, **só aparece quando a leitura do card cruza com o dado Socialinsider**. Nada de banner, nada de bloco novo — uma linha de rodapé dentro do card, abaixo do `InsightCallout`.

### 2.1. `FormatCard` (`src/components/report-redesign/v2/overview/format-card.tsx`)
Adicionar abaixo do `InsightCallout`:

> _Benchmark Instagram (Socialinsider, Out 2025 – Mar 2026): carrosséis lideram engagement (0,52 %), Reels seguem com 0,50 % a dobro do volume, imagens ficam em 0,35 %._

Gating: só renderiza para análises de Instagram (já é o único caso suportado hoje). Link do nome "Socialinsider" abre o post em nova aba (`rel="noopener noreferrer"`).

### 2.2. `FrequencyCard` (`src/components/report-redesign/v2/overview/frequency-card.tsx`)
Adicionar a mesma linha de rodapé com texto contextual:

> _Referência Instagram (Socialinsider, Out 2025 – Mar 2026): a média do mercado é ≈10 Reels, 8 imagens ou 5 carrosséis por mês — consistência pesa mais do que volume._

### 2.3. i18n
Acrescentar chaves ao namespace `report`:
- `format.source_socialinsider_ig`
- `frequency.source_socialinsider_ig`
- `common.sources.socialinsider_label` ("Socialinsider")

Versões pt-PT e en (manter paridade com as outras strings do card).

## 3. Fora de âmbito
- Não alterar `knowledge_benchmarks` (esquema tier × format incompatível com agregados do estudo).
- Não criar página/secção nova de "fontes em destaque" no relatório.
- Não tocar em Facebook/LinkedIn no relatório (MVP é IG); as notas FB/LinkedIn ficam na KB para uso futuro.
- Não mexer em `/report.example` (locked).

## 4. Checkpoint
- ☐ Migração SQL: 1 source + 4 notes inseridas, visíveis em `/admin/conhecimento`
- ☐ `FormatCard` mostra linha-fonte só para Instagram, com link funcional
- ☐ `FrequencyCard` mostra linha-fonte só para Instagram, com link funcional
- ☐ i18n pt-PT + en adicionadas e sem warnings de chave em falta
- ☐ Sem alterações a `/report.example`, `knowledge_benchmarks` ou ficheiros em `LOCKED_FILES.md`
