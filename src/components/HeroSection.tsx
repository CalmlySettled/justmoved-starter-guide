import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-lifestyle.jpg";

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/80 via-primary/60 to-transparent" />
      
      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center text-white">
        <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
          Your new city 
          <span className="bg-gradient-accent bg-clip-text text-transparent block">
            awaits
          </span>
        </h1>
        
        <p className="text-lg md:text-xl mb-8 text-white/90 max-w-xl mx-auto leading-relaxed">
          Discover local essentials and feel at home in your new neighborhood.
        </p>
        
        <div className="flex flex-col gap-6 justify-center items-center">
          <Link to="/onboarding">
            <Button 
              variant="hero" 
              size="lg"
              className="text-xl px-12 py-8 min-w-[250px] transform hover:scale-110 shadow-2xl"
            >
              Settle Me In
              <ArrowRight className="ml-3 h-6 w-6" />
            </Button>
          </Link>
          
          <p className="text-white/80 text-sm font-medium">
            We'll personalize your new city in under 60 seconds
          </p>
        </div>
        
        <div className="mt-12 text-white/80">
          <p className="text-sm">
            Join thousands of successful movers • Free to start
          </p>
        </div>
      </div>
    </section>
  );
}