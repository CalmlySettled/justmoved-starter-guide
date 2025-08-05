import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { HowItWorksSection } from "@/components/HowItWorksSection";
import { TestimonialSection } from "@/components/TestimonialSection";
import { CTASection } from "@/components/CTASection";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Compass, TrendingUp } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <HeroSection />
      
      {/* Quick Access Section */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-8">Start Exploring Instantly</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Link to="/explore">
              <Button variant="outline" size="lg" className="w-full h-20 text-lg">
                <Compass className="mr-3 h-6 w-6" />
                Explore by Category
              </Button>
            </Link>
            <Link to="/popular">
              <Button variant="outline" size="lg" className="w-full h-20 text-lg">
                <TrendingUp className="mr-3 h-6 w-6" />
                Popular Near You
              </Button>
            </Link>
          </div>
        </div>
      </section>
      
      <HowItWorksSection />
      <TestimonialSection />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Index;
