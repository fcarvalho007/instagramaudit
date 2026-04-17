import { createFileRoute } from "@tanstack/react-router";

import { LegalLayout } from "@/components/legal/legal-layout";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — InstaBench" },
      {
        name: "description",
        content:
          "Política de Privacidade do InstaBench: que dados são recolhidos, com que finalidades, com que subcontratantes e como exercer os direitos previstos no RGPD.",
      },
      { property: "og:title", content: "Política de Privacidade — InstaBench" },
      {
        property: "og:description",
        content:
          "Política de Privacidade do InstaBench em conformidade com o RGPD. Dados recolhidos, finalidades, subcontratantes e direitos.",
      },
    ],
  }),
  component: PrivacidadePage,
});

const TOC = [
  { id: "responsavel", label: "Responsável pelo tratamento" },
  { id: "dados", label: "Dados recolhidos" },
  { id: "finalidades", label: "Finalidades e bases legais" },
  { id: "subcontratantes", label: "Subcontratantes" },
  { id: "transferencias", label: "Transferências internacionais" },
  { id: "retencao", label: "Retenção" },
  { id: "direitos", label: "Direitos do titular" },
  { id: "seguranca", label: "Segurança" },
  { id: "cookies", label: "Cookies" },
  { id: "menores", label: "Menores" },
  { id: "alteracoes", label: "Alterações" },
  { id: "contacto", label: "Contacto" },
];

