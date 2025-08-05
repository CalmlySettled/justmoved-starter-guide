import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";

import { TestimonialSection } from "@/components/TestimonialSection";
import { CTASection } from "@/components/CTASection";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <HeroSection />
      
      <TestimonialSection />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Index;
