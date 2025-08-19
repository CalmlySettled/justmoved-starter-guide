import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export function CTASection() {
  return (
    <section className="py-20 bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-6">
          Ready to Transform Your Tenant Experience?
        </h2>
        <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
          Join property managers who've reduced tenant support calls and increased satisfaction scores
        </p>
        
        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
          <Link to="/property-manager">
            <Button 
              variant="green" 
              size="lg"
              className="text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 min-w-[200px] sm:min-w-[220px]"
            >
              Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}