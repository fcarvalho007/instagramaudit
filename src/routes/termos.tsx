import { createFileRoute } from "@tanstack/react-router";

import { LegalLayout } from "@/components/legal/legal-layout";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos e Condições — InstaBench" },
      {
        name: "description",
        content:
          "Termos e Condições de utilização do InstaBench: âmbito do serviço, uso aceitável, quotas, propriedade intelectual e limitação de responsabilidade.",
      },
      { property: "og:title", content: "Termos e Condições — InstaBench" },
      {
        property: "og:description",
        content:
          "Termos e Condições do InstaBench: regras de utilização do serviço, quotas, responsabilidade e propriedade intelectual.",
      },
    ],
  }),
  component: TermosPage,
});

const TOC = [
  { id: "objeto", label: "Objeto" },
  { id: "aceitacao", label: "Aceitação" },
  { id: "servico", label: "Descrição do serviço" },
  { id: "uso-aceitavel", label: "Uso aceitável" },
  { id: "quotas", label: "Quotas e gratuitidade" },
  { id: "pagamentos", label: "Pagamentos" },
  { id: "propriedade", label: "Propriedade intelectual" },
  { id: "responsabilidade", label: "Limitação de responsabilidade" },
  { id: "disponibilidade", label: "Disponibilidade" },
  { id: "dados", label: "Dados pessoais" },
  { id: "alteracoes", label: "Alterações" },
  { id: "lei-foro", label: "Lei e foro" },
  { id: "contacto", label: "Contacto" },
];

