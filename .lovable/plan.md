

## Entendimento da situação real

**O que pedes**: nunca usar Lovable AI; criar secret OpenAI; ler API e listar modelos disponíveis a partir de "ChatGPT 5.4".

**Realidade no código (verificado)**:
- **Não existe geração de IA implementada hoje.** Procurei em todo o `src/` e `supabase/` — zero chamadas a Lovable AI Gateway, zero chamadas a Anthropic, zero chamadas a OpenAI, zero edge functions.
- Os "AI insights" que aparecem no relatório são **mock data hardcoded** em `src/components/report/report-mock-data.ts` (3 insights estáticos sobre `@frederico.marketing`).
- O `LOVABLE_API_KEY` aparece como secret porque é injetado automaticamente pela plataforma (marcado "cannot be deleted") — mas **nunca é lido em código**.
- A única menção textual a "Lovable AI Gateway" está na **política de privacidade** (`/privacidade`), como subcontratante — mas nada o sustenta tecnicamente.

**Consequência**: não há nada para "migrar". Há que **construir** a integração OpenAI de raiz quando chegar a altura, e **corrigir a política de privacidade** que hoje declara um subcontratante que não é usado.

## Resposta à informação pedida

**"ChatGPT 5.4" é a família GPT-5.4 da OpenAI.** Lida diretamente da página oficial de modelos da OpenAI agora mesmo (https://platform.openai.com/docs/models), os modelos disponíveis na família **GPT-5.4** são:

| Model ID | Posicionamento | Input | Output | Context | Max output | Latência |
|---|---|---|---|---|---|---|
| `gpt-5.4` | Flagship — raciocínio complexo, código, fluxos profissionais | $2.50/MTok | $15/MTok | 1M tokens | 128K | Fast |
| `gpt-5.4-mini` | Modelo "mini" mais forte da OpenAI — código, computer use, subagents | $0.75/MTok | $4.50/MTok | 400K tokens | 128K | Faster |
| `gpt-5.4-nano` | Mais barato da classe — tarefas simples de alto volume | $0.20/MTok | $1.25/MTok | 400K tokens | 128K | Faster |

Todos suportam: text+image input, text output, multilingual, vision, reasoning (none/low/medium/high/xhigh), Functions, Web search, File search. Knowledge cutoff: **31 de agosto de 2025**.

Modelos especializados disponíveis na mesma altura (não pertencem à família 5.4 mas funcionam no mesmo API):
- `gpt-image-1.5` e `gpt-image-1-mini` — imagem
- `gpt-realtime-1.5` e `gpt-realtime-mini` — speech-to-speech
- `gpt-4o-mini-tts` — text-to-speech
- `gpt-4o-transcribe` e `gpt-4o-mini-transcribe` — transcrição

Para o caso de uso do InstaBench (insights estratégicos curtos em pt-PT a partir de métricas estruturadas), o ponto ótimo de custo/qualidade é **`gpt-5.4-mini`**. `gpt-5.4` só se justifica se houver raciocínio analítico mais profundo a fazer.

## Bloqueio de segurança antes de criar o secret

Não criei o secret ainda. Antes:

1. **Não partilhes a chave aqui em chat.** O fluxo correto é o tool `add_secret`, que abre um input mascarado no browser — a chave nunca passa pela conversa nem fica em logs. Quando aprovares este plano, eu disparo esse pedido.
2. **A chave deve ter scope restrito.** Recomendo criar um **Project API key** em https://platform.openai.com/api-keys, não uma chave de organização, e dar-lhe acesso apenas aos modelos GPT-5.4 que vais usar.
3. **Definir um spending limit** no projeto OpenAI antes de gerar a chave — para impedir corridas desbocadas em caso de bug ou abuso.

## Plano para esta interação (apenas informativo + secret)

Como o que pediste **explicitamente** foi (a) criar o secret e (b) listar opções a partir de GPT-5.4 — e **não** implementar a integração — o âmbito é mínimo:

1. **Apresentar a lista de modelos** (feito acima, lida em direto da OpenAI agora).
2. **Disparar `add_secret`** para criar `OPENAI_API_KEY` (input mascarado no browser).
3. **Não escrever código de integração ainda** — isso será um prompt próprio com plano dedicado (escolha de modelo, onde injetar o insight no PDF, prompt engineering em pt-PT, error handling, custo por relatório, retry, timeout).
4. **Corrigir uma frase na `/privacidade`**: hoje diz "Lovable AI Gateway e respetivos modelos de IA (incluindo Anthropic) — geração da leitura estratégica incluída no relatório." Isto é **factualmente falso** (não há geração de IA hoje) e vai ficar duplamente errado quando passares a usar OpenAI. Proposta: remover essa linha agora e voltar a adicioná-la (com o nome certo: "OpenAI") apenas quando a integração for de facto implementada.

## Ficheiros tocados nesta interação

- **Nenhum ficheiro de código** (a integração não é âmbito deste prompt).
- **`src/routes/privacidade.tsx`** — remoção de uma linha factualmente incorreta sobre o subcontratante de IA. Esta route não está locked.

## Pergunta de confirmação

**Confirmas que avançamos com**:
1. Criar `OPENAI_API_KEY` via `add_secret` (input mascarado, sem partilhar em chat)
2. Remover da política de privacidade a menção a "Lovable AI Gateway" (que hoje é factualmente falsa) e voltar a colocá-la — com o nome "OpenAI" — quando a integração for implementada
3. **Não** escrever código de integração agora — fica para um prompt próprio com plano dedicado

Se confirmares, no próximo turno eu disparo o `add_secret` (sem mais código) e edito a linha da privacidade. Se quiseres já o plano da integração, di-lo e abro um plano separado para isso.

