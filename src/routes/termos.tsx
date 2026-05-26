import { createFileRoute } from "@tanstack/react-router";

import { LegalLayout } from "@/components/legal/legal-layout";
import { LEGAL } from "@/lib/brand/legal";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos e Condições — AuditProfiles" },
      {
        name: "description",
        content:
          "Termos e Condições de utilização do AuditProfiles, prestado pela Fomentar Sonhos, Lda. Identificação do prestador, objecto, regras de utilização e limites de responsabilidade.",
      },
      { property: "og:title", content: "Termos e Condições — AuditProfiles" },
      {
        property: "og:description",
        content:
          "Termos e Condições do AuditProfiles: identificação do prestador, regras de utilização, propriedade intelectual e limites de responsabilidade.",
      },
    ],
  }),
  component: TermosPage,
});

const TOC = [
  { id: "prestador", label: "Identificação do prestador" },
  { id: "objeto", label: "Objecto do serviço" },
  { id: "aceitacao", label: "Aceitação dos termos" },
  { id: "conta", label: "Conta e elegibilidade" },
  { id: "permitido", label: "Utilização permitida" },
  { id: "proibido", label: "Utilização proibida" },
  { id: "propriedade", label: "Conteúdo gerado e PI" },
  { id: "responsabilidade", label: "Limites de responsabilidade" },
  { id: "alteracoes", label: "Alterações ao serviço e termos" },
  { id: "cancelamento", label: "Cancelamento e eliminação" },
  { id: "lei-foro", label: "Lei aplicável e foro" },
  { id: "contacto", label: "Contacto" },
];

