import { jsonForScript } from "@/lib/jsonLd";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PkgPanel } from "@/components/package-detail/PkgPanel";
import type { FAQItem } from "@/hooks/useHomepageData";

interface FAQSectionProps {
  faqItems: FAQItem[];
}

export const FAQSection = ({ faqItems }: FAQSectionProps) => {
  if (faqItems.length === 0) return null;

  const schemaData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqItems.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };

  return (
    <PkgPanel tone="cream-2" id="faq" className="scroll-mt-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonForScript(schemaData) }} />
      <div className="mx-auto max-w-3xl">
        <h2 className="pkg-h2 text-balance">Pertanyaan umum</h2>
        <Accordion type="single" collapsible className="mt-6 w-full">
          {faqItems.map((faq, index) => (
            <AccordionItem key={faq.id} value={`item-${index + 1}`} className="border-pkg-hair last:border-0">
              <AccordionTrigger className="min-h-14 pr-2 text-left text-[17px] font-medium text-pkg-fg hover:no-underline">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="pb-6 text-[16px] leading-[1.55] text-pkg-fg-2">{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </PkgPanel>
  );
};
