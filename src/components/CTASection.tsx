import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export function CTASection() {
  return (
    <section className="py-20 bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-6">
          Ready to Make Your Move Seamless?
        </h2>
        <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
          Get started for free and discover your perfect new city with CalmlySettled
        </p>
        
        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
          <Link to="/explore">
            <Button 
              variant="hero" 
              size="lg"
              className="text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 min-w-[200px] sm:min-w-[220px]"
            >
              Explore Local Businesses
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}