import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const faqs = [
  {
    question: "How does CalmlySettled find local businesses?",
    answer: "We use your location to find the best local businesses and services near you. Our algorithm considers distance, ratings, and business quality to show you the most relevant options in your area."
  },
  {
    question: "Is CalmlySettled free to use?",
    answer: "Yes! CalmlySettled is completely free to use. You'll get local business listings, ratings, and community resources at no cost. We also offer optional premium concierge services for those who want extra support."
  },
  {
    question: "Which cities does CalmlySettled cover?",
    answer: "We currently cover 50+ major cities across the United States, with new cities being added regularly. If your city isn't listed, let us know and we'll prioritize adding it to our platform."
  },
  {
    question: "How quickly can I find local businesses?",
    answer: "Once you add your address, you can instantly explore local businesses and services. Our platform shows you hundreds of options in your area right away."
  },
  {
    question: "Can I save my favorite businesses?",
    answer: "Absolutely! You can save businesses to your favorites list and access them anytime from your profile. This makes it easy to keep track of places you want to visit or recommend to others."
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