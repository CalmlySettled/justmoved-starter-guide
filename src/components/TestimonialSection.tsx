import { Quote } from "lucide-react";

export function TestimonialSection() {
  return (
    <section className="py-20 bg-gradient-hero">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <div className="mb-8">
          <Quote className="h-12 w-12 mx-auto text-white/80 mb-6" />
          
          <blockquote className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-medium text-white leading-relaxed mb-8">
            "Every year, nearly 30 million Americans move, and I was one of them. When I relocated from Philadelphia to the suburbs of Connecticut, I quickly realized how overwhelming it was to find the basics: a grocery store, a pharmacy, even a spot to feel at home. I wished there was one trusted place to bring it all together. That's why I created CalmlySettled. To make settling in easier, faster, and a lot less stressful."
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