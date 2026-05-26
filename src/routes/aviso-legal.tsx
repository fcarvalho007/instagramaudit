import { createFileRoute } from "@tanstack/react-router";

import { LegalLayout } from "@/components/legal/legal-layout";
import { LEGAL } from "@/lib/brand/legal";

export const Route = createFileRoute("/aviso-legal")({
  head: () => ({
    meta: [
      { title: "Aviso Legal — AuditProfiles" },
      {
        name: "description",
        content:
          "Aviso Legal do AuditProfiles ao abrigo do Digital Services Act e do Decreto-Lei 7/2004: identificação do operador, contacto, transparência e autoridades de supervisão.",
      },
      { property: "og:title", content: "Aviso Legal — AuditProfiles" },
      {
        property: "og:description",
        content:
          "Documento de transparência do AuditProfiles ao abrigo do Digital Services Act (UE 2022/2065).",
      },
    ],
  }),
  component: AvisoLegalPage,
});

const TOC = [
  { id: "identificacao", label: "Identificação do operador" },
  { id: "natureza", label: "Natureza do serviço" },
  { id: "contacto-reclamacoes", label: "Contacto e reclamações" },
  { id: "conteudo-gerado", label: "Conteúdo gerado pela plataforma" },
  { id: "direitos-titulares", label: "Direitos dos titulares analisados" },
  { id: "publicidade", label: "Transparência publicitária" },
  { id: "recomendacao", label: "Sistema de recomendação" },
  { id: "autoridades", label: "Autoridades de supervisão" },
];

function AvisoLegalPage() {
  return (
    <LegalLayout
      eyebrow="Documento legal"
      title="Aviso Legal"
      lede="Documento de transparência ao abrigo do Regulamento (UE) 2022/2065 — Digital Services Act (DSA) — e do Decreto-Lei n.º 7/2004 (comércio electrónico)."
      lastUpdated="11 de Maio de 2026"
      toc={TOC}
    >
      <section id="identificacao">
        <h2>1. Identificação do operador</h2>
        <p>
          <strong>{LEGAL.companyName}</strong>
          <br />
          Sede: {LEGAL.address.full}
          <br />
          Contacto único para comunicações de utilizadores e autoridades:{" "}
          <a href={`mailto:${LEGAL.privacyEmail}`}>{LEGAL.privacyEmail}</a>
          <br />
          Responsável pelo serviço {LEGAL.productName}: {LEGAL.responsibleName}
        </p>
      </section>

      <section id="natureza">
        <h2>2. Natureza do serviço</h2>
        <p>
          O AuditProfiles é uma plataforma de análise de perfis públicos de Instagram. Não é uma
          rede social, marketplace, motor de busca ou intermediário de conteúdo de terceiros nos
          termos definidos pelo DSA. O serviço analisa exclusivamente dados públicos disponíveis
          no Instagram, gerando relatórios editoriais para o utilizador que solicita a análise.
        </p>
      </section>

      <section id="contacto-reclamacoes">
        <h2>3. Mecanismo de contacto e reclamações</h2>
        <p>
          Qualquer utilizador, pessoa singular ou colectiva — incluindo titulares de perfis
          analisados — pode contactar o operador através do email{" "}
          <a href={`mailto:${LEGAL.privacyEmail}`}>{LEGAL.privacyEmail}</a>,
          designadamente para:
        </p>
        <ul>
          <li>Solicitar esclarecimentos sobre o funcionamento do serviço;</li>
          <li>Apresentar reclamações sobre o relatório ou o seu conteúdo;</li>
          <li>Solicitar a eliminação de dados pessoais ou a retirada de análises;</li>
          <li>Notificar conteúdos potencialmente ilegais.</li>
        </ul>
        <p>A resposta é prestada no prazo máximo de 15 dias úteis.</p>
      </section>

      <section id="conteudo-gerado">
        <h2>4. Conteúdo gerado pela plataforma</h2>
        <p>
          Os relatórios são gerados de forma automática, com base em algoritmos editoriais
          aplicados a dados públicos disponíveis no Instagram à data de consulta. As conclusões
          editoriais são produzidas por sistemas automatizados e revistas por critérios
          algorítmicos pré-definidos, idênticos para todos os utilizadores.
        </p>
        <p>
          O operador não modera conteúdo de terceiros, uma vez que não aloja conteúdo gerado por
          utilizadores. Os relatórios são disponibilizados apenas ao utilizador que os solicita e
          à pessoa cujo perfil foi analisado, em caso de pedido legítimo.
        </p>
      </section>

      <section id="direitos-titulares">
        <h2>5. Direitos dos titulares dos perfis analisados</h2>
        <p>
          Qualquer titular de um perfil de Instagram analisado pela plataforma pode, a qualquer
          momento:
        </p>
        <ul>
          <li>Solicitar acesso ao relatório gerado sobre o seu próprio perfil;</li>
          <li>Solicitar a eliminação imediata de qualquer relatório que o tenha como objecto;</li>
          <li>Solicitar a inclusão do seu username numa lista de exclusão futura.</li>
        </ul>
        <p>Estes pedidos são gratuitos e tratados no prazo máximo de 15 dias úteis.</p>
      </section>

      <section id="publicidade">
        <h2>6. Transparência publicitária</h2>
        <p>O AuditProfiles:</p>
        <ul>
          <li>Não exibe publicidade de terceiros;</li>
          <li>Não comercializa dados dos utilizadores;</li>
          <li>Não utiliza os dados recolhidos para perfilamento publicitário.</li>
        </ul>
        <p>
          Eventuais comunicações comerciais sobre o próprio serviço são enviadas apenas a
          utilizadores que tenham dado consentimento explícito e podem ser canceladas a qualquer
          momento.
        </p>
      </section>

      <section id="recomendacao">
        <h2>7. Sistema de recomendação</h2>
        <p>
          A plataforma não opera sistemas de recomendação baseados em comportamento dos
          utilizadores. As análises e diagnósticos são gerados por critérios editoriais
          transparentes e idênticos para todos os pedidos.
        </p>
      </section>

      <section id="autoridades">
        <h2>8. Autoridades de supervisão</h2>
        <ul>
          <li>
            Para matérias abrangidas pelo DSA:{" "}
            <strong>ANACOM — Autoridade Nacional de Comunicações</strong> ·{" "}
            <a href="https://www.anacom.pt" target="_blank" rel="noreferrer">
              www.anacom.pt
            </a>
          </li>
          <li>
            Para matérias de protecção de dados pessoais:{" "}
            <strong>CNPD — Comissão Nacional de Protecção de Dados</strong> ·{" "}
            <a href="https://www.cnpd.pt" target="_blank" rel="noreferrer">
              www.cnpd.pt
            </a>
          </li>
          <li>
            Para questões de consumo: <strong>DECO</strong> ou{" "}
            <strong>
              Centro Nacional de Informação e Arbitragem de Conflitos de Consumo (CNIACC)
            </strong>{" "}
            ·{" "}
            <a href="https://www.cniacc.pt" target="_blank" rel="noreferrer">
              www.cniacc.pt
            </a>
          </li>
        </ul>
      </section>
    </LegalLayout>
  );
}
