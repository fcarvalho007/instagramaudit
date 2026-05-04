
## Problema

A bottom nav mobile atual mostra 6 ícones pequenos (grid-cols-6) com labels de 9px — demasiado apertado e pouco legível. O utilizador quer ícones maiores, mais claros, com indicação de scroll ativo, e um menu hamburger para acesso a todas as secções.

## Solução

Redesenhar `ReportBlockTopTabs` com uma abordagem de **3 ícones contextuais + hamburger**:

### 1. Bottom bar com 3+1 layout

- **3 ícones principais** — os 3 blocos mais próximos da posição de scroll atual (o ativo + os adjacentes). Ícones `size-7` (28px) com label descritivo por baixo (`text-[11px]`).
- **1 botão hamburger** (Menu icon) no extremo direito, que abre um sheet/drawer com a lista completa das 6 secções para navegação direta.
- Conforme o utilizador faz scroll, os 3 ícones visíveis atualizam-se dinamicamente para refletir a zona atual do relatório.

### 2. Indicador de secção ativa

- O ícone ativo terá cor azul (`text-blue-600`), peso de stroke maior, e uma barra superior azul animada.
- Os outros 2 ícones visíveis ficam em `text-slate-400` subtil.

### 3. Menu hamburger (Sheet drawer)

- Ao tocar no ícone hamburger, abre um `Sheet` (shadcn/ui) a partir do fundo.
- Lista as 6 secções com número, ícone e label completo — o mesmo conteúdo da sidebar desktop.
- Ao selecionar uma secção, o sheet fecha e faz scroll suave até ao bloco.

## Ficheiros a editar

| Ficheiro | Alteração |
|---|---|
| `src/components/report-redesign/v2/report-block-nav.tsx` | Reescrever `ReportBlockTopTabs` com layout 3+1, lógica de ícones contextuais e integração do Sheet hamburger |
| `src/components/report-redesign/v2/block-config.ts` | Sem alterações |
| `src/components/report-redesign/v2/report-shell-v2.tsx` | Sem alterações |

## Detalhes técnicos

- Lógica de "3 ícones visíveis": dado o índice do bloco ativo, mostrar `[ativo-1, ativo, ativo+1]` (clamped nos limites 0–5).
- O Sheet usa o componente `Sheet` de shadcn/ui (já disponível no projeto).
- Ícones vêm do `block.icon` existente em `BLOCKS`.
- `min-h-[64px]` na bar para thumb zone confortável.
- Transição suave nos ícones ao mudar de contexto.
