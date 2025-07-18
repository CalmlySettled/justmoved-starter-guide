import { Quote } from "lucide-react";

export function TestimonialSection() {
  return (
    <section className="py-20 bg-gradient-hero">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <div className="mb-8">
          <Quote className="h-12 w-12 mx-auto text-white/80 mb-6" />
          
          <blockquote className="text-2xl md:text-3xl font-medium text-white leading-relaxed mb-8">
            "Moving to Seattle felt overwhelming until I found JustMoved. Within a week, 
            I had found my perfect gym, a great pediatrician for my daughter, and even 
            completed my car registration without any stress. It's like having a local 
            best friend guide you through everything!"
          </blockquote>
          
          <div className="flex items-center justify-center space-x-4">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg">
              SM
            </div>
            <div className="text-left">
              <div className="text-white font-semibold text-lg">
                Sarah Martinez
              </div>
              <div className="text-white/80">
                Moved to Seattle • Mother of 2
              </div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 text-white/90">
          <div className="text-center">
            <div className="text-3xl font-bold text-white mb-2">50K+</div>
            <div className="text-sm">Successful moves</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-white mb-2">4.9★</div>
            <div className="text-sm">Average rating</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-white mb-2">85%</div>
            <div className="text-sm">Feel settled within 2 weeks</div>
          </div>
        </div>
      </div>
    </section>
  );
}