import { createFileRoute } from "@tanstack/react-router";

import { LegalLayout } from "@/components/legal/legal-layout";
import { LEGAL } from "@/lib/brand/legal";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — AuditProfiles" },
      {
        name: "description",
        content:
          "Política de Privacidade do AuditProfiles operado pela Fomentar Sonhos, Lda.: dados tratados, finalidades, subcontratantes e direitos previstos no RGPD.",
      },
      { property: "og:title", content: "Política de Privacidade — AuditProfiles" },
      {
        property: "og:description",
        content:
          "Política de Privacidade do AuditProfiles em conformidade com o RGPD. Dados, finalidades, subcontratantes e direitos.",
      },
    ],
  }),
  component: PrivacidadePage,
});

const TOC = [
  { id: "responsavel", label: "Responsável pelo tratamento" },
  { id: "dados", label: "Dados pessoais recolhidos" },
  { id: "finalidades", label: "Finalidades e bases legais" },
  { id: "partilha", label: "Partilha com terceiros" },
  { id: "transferencias", label: "Transferências internacionais" },
  { id: "conservacao", label: "Prazos de conservação" },
  { id: "direitos", label: "Direitos do titular" },
  { id: "seguranca", label: "Segurança" },
  { id: "cookies", label: "Cookies e armazenamento local" },
  { id: "menores", label: "Menores de idade" },
  { id: "alteracoes", label: "Alterações" },
  { id: "contacto", label: "Contacto" },
];

