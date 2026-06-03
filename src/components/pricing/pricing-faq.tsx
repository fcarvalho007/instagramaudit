import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

const ITEMS: FAQItem[] = [
  {
    id: "login",
    question: "Preciso de dar o meu login do Instagram?",
    answer:
      "Não. Apenas usamos dados públicos do perfil. Nunca pedimos credenciais.",
  },
  {
    id: "data",
    question: "De onde vêm os dados?",
    answer:
      "Apenas de dados públicos do perfil. Os benchmarks de comparação são construídos a partir de estudos de referência da indústria, usados como sinais direcionais.",
  },
  {
    id: "sub",
    question: "É uma subscrição?",
    answer:
      "Não. É um pagamento único, sem renovação automática. Pagas apenas o que usas.",
  },
  {
    id: "call",
    question: "O que acontece na chamada de 30 minutos?",
    answer:
      "Revemos o diagnóstico contigo, identificamos 3 prioridades para os próximos 90 dias e respondemos às tuas dúvidas. Recebes um resumo escrito a seguir.",
  },
];

export function PricingFAQ() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:py-20">
      <h2 className="text-center font-fraunces text-3xl font-medium tracking-tight text-content-primary">
        Perguntas frequentes
      </h2>
      <Accordion
        type="single"
        collapsible
        defaultValue="data"
        className="mt-8"
      >
        {ITEMS.map((item) => (
          <AccordionItem
            key={item.id}
            value={item.id}
            className="border-border-default"
          >
            <AccordionTrigger className="text-left text-sm font-semibold text-content-primary hover:no-underline">
              {item.question}
            </AccordionTrigger>
            <AccordionContent className="text-sm leading-relaxed text-content-secondary">
              {item.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}