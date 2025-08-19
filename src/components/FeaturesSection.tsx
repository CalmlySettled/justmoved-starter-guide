import { ShoppingCart, Dumbbell, Trees, Stethoscope, Car, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: ShoppingCart,
    title: "Local Essentials",
    description: "Find the best grocery stores, pharmacies, and shops near your new home."
  },
  {
    icon: Dumbbell,
    title: "Fitness & Recreation",
    description: "Discover gyms, yoga studios, and recreational activities that match your lifestyle."
  },
  {
    icon: Trees,
    title: "Parks & Nature",
    description: "Explore beautiful parks, hiking trails, and outdoor spaces in your area."
  },
  {
    icon: Stethoscope,
    title: "Healthcare Providers",
    description: "Connect with trusted doctors, dentists, and specialists accepting new patients."
  },
  {
    icon: Car,
    title: "Important Tasks",
    description: "Complete vehicle registration, voter registration, and other moving requirements."
  },
  {
    icon: Zap,
    title: "Utilities & Services",
    description: "Set up internet, electricity, gas, and other essential services quickly."
  }
];

export function FeaturesSection() {
  return (
    <section className="py-20 bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-6">
            Everything You Need in One Place
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Stop spending hours researching and comparing. Get personalized recommendations 
            for everything that matters in your new city.
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {features.map((feature, index) => (
            <Card 
              key={index}
              className="group hover:shadow-card transition-smooth bg-gradient-card border-border/50"
            >
              <CardContent className="p-6 sm:p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-6 rounded-xl bg-gradient-hero flex items-center justify-center shadow-soft group-hover:shadow-glow transition-smooth">
                  <feature.icon className="h-8 w-8 text-white" />
                </div>
                
                <h3 className="text-xl font-semibold text-foreground mb-4">
                  {feature.title}
                </h3>
                
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}