function PrivacidadePage() {
  return (
    <LegalLayout
      eyebrow="Documento legal"
      title="Política de Privacidade"
      lede="Esta política descreve, de forma clara e prática, que dados pessoais são tratados pelo AuditProfiles, com que finalidades, e quais os direitos dos titulares ao abrigo do Regulamento Geral sobre a Protecção de Dados (RGPD)."
      lastUpdated="11 de Maio de 2026"
      toc={TOC}
    >
      <section id="responsavel">
        <h2>1. Responsável pelo tratamento</h2>
        <p>A entidade responsável pelo tratamento dos dados pessoais é:</p>
        <p>
          <strong>{LEGAL.companyName}</strong>
          <br />
          {LEGAL.address.full}
          <br />
          Email de contacto:{" "}
          <a href={`mailto:${LEGAL.privacyEmail}`}>{LEGAL.privacyEmail}</a>
        </p>
        <p>
          O {LEGAL.productName} é um serviço operado pela {LEGAL.companyName} através do domínio{" "}
          <code>{LEGAL.domain}</code>. Todos os pedidos relacionados com privacidade — incluindo
          exercício de direitos previstos no RGPD — devem ser dirigidos ao email acima.
        </p>
      </section>

      <section id="dados">
        <h2>2. Dados pessoais recolhidos</h2>
        <p>Apenas são recolhidos os dados estritamente necessários para prestar o serviço.</p>
        <h3>2.1 Dados fornecidos directamente</h3>
        <ul>
          <li>Nome próprio e endereço de email, no momento de pedir o relatório.</li>
          <li>
            Indicação opcional de empresa, marca, função profissional e objectivo de utilização.
          </li>
          <li>Texto livre, quando o utilizador opta por descrever uma intenção não listada.</li>
        </ul>
        <h3>2.2 Dados gerados pela utilização do serviço</h3>
        <ul>
          <li>
            Username do Instagram analisado e, quando indicados, usernames adicionais para
            comparação. Estes correspondem a dados públicos de terceiros.
          </li>
          <li>
            Snapshot dos dados públicos recolhidos no momento da análise (perfil, métricas
            agregadas, publicações públicas recentes), associado ao pedido.
          </li>
          <li>
            Histórico de pedidos efectuados a partir do mesmo email, para controlo da quota
            gratuita e prevenção de abuso.
          </li>
        </ul>
        <h3>2.3 Dados técnicos</h3>
        <ul>
          <li>
            Endereço IP, user-agent e registos técnicos das chamadas às APIs do serviço,
            processados pela infraestrutura para fins de segurança, prevenção de abuso e
            diagnóstico operacional.
          </li>
        </ul>
      </section>

      <section id="finalidades">
        <h2>3. Finalidades e bases legais</h2>
        <p>O tratamento é efectuado para as seguintes finalidades, com as bases legais correspondentes:</p>
        <ul>
          <li>
            <strong>Geração e entrega do relatório solicitado</strong>, incluindo envio de
            notificações operacionais por email — execução de contrato a pedido do titular (Art.º
            6.º, n.º 1, alínea b) do RGPD).
          </li>
          <li>
            <strong>Controlo da quota mensal gratuita e prevenção de abuso</strong> do serviço —
            interesse legítimo (Art.º 6.º, n.º 1, alínea f)).
          </li>
          <li>
            <strong>Análise interna de utilização</strong> para validação e melhoria do produto
            durante a fase beta, sem perfilamento individual — interesse legítimo (Art.º 6.º, n.º
            1, alínea f)).
          </li>
          <li>
            <strong>Comunicações comerciais opcionais</strong> — apenas com consentimento expresso
            e separado, retirável a qualquer momento (Art.º 6.º, n.º 1, alínea a)).
          </li>
          <li>
            <strong>Cumprimento de obrigações legais</strong>, quando aplicável (Art.º 6.º, n.º 1,
            alínea c)).
          </li>
        </ul>
        <p>
          Não é efectuado envio de comunicações de marketing nem a inclusão dos dados em qualquer
          newsletter sem consentimento expresso e separado.
        </p>
      </section>

      <section id="partilha">
        <h2>4. Partilha de dados com terceiros</h2>
        <p>
          Os dados pessoais não são partilhados, vendidos, cedidos ou disponibilizados a empresas
          ou entidades terceiras para fins próprios destas.
        </p>
        <p>
          Para prestar o serviço, a {LEGAL.companyName} recorre a subcontratantes técnicos que
          actuam exclusivamente em nome do responsável pelo tratamento, ao abrigo de contratos ou
          termos de tratamento de dados em vigor:
        </p>
        <ul>
          <li>
            <strong>Supabase</strong> — base de dados, armazenamento de ficheiros e autenticação
            (União Europeia).
          </li>
          <li>
            <strong>Lovable Cloud</strong> — alojamento e ambiente de execução (União Europeia).
          </li>
          <li>
            <strong>Cloudflare</strong> — CDN, protecção contra abuso, edge functions (UE + EUA).
          </li>
          <li>
            <strong>Apify</strong> — recolha automática de dados públicos do Instagram (EUA).
          </li>
          <li>
            <strong>Resend</strong> — entrega transaccional de email (EUA).
          </li>
        </ul>
        <p>
          Estes subcontratantes acedem apenas aos dados estritamente necessários para a função
          técnica que prestam e não os utilizam para fins próprios. Quando forem activados
          pagamentos no serviço, esta política será actualizada com a identificação do
          subcontratante de pagamentos.
        </p>
      </section>

      <section id="transferencias">
        <h2>5. Transferências internacionais</h2>
        <p>
          Alguns subcontratantes (designadamente Resend, Apify e parte da infraestrutura
          Cloudflare) podem tratar dados fora do Espaço Económico Europeu, em particular nos
          Estados Unidos da América. Estas transferências apoiam-se nas garantias previstas no
          RGPD, designadamente, e consoante aplicável, o EU&ndash;U.S. Data Privacy Framework e/ou
          Cláusulas Contratuais-Tipo aprovadas pela Comissão Europeia.
        </p>
      </section>

      <section id="conservacao">
        <h2>6. Prazos de conservação</h2>
        <ul>
          <li>
            <strong>Snapshots de análise</strong>: expiram automaticamente 24 horas após a recolha.
          </li>
          <li>
            <strong>Ficheiros PDF dos relatórios</strong>: acessíveis através de ligações
            assinadas com validade de 7 dias. O ficheiro mantém-se em armazenamento privado para
            permitir reenvio, até pedido de eliminação.
          </li>
          <li>
            <strong>Registo de pedidos e dados de contacto</strong> (nome, email, dados
            opcionais): conservados enquanto for necessário para apoio ao serviço e cumprimento
            de obrigações legais, ou até pedido de eliminação por parte do titular. Em caso de
            inactividade prolongada (24 meses), os dados são eliminados ou anonimizados.
          </li>
          <li>
            <strong>Registos técnicos</strong>: conservados pelo período estritamente necessário
            para diagnóstico, segurança e prevenção de abuso, no máximo 90 dias.
          </li>
        </ul>
      </section>

      <section id="direitos">
        <h2>7. Direitos do titular</h2>
        <p>Nos termos do RGPD, o titular pode exercer, a qualquer momento, os seguintes direitos:</p>
        <ul>
          <li>Acesso aos dados pessoais em tratamento;</li>
          <li>Rectificação de dados incorrectos ou desactualizados;</li>
          <li>Apagamento (direito ao esquecimento);</li>
          <li>Limitação do tratamento;</li>
          <li>Portabilidade dos dados;</li>
          <li>Oposição ao tratamento, quando baseado em interesse legítimo;</li>
          <li>Retirada do consentimento, quando o tratamento se baseie em consentimento;</li>
          <li>
            Apresentação de reclamação à autoridade de controlo competente — em Portugal, a
            Comissão Nacional de Protecção de Dados (CNPD) ·{" "}
            <a href="https://www.cnpd.pt" target="_blank" rel="noreferrer">
              www.cnpd.pt
            </a>
            .
          </li>
        </ul>
        <p>
          Os direitos podem ser exercidos por email para{" "}
          <a href={`mailto:${LEGAL.privacyEmail}`}>{LEGAL.privacyEmail}</a>. A
          resposta é prestada no prazo máximo de 30 dias, podendo este ser prorrogado por mais
          dois meses em casos de especial complexidade, com notificação prévia ao titular.
        </p>
      </section>

      <section id="seguranca">
        <h2>8. Segurança</h2>
        <p>
          A {LEGAL.companyName} aplica medidas técnicas e organizativas adequadas para proteger
          os dados pessoais, designadamente: cifragem de ligações em trânsito (HTTPS/TLS),
          separação de privilégios entre ambientes, armazenamento privado dos relatórios PDF com
          acesso por ligação assinada, e restrição do acesso administrativo a sessões
          autenticadas.
        </p>
        <p>
          Em caso de violação de dados pessoais com risco para os direitos e liberdades dos
          titulares, a CNPD será notificada no prazo máximo de 72 horas, e os titulares afectados
          serão informados sem demora injustificada, conforme exigido pelo RGPD.
        </p>
      </section>

      <section id="cookies">
        <h2>9. Cookies e armazenamento local</h2>
        <p>
          O AuditProfiles não utiliza cookies de marketing nem ferramentas de seguimento de
          terceiros (como Google Analytics, Meta Pixel ou semelhantes). São utilizados apenas:
        </p>
        <ul>
          <li>
            <strong>Cookie de sessão da área de administração</strong>: estritamente necessário
            para autenticar o acesso administrativo, marcado <code>HttpOnly</code>.
          </li>
          <li>
            <strong>Preferências de interface</strong> (estado expandido da barra lateral, modo
            escuro): guardadas localmente no navegador para melhorar a experiência de utilização.
            Não saem do dispositivo.
          </li>
        </ul>
        <p>
          Por não existir tratamento para fins de marketing ou perfilamento comportamental, não é
          exibido banner de consentimento de cookies, conforme orientações da CNPD para cookies
          estritamente necessários. Caso, no futuro, sejam introduzidas ferramentas que o exijam,
          será disponibilizado mecanismo de consentimento adequado.
        </p>
      </section>

      <section id="menores">
        <h2>10. Menores de idade</h2>
        <p>
          O serviço destina-se a uso profissional, académico e de investigação por adultos. Não
          são recolhidos, conscientemente, dados pessoais de menores de 16 anos. Caso seja
          detectada essa situação, os dados serão eliminados sem demora.
        </p>
      </section>

      <section id="alteracoes">
        <h2>11. Alterações a esta política</h2>
        <p>
          Esta política pode ser actualizada para reflectir alterações ao serviço ou ao quadro
          legal aplicável. A data de última actualização é indicada no início do documento. Em
          caso de alterações significativas, os utilizadores registados são notificados por email
          com pelo menos 15 dias de antecedência.
        </p>
      </section>

      <section id="contacto">
        <h2>12. Contacto</h2>
        <p>
          Para questões relacionadas com privacidade, exercício de direitos ou pedidos de
          esclarecimento, o contacto é feito através do email:
        </p>
        <p>
          <a href={`mailto:${LEGAL.privacyEmail}`}>{LEGAL.privacyEmail}</a>
          <br />
          {LEGAL.companyName} · {LEGAL.address.full}
        </p>
      </section>
    </LegalLayout>
  );
}
