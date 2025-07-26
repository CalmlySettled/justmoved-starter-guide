import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-moving.jpg";

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
        <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
          Welcome to your 
          <span className="bg-gradient-accent bg-clip-text text-transparent block">
            new home
          </span>
        </h1>
        
        <p className="text-xl md:text-2xl mb-8 text-white/90 max-w-2xl mx-auto leading-relaxed">
          Moving to a new city? CalmlySettled helps you discover the perfect local spots, 
          complete essential tasks, and feel at home faster than ever.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link to="/onboarding">
            <Button 
              variant="hero" 
              size="lg"
              className="text-lg px-8 py-6 min-w-[200px]"
            >
              Get Started
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          
          <Button 
            variant="outline" 
            size="lg"
            className="text-lg px-8 py-6 bg-white/10 border-white/30 text-white hover:bg-white hover:text-primary backdrop-blur-sm"
          >
            Learn More
          </Button>
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