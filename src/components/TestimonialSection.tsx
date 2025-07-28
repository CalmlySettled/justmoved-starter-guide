import { Quote } from "lucide-react";

export function TestimonialSection() {
  return (
    <section className="py-20 bg-gradient-hero">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <div className="mb-8">
          <Quote className="h-12 w-12 mx-auto text-white/80 mb-6" />
          
          <blockquote className="text-2xl md:text-3xl font-medium text-white leading-relaxed mb-8">
            "When I moved from the city of Philadelphia to the suburbs of Connecticut, I quickly realized how 
            overwhelming it could feel to find my way in a new place. I spent hours searching Google, 
            Google Maps, and countless websites just to answer simple questions like where to buy 
            groceries, which pharmacy to use, and what local spots might make me feel at home. I 
            wanted one resource that could bring all of that together — a place to make settling in not 
            only easier, but calmer and more enjoyable. That's why I created CalmlySettled: to help 
            people like you feel at home, faster, with trusted recommendations and a personalized 
            dashboard to guide you every step of the way."
          </blockquote>
          
          <div className="flex items-center justify-center space-x-4">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg">
              NE
            </div>
            <div className="text-left">
              <div className="text-white font-semibold text-lg">
                Nic Ertz
              </div>
              <div className="text-white/80">
                Founder of CalmlySettled
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}