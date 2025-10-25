import { Button } from "@/components/ui/button";
import { Building2, LogIn, QrCode } from "lucide-react";
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
      {/* Overlay - with vignette effect for better content framing */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/20 via-primary/15 to-primary/30" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.3)_100%)]" />
      
      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center text-white">
        <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold mb-4 sm:mb-6 leading-tight">
          <span className="italic">Transforming the</span> 
          <span className="bg-gradient-accent bg-clip-text text-transparent block drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
            Move-In Experience
          </span>
        </h1>
        
        <p className="text-lg md:text-xl mb-8 text-white max-w-2xl mx-auto leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] font-medium">
          Discover your neighborhood or manage your properties with AI-powered recommendations.
        </p>
        
        <div className="flex flex-col gap-4 justify-center items-center mb-8">
          <Link to="/property-manager">
            <Button 
              variant="hero" 
              size="lg"
              className="text-lg sm:text-xl px-6 sm:px-8 md:px-12 py-4 sm:py-6 md:py-8 min-w-[280px] sm:min-w-[320px] transform hover:scale-110 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] hover:shadow-[0_25px_70px_-10px_rgba(0,0,0,0.6)] min-h-[56px]"
            >
              <Building2 className="mr-3 h-5 w-5 sm:h-6 sm:w-6" />
              Sign Up Your Property
            </Button>
          </Link>
          
          <Link to="/auth">
            <Button 
              variant="outline" 
              size="lg"
              className="text-lg px-6 sm:px-8 py-4 sm:py-6 min-w-[280px] sm:min-w-[320px] bg-white/25 text-white border-white/40 hover:bg-white/35 backdrop-blur-md shadow-[0_10px_40px_-10px_rgba(0,0,0,0.4)] hover:shadow-[0_15px_50px_-10px_rgba(0,0,0,0.5)]"
            >
              <LogIn className="mr-3 h-5 w-5" />
              Sign In to Dashboard
            </Button>
          </Link>
        </div>

        {/* Tenant Notice */}
        <div className="max-w-md mx-auto mt-8 p-5 bg-gradient-to-r from-primary/60 to-primary/50 backdrop-blur-md rounded-lg border-l-4 border-accent border border-white/40 shadow-2xl">
          <div className="flex items-start gap-3 text-left">
            <QrCode className="h-5 w-5 text-white flex-shrink-0 mt-0.5 drop-shadow-md" />
            <p className="text-sm text-white drop-shadow-md">
              <span className="font-bold text-white">Are you a tenant?</span> Just received a QR code? Scan it to begin. Already signed up? Click 'Sign In to Dashboard'.
            </p>
          </div>
        </div>
        
      </div>
    </section>
  );
}