function PrivacidadePage() {
  return (
    <LegalLayout
      eyebrow="Documento legal"
      title="Política de Privacidade"
      lede="Esta política descreve, de forma clara e prática, que dados pessoais são recolhidos pelo InstaBench, com que finalidades são tratados e quais os direitos dos titulares ao abrigo do Regulamento Geral sobre a Proteção de Dados (RGPD)."
      lastUpdated="17 de abril de 2026"
      toc={TOC}
    >
      <section id="responsavel">
        <h2>1. Responsável pelo tratamento</h2>
        <p>
          O responsável pelo tratamento dos dados pessoais é o InstaBench, projeto operado a partir
          de Portugal através do domínio <code>instabench.pt</code>.
        </p>
        <p>
          <strong>Identificação completa</strong>: [Nome do responsável · NIF · morada — a indicar
          em revisão posterior]. Todos os pedidos relacionados com privacidade podem ser dirigidos
          ao endereço de contacto indicado no fim deste documento.
        </p>
      </section>

      <section id="dados">
        <h2>2. Dados pessoais recolhidos</h2>
        <p>
          Apenas são recolhidos os dados estritamente necessários para prestar o serviço. Em
          concreto:
        </p>
        <h3>2.1. Dados fornecidos diretamente</h3>
        <ul>
          <li>
            <strong>Nome</strong> e <strong>email</strong> ao solicitar o relatório completo.
          </li>
          <li>
            <strong>Empresa ou marca</strong> (campo opcional) ao solicitar o relatório completo.
          </li>
        </ul>
        <h3>2.2. Dados gerados pela utilização do serviço</h3>
        <ul>
          <li>
            <strong>Username do Instagram analisado</strong> e, quando indicados, usernames de
            concorrentes para comparação. Estes correspondem a dados públicos de terceiros.
          </li>
          <li>
            <strong>Snapshot dos dados públicos</strong> recolhidos do Instagram no momento da
            análise (perfil, métricas agregadas, publicações públicas recentes), associado ao
            pedido.
          </li>
          <li>
            <strong>Histórico de pedidos de relatório</strong> efetuados a partir do mesmo email,
            para efeitos de controlo da quota mensal gratuita.
          </li>
        </ul>
        <h3>2.3. Dados técnicos</h3>
        <ul>
          <li>
            <strong>Endereço IP</strong>, <strong>user-agent</strong> e registos técnicos das
            chamadas às APIs do serviço, processados pela infraestrutura para fins de segurança,
            prevenção de abuso e diagnóstico operacional.
          </li>
        </ul>
      </section>

      <section id="finalidades">
        <h2>3. Finalidades e bases legais</h2>
        <p>O tratamento de dados é efetuado para as seguintes finalidades:</p>
        <ul>
          <li>
            <strong>Geração e entrega do relatório</strong> solicitado, incluindo envio do PDF para
            o email indicado — base legal: execução de contrato a pedido do titular (Art.º 6.º,
            n.º 1, alínea b) do RGPD).
          </li>
          <li>
            <strong>Controlo da quota mensal gratuita</strong> e prevenção de abuso do serviço —
            base legal: interesse legítimo (Art.º 6.º, n.º 1, alínea f) do RGPD).
          </li>
          <li>
            <strong>Comunicações operacionais</strong> estritamente relacionadas com o pedido
            efetuado (confirmações, falhas técnicas) — base legal: execução de contrato.
          </li>
          <li>
            <strong>Cumprimento de obrigações legais</strong>, sempre que aplicáveis — base legal:
            obrigação jurídica (Art.º 6.º, n.º 1, alínea c) do RGPD).
          </li>
        </ul>
        <p>
          Não é efetuado envio de comunicações de marketing nem a inclusão dos dados em qualquer
          newsletter sem consentimento expresso e separado.
        </p>
      </section>

      <section id="subcontratantes">
        <h2>4. Subcontratantes</h2>
        <p>
          Para prestar o serviço, são utilizados os seguintes subcontratantes, todos com contratos
          ou termos de processamento de dados em vigor:
        </p>
        <ul>
          <li>
            <strong>Supabase</strong> — base de dados, armazenamento de ficheiros e autenticação
            (infraestrutura na União Europeia).
          </li>
          <li>
            <strong>Lovable Cloud</strong> — alojamento e ambiente de execução do serviço
            (infraestrutura na União Europeia).
          </li>
          <li>
            <strong>Cloudflare</strong> — CDN, proteção contra abuso e camada de execução de
            funções HTTP.
          </li>
          <li>
            <strong>Apify</strong> — recolha automatizada de dados públicos do Instagram para
            geração da análise.
          </li>
          <li>
            <strong>Resend</strong> — entrega transacional do relatório por email.
          </li>
        </ul>
        <p>
          Os pagamentos não estão atualmente ativos no produto. Quando forem disponibilizados, esta
          política será atualizada com a identificação do subcontratante de pagamentos.
        </p>
      </section>

      <section id="transferencias">
        <h2>5. Transferências internacionais</h2>
        <p>
          Alguns subcontratantes (nomeadamente Resend, Apify e parte da infraestrutura de
          Cloudflare e Anthropic) podem tratar dados fora do Espaço Económico Europeu, em particular
          nos Estados Unidos da América. Estas transferências apoiam-se nas garantias previstas no
          RGPD, incluindo, consoante aplicável, o EU–U.S. Data Privacy Framework e/ou Cláusulas
          Contratuais-Tipo aprovadas pela Comissão Europeia.
        </p>
      </section>

      <section id="retencao">
        <h2>6. Retenção</h2>
        <ul>
          <li>
            <strong>Snapshots de análise</strong>: expiram automaticamente 24 horas após a recolha.
          </li>
          <li>
            <strong>Ficheiros PDF dos relatórios</strong>: ficam acessíveis através de ligações
            assinadas com validade de 7 dias; o ficheiro mantém-se em armazenamento privado para
            permitir reenvio até pedido de eliminação.
          </li>
          <li>
            <strong>Registo de pedidos e dados de contacto</strong> (nome, email, empresa
            opcional): conservados enquanto for necessário para apoio ao serviço e cumprimento de
            obrigações legais, ou até pedido de eliminação por parte do titular.
          </li>
          <li>
            <strong>Registos técnicos</strong>: conservados pelo período estritamente necessário
            para diagnóstico, segurança e prevenção de abuso.
          </li>
        </ul>
      </section>

      <section id="direitos">
        <h2>7. Direitos do titular</h2>
        <p>Nos termos do RGPD, o titular pode exercer, a qualquer momento, os seguintes direitos:</p>
        <ul>
          <li>Acesso aos dados pessoais em tratamento.</li>
          <li>Retificação de dados incorretos ou desatualizados.</li>
          <li>Apagamento dos dados (direito ao esquecimento).</li>
          <li>Limitação do tratamento.</li>
          <li>Portabilidade dos dados.</li>
          <li>Oposição ao tratamento, quando baseado em interesse legítimo.</li>
          <li>
            Apresentação de reclamação à autoridade de controlo competente — em Portugal, a Comissão
            Nacional de Proteção de Dados (CNPD).
          </li>
        </ul>
        <p>
          Os direitos podem ser exercidos por email, conforme indicado no ponto{" "}
          <a href="#contacto">12. Contacto</a>. A resposta é prestada no prazo máximo de 30 dias.
        </p>
      </section>

      <section id="seguranca">
        <h2>8. Segurança</h2>
        <p>
          São aplicadas medidas técnicas e organizativas adequadas para proteger os dados pessoais,
          incluindo: cifragem das ligações em trânsito (HTTPS/TLS), separação de privilégios entre
          ambientes, armazenamento privado dos relatórios PDF com acesso por ligação assinada e
          restrição do acesso administrativo a sessões autenticadas.
        </p>
      </section>

      <section id="cookies">
        <h2>9. Cookies e armazenamento local</h2>
        <p>
          O InstaBench não utiliza cookies de marketing nem ferramentas de seguimento de
          terceiros (como Google Analytics, Meta Pixel ou semelhantes). São utilizados apenas:
        </p>
        <ul>
          <li>
            <strong>Cookie de sessão da área de administração</strong> (estritamente necessário
            para autenticar o acesso administrativo, marcado <code>HttpOnly</code>).
          </li>
          <li>
            <strong>Preferência de interface</strong> (estado expandido/colapsado da barra
            lateral), guardada localmente para melhorar a experiência de utilização.
          </li>
        </ul>
        <p>
          Por não existir tratamento para fins de marketing ou perfil comportamental, não é exibido
          banner de consentimento de cookies. Caso, no futuro, sejam introduzidas ferramentas que o
          exijam, será disponibilizado um mecanismo de consentimento adequado.
        </p>
      </section>

      <section id="menores">
        <h2>10. Menores</h2>
        <p>
          O serviço destina-se a uso profissional por adultos. Não são recolhidos, conscientemente,
          dados pessoais de menores de 16 anos. Caso seja detetada essa situação, os dados serão
          eliminados.
        </p>
      </section>

      <section id="alteracoes">
        <h2>11. Alterações a esta política</h2>
        <p>
          Esta política pode ser atualizada para refletir alterações ao serviço ou ao quadro legal
          aplicável. A data de última atualização é indicada no início do documento. Recomenda-se
          consulta periódica.
        </p>
      </section>

      <section id="contacto">
        <h2>12. Contacto</h2>
        <p>
          Para questões relacionadas com privacidade, exercício de direitos ou pedidos de
          esclarecimento, o contacto é feito através do email{" "}
          <a href="mailto:privacidade@instabench.pt">privacidade@instabench.pt</a>.
        </p>
      </section>
    </LegalLayout>
  );
}
