import { createFileRoute } from "@tanstack/react-router";

import { LegalLayout } from "@/components/legal/legal-layout";
import { LEGAL } from "@/lib/brand/legal";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: "Política de Cookies — AuditProfiles" },
      {
        name: "description",
        content:
          "Política de Cookies do AuditProfiles: utilizamos apenas cookies estritamente necessários ao funcionamento do serviço. Sem marketing, análise comportamental ou perfilamento.",
      },
      { property: "og:title", content: "Política de Cookies — AuditProfiles" },
      {
        property: "og:description",
        content:
          "AuditProfiles utiliza apenas cookies estritamente necessários ao funcionamento do serviço.",
      },
    ],
  }),
  component: CookiesPage,
});

const TOC = [
  { id: "utilizados", label: "Cookies utilizados" },
  { id: "nao-utilizados", label: "Ferramentas que não utilizamos" },
  { id: "futuro", label: "Alterações futuras" },
  { id: "contacto", label: "Contacto" },
];

function CookiesPage() {
  return (
    <LegalLayout
      eyebrow="Documento legal"
      title="Política de Cookies"
      lede="O AuditProfiles utiliza apenas cookies estritamente necessários ao funcionamento do serviço. Não utilizamos cookies de marketing, análise comportamental ou perfilamento publicitário."
      lastUpdated="11 de Maio de 2026"
      toc={TOC}
    >
      <section id="utilizados">
        <h2>1. Cookies utilizados</h2>
        <ul>
          <li>
            <strong>
              <code>ib_session</code>
            </strong>{" "}
            — Autenticação de sessão na área administrativa. Duração: sessão. Tipo: estritamente
            necessário.
          </li>
          <li>
            <strong>
              <code>ib_ui_prefs</code>
            </strong>{" "}
            — Estado da interface (barra lateral, tema). Duração: 365 dias. Tipo: estritamente
            necessário.
          </li>
        </ul>
        <p>
          Estes cookies são considerados estritamente necessários ao funcionamento do serviço
          solicitado pelo utilizador, nos termos do artigo 5.º, n.º 5 da Lei n.º 41/2004, pelo que
          não requerem consentimento prévio nem é exibido banner de consentimento.
        </p>
      </section>

      <section id="nao-utilizados">
        <h2>2. Ferramentas que NÃO utilizamos</h2>
        <ul>
          <li>Google Analytics</li>
          <li>Meta Pixel / Facebook Pixel</li>
          <li>Google Ads / Floodlight</li>
          <li>Cookies de redes sociais</li>
          <li>Ferramentas de retargeting publicitário</li>
          <li>Fingerprinting ou tecnologias equivalentes</li>
        </ul>
      </section>

      <section id="futuro">
        <h2>3. Alterações futuras</h2>
        <p>
          Caso, no futuro, sejam introduzidas ferramentas que requeiram consentimento, será
          disponibilizado banner de gestão adequado, com possibilidade de aceitar, recusar ou
          personalizar as preferências antes de qualquer recolha.
        </p>
      </section>

      <section id="contacto">
        <h2>4. Contacto</h2>
        <p>
          Para questões sobre esta política:{" "}
          <a href={`mailto:${LEGAL.privacyEmail}`}>{LEGAL.privacyEmail}</a> ·
          {" "}{LEGAL.companyName}
        </p>
      </section>
    </LegalLayout>
  );
}