function TermosPage() {
  return (
    <LegalLayout
      eyebrow="Documento legal"
      title="Termos e Condições de Utilização"
      lede={
        "Os presentes termos regulam o acesso e a utilização da plataforma AuditProfiles (doravante \u201Co Serviço\u201D), prestada pela Fomentar Sonhos, Lda."
      }
      lastUpdated="11 de Maio de 2026"
      toc={TOC}
    >
      <section id="prestador">
        <h2>1. Identificação do prestador</h2>
        <p>O Serviço é prestado por:</p>
        <p>
          <strong>{LEGAL.companyName}</strong>
          <br />
          {LEGAL.address.full}
          <br />
          Contacto:{" "}
          <a href={`mailto:${LEGAL.privacyEmail}`}>{LEGAL.privacyEmail}</a>
        </p>
        <p>
          Esta identificação cumpre o disposto no Decreto-Lei n.º 7/2004 (comércio electrónico) e
          no Regulamento (UE) 2022/2065 — Digital Services Act.
        </p>
      </section>

      <section id="objeto">
        <h2>2. Objecto do serviço</h2>
        <p>
          O AuditProfiles é uma ferramenta de análise editorial de perfis públicos de Instagram. A
          partir de um username indicado pelo utilizador, gera um relatório com diagnóstico de
          conteúdo, desempenho e oportunidade competitiva, com base em dados públicos disponíveis
          na plataforma Instagram à data da consulta.
        </p>
        <p>
          O serviço encontra-se em fase beta. As funcionalidades, condições de acesso, limites e
          preços podem ser ajustados, com aviso prévio aos utilizadores activos sempre que tal
          seja materialmente relevante.
        </p>
      </section>

      <section id="aceitacao">
        <h2>3. Aceitação dos termos</h2>
        <p>
          Ao utilizar o Serviço, o utilizador declara ter lido, compreendido e aceite estes
          Termos e Condições, bem como a <a href="/privacidade">Política de Privacidade</a>. Caso
          não concorde com qualquer disposição, deve abster-se de utilizar o Serviço.
        </p>
      </section>

      <section id="conta">
        <h2>4. Conta e elegibilidade</h2>
        <p>
          O Serviço destina-se a utilizadores adultos (com idade igual ou superior a 18 anos), em
          contexto profissional, académico ou de investigação. O utilizador compromete-se a
          fornecer informação verdadeira e a manter actualizados os dados de contacto.
        </p>
      </section>

      <section id="permitido">
        <h2>5. Utilização permitida</h2>
        <p>O utilizador pode usar o Serviço para:</p>
        <ul>
          <li>Auditar perfis próprios ou de marcas que representa;</li>
          <li>Analisar perfis de clientes, mediante autorização destes;</li>
          <li>Comparar perfis para fins de benchmarking competitivo;</li>
          <li>Investigação académica ou docente, com finalidade pedagógica.</li>
        </ul>
      </section>

      <section id="proibido">
        <h2>6. Utilização proibida</h2>
        <p>O utilizador compromete-se a não:</p>
        <ul>
          <li>
            Utilizar o Serviço para stalking, assédio, perseguição ou qualquer forma de abuso
            direccionado a indivíduos;
          </li>
          <li>Recolher ou redistribuir dados de menores de idade;</li>
          <li>
            Tentar contornar limites técnicos, controlos de quota ou mecanismos de segurança da
            plataforma;
          </li>
          <li>Usar a plataforma para automação ou scraping massivo dos seus resultados;</li>
          <li>
            Reproduzir, redistribuir ou comercializar relatórios em nome próprio sem autorização
            escrita;
          </li>
          <li>
            Apresentar o Serviço como afiliado, patrocinado ou aprovado pela Meta Platforms, Inc.
            ou pelo Instagram.
          </li>
        </ul>
        <p>
          O incumprimento destas regras pode levar à suspensão ou cancelamento imediato do acesso,
          sem direito a reembolso.
        </p>
      </section>

      <section id="propriedade">
        <h2>7. Conteúdo gerado e propriedade intelectual</h2>
        <p>
          A análise editorial, layout, copywriting e design do relatório são da titularidade
          exclusiva da Fomentar Sonhos, Lda. O utilizador recebe uma licença não-exclusiva,
          não-transferível e revogável para uso interno, sendo permitida a apresentação do
          relatório a clientes ou em contexto académico desde que não seja alterado,
          despersonalizado ou apresentado como obra própria.
        </p>
        <p>
          Os dados públicos do Instagram analisados continuam a pertencer aos respectivos
          titulares e à Meta Platforms, Inc., conforme termos da plataforma de origem.
        </p>
      </section>

      <section id="responsabilidade">
        <h2>8. Limites de responsabilidade</h2>
        <p>
          O Serviço é prestado &ldquo;tal como está&rdquo;, no contexto de uma versão beta. A
          Fomentar Sonhos, Lda. não garante:
        </p>
        <ul>
          <li>Disponibilidade ininterrupta;</li>
          <li>Ausência de erros nos dados ou nas conclusões editoriais;</li>
          <li>Adequação do relatório a um fim específico;</li>
          <li>
            Resultados de marketing ou crescimento de audiência decorrentes da aplicação das
            recomendações.
          </li>
        </ul>
        <p>
          O utilizador é o único responsável pelas decisões tomadas com base no relatório. A
          responsabilidade da Fomentar Sonhos, Lda. limita-se, em qualquer caso, ao montante
          efectivamente pago pelo utilizador nos 12 meses anteriores ao facto que gere a
          responsabilidade.
        </p>
      </section>

      <section id="alteracoes">
        <h2>9. Alterações ao serviço e aos termos</h2>
        <p>
          A Fomentar Sonhos, Lda. reserva-se o direito de alterar funcionalidades, condições de
          acesso, limites e preços. Alterações materiais aos Termos e Condições serão notificadas
          por email com pelo menos 15 dias de antecedência. A continuação de utilização após a
          entrada em vigor das novas condições implica a sua aceitação.
        </p>
      </section>

      <section id="cancelamento">
        <h2>10. Cancelamento e eliminação de conta</h2>
        <p>
          O utilizador pode cancelar a conta e solicitar a eliminação de dados a qualquer momento,
          por email para{" "}
          <a href={`mailto:${LEGAL.privacyEmail}`}>{LEGAL.privacyEmail}</a>. A
          eliminação é processada em até 30 dias, podendo subsistir registos mínimos exigidos por
          obrigação legal (designadamente facturação).
        </p>
      </section>

      <section id="lei-foro">
        <h2>11. Lei aplicável e foro</h2>
        <p>
          Estes Termos regem-se pela legislação portuguesa. Para resolução de qualquer litígio, é
          competente o foro da comarca de Leiria, com renúncia expressa a qualquer outro, sem
          prejuízo dos direitos do consumidor previstos na lei portuguesa e europeia.
        </p>
        <p>
          Em caso de litígio de consumo, o utilizador pode recorrer à plataforma europeia de
          resolução de litígios em linha —{" "}
          <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noreferrer">
            ec.europa.eu/consumers/odr
          </a>{" "}
          — ou às entidades de resolução alternativa de litígios reconhecidas em Portugal (lista
          em{" "}
          <a href="https://www.consumidor.gov.pt" target="_blank" rel="noreferrer">
            consumidor.gov.pt
          </a>
          ).
        </p>
      </section>

      <section id="contacto">
        <h2>12. Contacto</h2>
        <p>Para qualquer questão relacionada com estes Termos:</p>
        <p>
          <a href={`mailto:${LEGAL.privacyEmail}`}>{LEGAL.privacyEmail}</a>
          <br />
          {LEGAL.companyName} · {LEGAL.address.full}
        </p>
      </section>
    </LegalLayout>
  );
}
