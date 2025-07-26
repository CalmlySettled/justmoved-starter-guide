import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { FeaturesSection } from "@/components/FeaturesSection";

const Features = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-20">
        <FeaturesSection />
      </main>
      <Footer />
    </div>
  );
};

export default Features;