# Comunicação assistida por Gmail — não existe neste projeto

## Conclusão da verificação

Antes de qualquer edição, procurei em todo o código-fonte (excluindo dependências) por:

- `Abrir no Gmail`, `Enviar email`, `Minuta`
- `Jardim Digital`, `Alvará`, `Estudo Prévio`
- `mail.google.com`, URLs de composição do Gmail
- assinatura institucional / Definições → Assinatura de email

Resultado: **zero ocorrências**. As únicas correspondências a "gmail" são domínios de email numa lista de classificação de leads (`src/lib/leads/email-domain-class.ts`), sem qualquer relação com composição de mensagens.

Este projeto é o **InstaBench** — auditoria competitiva de perfis de Instagram. Não tem workflow comercial, minutas, fases de estudo prévio, registo canónico de comunicações nem camada de assinatura institucional. O `LOCKED_FILES.md` local só protege tokens de design, componentes UI e o shell da aplicação; nenhum ficheiro de comunicação assistida por Gmail está listado porque nenhum existe.

## O que isto significa

O pedido descreve um "desbloqueio mínimo" de ficheiros congelados de outro produto. Aqui não há nada para desbloquear: não existe o modal do screenshot, nem o helper de entrega, nem a fonte canónica da assinatura. Implementar o pedido neste projeto não seria uma alteração mínima — seria construir de raiz um subsistema de comunicação inteiro que o InstaBench não tem.

Por isso **não vou alterar qualquer ficheiro** neste projeto.

## Opções

1. **Encaminhar o pedido para o projeto Jardim Digital** (recomendado). É lá que vivem o modal `Enviar email`, as minutas e a assinatura institucional. O prompt pode ser reutilizado tal como está.
2. **Construir de raiz no InstaBench.** Se quiser mesmo um fluxo de email assistido por Gmail dentro deste produto, isso é trabalho novo e precisa de âmbito próprio: onde vive o modal, que dados preenche, quem o usa (provavelmente o admin), onde fica configurada a assinatura e como se regista o envio. Escrevo um plano dedicado antes de tocar em código.

## Nada foi alterado

Nenhum ficheiro foi criado, editado ou removido. Nenhum email foi enviado. Nenhum ficheiro congelado foi tocado.
