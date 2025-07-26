import { Button } from "@/components/ui/button";
import { ArrowRight, Crown } from "lucide-react";
import { Link } from "react-router-dom";

export function CTASection() {
  return (
    <section className="py-20 bg-background">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
          Ready to Make Your Move Seamless?
        </h2>
        <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
          Join thousands of successful movers who've discovered their perfect new city with CalmlySettled
        </p>
        
        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
          <Link to="/onboarding">
            <Button 
              variant="hero" 
              size="lg"
              className="text-lg px-8 py-6 min-w-[220px]"
            >
              Start Your Journey
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
        
        {/* Optional Upsell */}
        <div className="border-2 border-dashed border-accent/30 rounded-xl p-8 bg-accent/5">
          <div className="flex items-center justify-center mb-4">
            <Crown className="h-8 w-8 text-accent mr-3" />
            <h3 className="text-2xl font-semibold text-foreground">
              Want White-Glove Service?
            </h3>
          </div>
          
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Let our concierge team build your perfect local starter guide. We'll research, 
            call, and coordinate everything so you can focus on settling in.
          </p>
          
          <Button variant="accent" size="lg" className="text-lg px-8 py-4">
            Learn About Concierge
          </Button>
        </div>
      </div>
    </section>
  );
}