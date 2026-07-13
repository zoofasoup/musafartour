import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { FAQItem } from "@/hooks/useHomepageData";

interface FAQSectionProps {
  faqItems: FAQItem[];
}

export const FAQSection = ({ faqItems }: FAQSectionProps) => {
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
    <section className="py-16 md:py-24 bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
      />
      <div className="container mx-auto px-6 md:px-8">
        <div className="text-center mb-16">
          <span className="text-accent uppercase tracking-[0.2em] text-xs font-bold mb-4 block">
            FAQ
          </span>
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-4 text-foreground tracking-tight">
            Pertanyaan yang Sering Diajukan
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Temukan jawaban atas pertanyaan umum tentang layanan umroh kami
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          {faqItems.length > 0 ? (
            <Accordion type="single" collapsible className="w-full">
              {faqItems.map((faq, index) => (
                <AccordionItem 
                  key={faq.id} 
                  value={`item-${index + 1}`}
                  className="mb-2 border-b border-slate-100 last:border-0"
                >
                  <AccordionTrigger className="text-left text-base md:text-lg font-medium py-4 md:py-5 hover:no-underline hover:text-primary transition-colors pr-4">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm md:text-base text-muted-foreground leading-relaxed pb-6">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="text-center text-muted-foreground">
              Belum ada FAQ yang ditambahkan
            </div>
          )}
        </div>
      </div>
    </section>
  );
};