## Objetivo

Atualizar os 4 documentos legais do InstaBench com os textos completos fornecidos, alinhados com RGPD + Digital Services Act + Decreto-Lei 7/2004, e identificação completa da Fomentar Sonhos, Lda.

## Estado atual

- `src/routes/privacidade.tsx` — existe (versão antiga, com placeholder `[Nome do responsável · NIF · morada — a indicar em revisão posterior]` e subcontratantes parcialmente diferentes).
- `src/routes/termos.tsx` — existe (versão antiga, sem identificação da empresa).
- `src/routes/cookies.tsx` — **não existe** (mas footer já linka `/cookies` → 404 atual).
- `src/routes/aviso-legal.tsx` — **não existe** (footer não linka).
- `src/components/legal/legal-layout.tsx` — wrapper reutilizável (eyebrow, title, lede, lastUpdated, TOC, slot de conteúdo).
- `src/components/layout/footer.tsx` — tem `Privacidade`, `Termos`, `Cookies`. Falta `Aviso legal`.

## Tensão a confirmar antes de implementar

**Ortografia.** O texto fornecido usa pré-AO90 ("protecção", "actualização", "directamente", "actuam", "efectuado", "electrónico", "Outubro"). A regra workspace é AO90 ("proteção", "atualização", "diretamente", "atuam", "efetuado", "eletrónico"). Em documentos legais, recomenda-se uniformidade. **Vou seguir o texto verbatim como fornecido** (preserva intenção editorial e tom jurídico do utilizador) e sinalizar este desvio. Se preferires AO90, indica e converto antes de gravar.

**Data de publicação.** Substituo `[DATA]` por **"11 de maio de 2026"** (data atual). Confirma se preferes outra data.

**NIF.** O texto recomenda acrescentar o NIF da Fomentar Sonhos, Lda. Não foi fornecido. **Não vou inventar.** Deixo a identificação como nos documentos (sem NIF) e crio uma única linha pendente em `LOCKED_FILES.md`/comentário a marcar TODO. Se quiseres incluir agora, partilha o NIF.

## Alterações

### 1. Reescrever `src/routes/privacidade.tsx`
Substituir conteúdo do `LegalLayout` pelo Documento 1 completo:
- 12 secções com TOC atualizado: `responsavel`, `dados`, `finalidades`, `partilha`, `transferencias`, `conservacao`, `direitos`, `seguranca`, `cookies`, `menores`, `alteracoes`, `contacto`.
- Título permanece "Política de Privacidade".
- `lastUpdated="11 de maio de 2026"`.
- Identificação completa: Fomentar Sonhos, Lda. · Rua da Carvalha n.º 570 · 2400-441 Leiria · `frederico.carvalho@digitalfc.pt`.
- Tabela de subcontratantes (5 linhas: Supabase, Lovable Cloud, Cloudflare, Apify, Resend) renderizada como `<table>` semântica dentro do `LegalLayout`. Verificar se `legal-layout.tsx` aplica estilos a `table`; caso contrário, ajustar copy para `<ul>` para garantir legibilidade sem tocar no layout.
- Atualizar `meta` description para refletir a nova identificação.
- Manter rodapé editorial sobre não-afiliação à Meta e disclaimer de aconselhamento jurídico.

### 2. Reescrever `src/routes/termos.tsx`
Substituir conteúdo pelo Documento 2 completo:
- 12 secções, TOC atualizado: `prestador`, `objeto`, `aceitacao`, `conta`, `permitido`, `proibido`, `propriedade`, `responsabilidade`, `alteracoes`, `cancelamento`, `lei-foro`, `contacto`.
- Identificação completa do prestador no topo.
- `lastUpdated="11 de maio de 2026"`.
- Link para plataforma europeia ODR e `consumidor.gov.pt`.

### 3. Criar `src/routes/aviso-legal.tsx`
Novo ficheiro com Documento 3 (DSA):
- Mesmo padrão `createFileRoute("/aviso-legal")` + `LegalLayout`.
- Eyebrow: "Documento legal", título "Aviso Legal".
- TOC: `identificacao`, `natureza`, `contacto-reclamacoes`, `conteudo-gerado`, `direitos-titulares`, `publicidade`, `recomendacao`, `autoridades`.
- Meta tags próprias (title, description, og:title, og:description) — sem reutilizar a home.

### 4. Criar `src/routes/cookies.tsx`
Novo ficheiro com Documento 4:
- Tabela com 2 cookies (`ib_session`, `ib_ui_prefs`) — render como `<table>` ou `<ul>` consoante suporte do `LegalLayout`.
- Lista de ferramentas que NÃO são utilizadas.
- Meta tags próprias.

> **Nota técnica:** os nomes de cookies `ib_session` e `ib_ui_prefs` no documento são **declarativos**. Verifico que correspondem à realidade do código; se a implementação real usa nomes diferentes (ex: `sb-*` do Supabase), peço orientação antes de publicar — caso contrário criamos exposição falsa. Esta verificação acontece **na implementação**, não agora.

### 5. Atualizar `src/components/layout/footer.tsx`
Adicionar entrada `{ label: "Aviso legal", href: "/aviso-legal" }` na lista de links legais (entre `Termos` e `Cookies`). Sem outras alterações de design.

## Fora de scope

- Não toco em `LOCKED_FILES.md` (a menos que seja necessário desbloquear `legal-layout.tsx` — não previsto).
- Não altero `legal-layout.tsx` salvo se a tabela de subcontratantes não renderizar legivelmente (decisão durante a implementação; fallback: usar `<ul>` em vez de `<table>` para evitar editar o layout).
- Não envio nem agendo notificação de "alterações materiais" aos utilizadores registados — é decisão do dono.
- Não corrijo a ortografia dos textos (ver tensão acima).

## Validação

- `bunx tsc --noEmit`
- Visual: abrir `/privacidade`, `/termos`, `/aviso-legal`, `/cookies` no preview e verificar TOC + secções + tabelas.
- Confirmar que footer mostra os 4 links e nenhum dá 404.
- Confirmar que `routeTree.gen.ts` regenera as 2 rotas novas (TanStack faz automaticamente).

## Riscos

- **Cookie names**: se `ib_session`/`ib_ui_prefs` não existirem no código real, a Política de Cookies fica imprecisa. Verifico em código antes de publicar e sinalizo se houver divergência.
- **Tabela de subcontratantes**: se o `legal-layout.tsx` não estilizar `<table>`, fallback é lista — sem perder informação.
- **Ortografia mista** (pré-AO90 nos novos vs. AO90 nos componentes do produto): aceitável em documentos legais; sinalizado.

## Checkpoint

☐ Confirmar data de publicação (default: 11 maio 2026)
☐ Confirmar manter ortografia pré-AO90 dos textos legais (ou converter para AO90)
☐ Indicar NIF da Fomentar Sonhos, Lda. (ou aceitar omissão temporária)
☐ Aprovar plano para implementação
