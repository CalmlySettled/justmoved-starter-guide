import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import heroImage from "@/assets/hero-lifestyle.jpg";

export function HeroSection() {
  const { user } = useAuth();
  
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
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center text-white">
        <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold mb-4 sm:mb-6 leading-tight">
          Your New City 
          <span className="bg-gradient-accent bg-clip-text text-transparent block">
            Awaits
          </span>
        </h1>
        
        <p className="text-lg md:text-xl mb-8 text-white/90 max-w-xl mx-auto leading-relaxed">
          Discover local essentials and feel at home in your new neighborhood.
        </p>
        
        <div className="flex flex-col gap-6 justify-center items-center">
          <Link to={user ? "/explore" : "/auth?mode=signup&redirect=explore&focus=essentials"}>
            <Button 
              variant="hero" 
              size="lg"
              className="text-lg sm:text-xl px-6 sm:px-8 md:px-12 py-4 sm:py-6 md:py-8 min-w-[280px] sm:min-w-[300px] transform hover:scale-110 shadow-2xl min-h-[56px]"
            >
              Start Exploring
              <ArrowRight className="ml-3 h-5 w-5 sm:h-6 sm:w-6" />
            </Button>
          </Link>
          
        </div>
        
      </div>
    </section>
  );
}