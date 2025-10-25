import { Button } from "@/components/ui/button";
import { Building2, LogIn } from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-lifestyle.jpg";

export function HeroSection() {
  
  return (
    <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden pt-24 pb-16">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat blur-[2px]"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      {/* Overlay - minimal for maximum background visibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/15 via-primary/10 to-primary/25" />
      
      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center text-white">
        <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold mb-4 sm:mb-6 leading-tight">
          <span className="italic">Transforming the</span> 
          <span className="bg-gradient-accent bg-clip-text text-transparent block drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
            Move-In Experience
          </span>
        </h1>
        
        <p className="text-lg md:text-xl mb-8 text-white/90 max-w-2xl mx-auto leading-relaxed">
          Discover your neighborhood or manage your properties with AI-powered recommendations.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <Link to="/property-manager">
            <Button 
              variant="hero" 
              size="lg"
              className="px-8 py-5 min-w-[240px] shadow-lg"
            >
              <Building2 className="mr-2 h-5 w-5" />
              Sign Up Your Property
            </Button>
          </Link>
          
          <Link to="/auth">
            <Button 
              variant="outline" 
              size="lg"
              className="px-8 py-5 min-w-[240px] bg-white/10 text-white border-white/30 hover:bg-white/20 backdrop-blur-sm"
            >
              <LogIn className="mr-2 h-5 w-5" />
              Sign In to Dashboard
            </Button>
          </Link>
        </div>
        
      </div>
    </section>
  );
}