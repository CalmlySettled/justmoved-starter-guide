import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const faqs = [
  {
    question: "How does CalmlySettled personalize recommendations?",
    answer: "Our onboarding quiz learns about your lifestyle, family size, budget preferences, and priorities. We then match you with local businesses and services that align with your specific needs and values."
  },
  {
    question: "Is CalmlySettled free to use?",
    answer: "Yes! CalmlySettled is completely free to use. You'll get personalized recommendations, task lists, and community resources at no cost. We also offer optional premium concierge services for those who want extra support."
  },
  {
    question: "Which cities does CalmlySettled cover?",
    answer: "We currently cover 50+ major cities across the United States, with new cities being added regularly. If your city isn't listed, let us know and we'll prioritize adding it to our platform."
  },
  {
    question: "How quickly will I get my recommendations?",
    answer: "After completing our 5-minute quiz, you'll receive your personalized recommendations instantly. We'll also send you a custom moving checklist within 24 hours of signing up."
  },
  {
    question: "Can I update my preferences after moving?",
    answer: "Absolutely! Your needs may change as you settle in. You can update your preferences anytime, and we'll refresh your recommendations to match your evolving lifestyle."
  },
  {
    question: "What if I need help with something specific?",
    answer: "Our community forum is a great place to ask questions and get advice from other recent movers. For personalized assistance, our concierge service can help with more complex needs."
  }
];

export function FAQSection() {
  return (
    <section className="py-20 bg-muted/30">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-muted-foreground">
            Everything you need to know about CalmlySettled
          </p>
        </div>
        
        <Accordion type="single" collapsible className="space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem 
              key={index} 
              value={`item-${index}`}
              className="bg-card rounded-lg border border-border/50 px-6 shadow-soft hover:shadow-card transition-smooth"
            >
              <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline py-6">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed pb-6">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}