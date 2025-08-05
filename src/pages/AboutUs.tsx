import { Header } from "@/components/Header";
import { TestimonialSection } from "@/components/TestimonialSection";
import { Footer } from "@/components/Footer";

const AboutUs = () => {
  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          {/* Page Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">About CalmlySettled</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Our mission is to help people discover their new community and feel at home, wherever life takes them.
            </p>
          </div>

          {/* Our Story Section */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold mb-8 text-center">Our Story</h2>
            <div className="prose prose-lg mx-auto text-muted-foreground">
              <p className="mb-6">
                Moving to a new place can be overwhelming. Whether you're relocating for work, starting fresh, 
                or simply exploring a new neighborhood, finding the right local businesses and services that 
                match your lifestyle and preferences is challenging.
              </p>
              <p className="mb-6">
                That's why we created CalmlySettled - to take the guesswork out of discovering your new community. 
                Our personalized approach means you get recommendations tailored specifically to your needs, 
                preferences, and lifestyle, helping you feel settled and connected faster.
              </p>
              <p>
                We believe that everyone deserves to feel at home in their community, and we're here to make 
                that transition as smooth and exciting as possible.
              </p>
            </div>
          </div>

          {/* Founder Testimonial */}
          <TestimonialSection />
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default AboutUs;