function TermosPage() {
  return (
    <LegalLayout
      eyebrow="Documento legal"
      title="Termos e Condições"
      lede="Estes Termos e Condições regulam a utilização do InstaBench, serviço de análise comparativa de perfis públicos do Instagram e geração de relatórios estratégicos."
      lastUpdated="17 de abril de 2026"
      toc={TOC}
    >
      <section id="objeto">
        <h2>1. Objeto</h2>
        <p>
          O presente documento estabelece as condições de utilização do InstaBench, disponibilizado
          através do domínio <code>instabench.pt</code> (adiante designado por <strong>Serviço</strong>).
          Ao aceder ou utilizar o Serviço, o utilizador declara ter lido, compreendido e aceitado
          estes Termos.
        </p>
      </section>

      <section id="aceitacao">
        <h2>2. Aceitação</h2>
        <p>
          A utilização do Serviço, mesmo na sua versão pública gratuita, implica a aceitação plena
          destes Termos e da{" "}
          <a href="/privacidade" target="_blank" rel="noopener">
            Política de Privacidade
          </a>
          . Caso o utilizador não concorde com qualquer ponto, deverá abster-se de utilizar o
          Serviço.
        </p>
      </section>

      <section id="servico">
        <h2>3. Descrição do serviço</h2>
        <p>
          O InstaBench permite analisar perfis públicos do Instagram, comparar até dois
          concorrentes, gerar relatórios em formato PDF com leitura estratégica produzida com apoio
          de IA, e enviar esses relatórios por email.
        </p>
        <p>
          O Serviço opera exclusivamente sobre <strong>dados públicos</strong> disponibilizados pela
          plataforma Instagram. O InstaBench não acede a perfis privados, dados de autenticação ou
          conteúdos não públicos.
        </p>
        <p>
          O InstaBench não é afiliado, patrocinado nem operado pela Meta Platforms, Inc. ou pelo
          Instagram.
        </p>
      </section>

      <section id="uso-aceitavel">
        <h2>4. Uso aceitável</h2>
        <p>Ao utilizar o Serviço, o utilizador compromete-se a:</p>
        <ul>
          <li>Utilizar o Serviço apenas para fins lícitos e profissionais legítimos.</li>
          <li>
            Não tentar contornar, atacar, sobrecarregar ou utilizar técnicas automatizadas
            (incluindo scraping massivo) sobre o Serviço fora dos limites previstos.
          </li>
          <li>
            Não tentar aceder a perfis privados, áreas administrativas ou dados de outros
            utilizadores.
          </li>
          <li>
            Não revender, redistribuir ou apresentar como próprio o conteúdo dos relatórios gerados
            sem autorização expressa.
          </li>
          <li>
            Respeitar os direitos de terceiros, incluindo direitos de propriedade intelectual e os
            termos de utilização do Instagram.
          </li>
        </ul>
        <p>
          O InstaBench reserva-se o direito de suspender ou bloquear acessos que violem estas
          condições.
        </p>
      </section>

      <section id="quotas">
        <h2>5. Quotas e gratuitidade</h2>
        <p>
          Atualmente, o Serviço disponibiliza, por endereço de email, uma quota gratuita de{" "}
          <strong>2 (dois) relatórios completos por mês</strong>. A quota reinicia no início de cada
          mês civil. O acesso à pré-visualização pública não está sujeito a quota.
        </p>
        <p>
          O número de relatórios gratuitos pode ser ajustado no futuro, com aviso razoável dentro do
          próprio Serviço.
        </p>
      </section>

      <section id="pagamentos">
        <h2>6. Pagamentos</h2>
        <p>
          As modalidades pagas — compra pontual de relatórios adicionais e planos de subscrição —
          encontram-se anunciadas no Serviço como funcionalidades futuras. Não estão atualmente
          disponíveis para contratação. Quando forem disponibilizadas, os respetivos termos
          (preço, periodicidade, faturação, reembolsos e fornecedor de pagamento) serão
          formalizados em adenda específica a estes Termos, antes da contratação.
        </p>
      </section>

      <section id="propriedade">
        <h2>7. Propriedade intelectual</h2>
        <p>
          A marca, o software, o desenho do produto, os modelos de relatório, os textos editoriais
          e os algoritmos analíticos do InstaBench são propriedade do respetivo titular ou estão
          devidamente licenciados, sendo protegidos por legislação aplicável de propriedade
          intelectual.
        </p>
        <p>
          O relatório PDF entregue ao utilizador é licenciado para uso interno legítimo da pessoa
          ou entidade que o solicitou (por exemplo, análise estratégica, decisões de marketing,
          apresentações internas). Não é permitida a revenda, redistribuição massiva ou
          apresentação do relatório como produto próprio sem autorização expressa.
        </p>
        <p>
          Os dados públicos do Instagram refletidos no relatório pertencem aos seus titulares. O
          InstaBench limita-se a agregar, analisar e contextualizar essa informação.
        </p>
      </section>

      <section id="responsabilidade">
        <h2>8. Limitação de responsabilidade</h2>
        <p>
          O Serviço é fornecido <em>tal como se encontra</em>, com base em dados públicos e
          recolhidos por terceiros. Apesar do esforço aplicado em garantir qualidade, exatidão e
          relevância:
        </p>
        <ul>
          <li>
            Os dados recolhidos do Instagram podem variar, conter atrasos ou ficar temporariamente
            indisponíveis por motivos alheios ao InstaBench.
          </li>
          <li>
            As métricas, comparações e leituras estratégicas têm carácter <strong>orientador</strong>
            . Não constituem aconselhamento financeiro, jurídico ou de marketing personalizado.
          </li>
          <li>
            A responsabilidade pelas decisões tomadas com base no relatório recai sobre o
            utilizador.
          </li>
        </ul>
        <p>
          Dentro dos limites permitidos por lei, o InstaBench não pode ser responsabilizado por
          danos indiretos, perda de oportunidade, perda de dados ou prejuízos económicos decorrentes
          da utilização ou impossibilidade de utilização do Serviço.
        </p>
      </section>

      <section id="disponibilidade">
        <h2>9. Disponibilidade do serviço</h2>
        <p>
          O Serviço é disponibilizado em regime de melhores esforços (<em>best effort</em>), sem
          garantia formal de níveis de serviço (SLA). Podem ocorrer interrupções para manutenção,
          atualizações ou eventos imprevistos. Sempre que possível, eventuais janelas de manutenção
          serão comunicadas com antecedência razoável.
        </p>
      </section>

      <section id="dados">
        <h2>10. Dados pessoais</h2>
        <p>
          O tratamento de dados pessoais associado ao Serviço é regulado pela{" "}
          <a href="/privacidade" target="_blank" rel="noopener">
            Política de Privacidade
          </a>
          , que faz parte integrante destes Termos.
        </p>
      </section>

      <section id="alteracoes">
        <h2>11. Alterações aos Termos</h2>
        <p>
          Estes Termos podem ser atualizados. A data de última atualização é indicada no início do
          documento. Alterações materiais relevantes podem ser sinalizadas adicionalmente dentro do
          próprio Serviço ou por email, no caso de utilizadores com pedidos ativos.
        </p>
      </section>

      <section id="lei-foro">
        <h2>12. Lei aplicável e foro</h2>
        <p>
          Os presentes Termos regem-se pela lei portuguesa. Para a resolução de qualquer litígio
          emergente da sua interpretação ou execução, as partes elegem o foro da comarca de Lisboa,
          com expressa renúncia a qualquer outro, sem prejuízo das normas imperativas aplicáveis a
          consumidores.
        </p>
      </section>

      <section id="contacto">
        <h2>13. Contacto</h2>
        <p>
          Para questões relativas a estes Termos, suporte ou cumprimento legal, o contacto é feito
          através do email{" "}
          <a href="mailto:privacidade@instabench.pt">privacidade@instabench.pt</a>.
        </p>
      </section>
    </LegalLayout>
  );
}
