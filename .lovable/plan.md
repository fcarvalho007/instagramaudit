# Editorial V2 — acesso fiável à pré-visualização

## Diagnóstico (verificado no browser, dados reais)

O interruptor **funciona**. Corri as duas variantes contra um relatório real (`karmel.pt`) no servidor de desenvolvimento e confirmei:

| | URL final | raiz `data-report-design="editorial_v2"` | `#visao-geral` | `#formatos` |
|---|---|---|---|---|
| Produção | `/analyze/karmel.pt` | ausente | 0 | 0 |
| Editorial V2 | `/analyze/karmel.pt?report_design=editorial_v2` | presente | 1 | 1 |

O parâmetro **não é removido** por nenhum redireccionamento: o URL final após o carregamento completo é idêntico ao pedido. As capturas a 1440px mostram duas páginas materialmente diferentes (produção tem barra lateral de secções, cartões Iconosquare e gráfico de escalões; Editorial V2 tem bandas de duas colunas, títulos Fraunces, blocos Observação/Leitura e sem barra lateral).

### Causa provável do que viu

O Editorial V2 só está ligado a **uma** rota. As restantes superfícies ignoram o parâmetro por completo e renderizam sempre `ReportShellV2` de produção:

- `/analyze/$username` — **suporta** Editorial V2 (único ponto de entrada).
- `/reports/$snapshotId` — não suporta (importa `ReportShellV2` directamente).
- `admin_.report-preview.$username` e `admin_.report-preview.snapshot.$snapshotId` — não suportam.
- Report Lab (`admin-report-lab.full-preview.$handle`) — não suporta.
- `report.print.$snapshotId` / PDF — não suporta (intencional).

Quem abre um relatório a partir do histórico em `/app/reports` cai em `/reports/$snapshotId` e vê sempre o desenho de produção, mesmo acrescentando o parâmetro. Segunda hipótese: em sessão anónima as secções Publicações-chave e Conversas estão fechadas por gating, pelo que a página é mais curta do que se espera — mas o topo continua visivelmente diferente.

## Alterações propostas

Só apresentação e diagnóstico. Nenhuma mudança em dados, cálculos, gating, entitlements, pagamentos, créditos, checkout, janelas 30d/90d, concorrentes, cache, analytics, PDF ou no conteúdo de qualquer secção já migrada.

### 1. Indicador de pré-visualização (dev-only)

Pequeno selo fixo `Editorial V2 · Preview` no canto inferior esquerdo, dentro de `EditorialV2Shell`. Visível apenas quando o Editorial V2 está montado e apenas fora de produção (`import.meta.env.DEV` ou domínio de pré-visualização), com comentário `TODO: remover antes do lançamento público` junto ao andaime já existente no shell. Torna imediatamente inequívoco qual a variante activa.

### 2. Suporte do parâmetro em `/reports/$snapshotId`

Trocar `ReportShellV2` por `ReportPresentation` nesta rota e acrescentar `report_design` ao `validateSearch`, exactamente como em `/analyze/$username`. Mesmas props, mesmo gating, mesmo default. É a rota por onde os relatórios guardados são abertos, e sem isto a comparação continua a falhar para quem vem do histórico. Admin preview, Report Lab e PDF ficam deliberadamente de fora.

### 3. Teste ao nível do browser

Novo `src/components/report-editorial-v2/__tests__/route-switch.browser.test.ts`, a correr contra a rota real no servidor de desenvolvimento (Playwright, sem mocks de `ReportPresentation`), a provar:

1. URL por defeito monta o shell de produção e não tem a raiz Editorial V2;
2. `?report_design=editorial_v2` monta `EditorialV2Shell`;
3. o DOM Editorial V2 contém marcadores únicos de pelo menos três secções migradas;
4. remover o parâmetro devolve o desenho antigo;
5. o URL final após carregamento mantém o parâmetro (nenhum redireccionamento o remove).

Se o ambiente de testes não conseguir garantir o servidor a correr, o teste é marcado como saltado em vez de falhar de forma opaca.

## URLs de QA

- Produção: `http://localhost:8080/analyze/karmel.pt`
- Editorial V2: `http://localhost:8080/analyze/karmel.pt?report_design=editorial_v2`
- Com parâmetros existentes: `/analyze/karmel.pt?w=90d&report_design=editorial_v2`
- Publicado: `https://auditprofiles.com/analyze/karmel.pt?report_design=editorial_v2`
- Perfis reais disponíveis para QA: `karmel.pt`, `flordemaracuja.loja_oficial`, `imarianatavares`, `apm_cmr`

## Validação

Capturas lado a lado a 1440px (produção vs Editorial V2) e Editorial V2 a 375px, com dados reais; typecheck; suite Editorial V2; teste de browser novo. Nenhuma secção nova é migrada e o Diagnóstico Editorial fica para a tarefa seguinte.
