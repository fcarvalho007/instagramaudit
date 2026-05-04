
## Contexto

A funcionalidade de lista de relatórios (`/app/reports`, `/app/reports/$id`) e respetivas server functions já estão implementadas e completas. O que falta é **concluir a neutralização do discurso possessivo** ("teu/tua/teus/tuas") que ficou pendente em vários ficheiros.

## Ficheiros e alterações

### 1. Componentes do relatório (report-redesign) — 4 ficheiros

| Ficheiro | Linha | De → Para |
|----------|-------|-----------|
| `report-engagement-benchmark-chart.tsx` | 256 | "Vê se o teu perfil está…teus concorrentes" → "Vê se este perfil está abaixo do mercado ou apenas abaixo dos concorrentes diretos." |
| `overview/competitor-modal.tsx` | 31 | "o teu perfil lado a lado" → "este perfil lado a lado" |
| `overview/competitor-modal.tsx` | 39 | "o teu perfil comparado com os teus concorrentes" → "este perfil comparado com concorrentes diretos" |
| `overview/comparison-header.tsx` | 42 | "vê o teu lado a lado" → "vê este perfil lado a lado" |
| `overview/comparison-header.tsx` | 174 | "todas as tuas redes" → "todas as redes" |
| `overview/frequency-card.tsx` | 27 | "o teu número de seguidores" → "um número de seguidores semelhante" |

### 2. Rotas da app autenticada — 4 ficheiros

| Ficheiro | Alteração |
|----------|-----------|
| `app.reports.tsx` L293 | "o teu histórico" → "o histórico de análises" |
| `app.plan.tsx` L31,104,173,189 | Substituir "teu/tua" por formulação impessoal |
| `app.account.tsx` L108 | "da tua conta" → "da conta" |
| `report-share/report-final-block.tsx` L54 | "a tua rede" → "a rede" |

### 3. Rotas de auth — 3 ficheiros

| Ficheiro | Alteração |
|----------|-----------|
| `signup.tsx` | "tua conta", "teus relatórios", "teu email" → impessoal |
| `login.tsx` | "o teu email" → "o email" |
| `reset-password.tsx` | "o teu email", "a tua conta" → impessoal |

## Notas

- Todas as substituições mantêm o tom em pt-PT, impessoal ou na 2.ª pessoa sem possessivo quando necessário.
- Nenhuma lógica de runtime muda — apenas strings de UI.
- Não se toca em ficheiros bloqueados nem em ficheiros gerados automaticamente.
- Validação final: `rg` confirmará zero ocorrências de "teu |tua |teus |tuas " em `src/`.
