import { Phone, TrendingUp, Heart, Users, Building, BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Phone,
    title: "Reduce Support Calls by 70%",
    description: "Tenants get instant access to personalized local recommendations, dramatically reducing your support workload."
  },
  {
    icon: TrendingUp,
    title: "Increase Tenant Satisfaction",
    description: "Happy tenants who feel settled faster lead to higher retention rates and positive reviews."
  },
  {
    icon: Heart,
    title: "Enhanced Move-In Experience",
    description: "Provide a premium onboarding experience that sets your properties apart from competitors."
  },
  {
    icon: Users,
    title: "Custom Tenant Links",
    description: "Generate personalized welcome links for each new tenant with your property branding."
  },
  {
    icon: Building,
    title: "Professional Branding",
    description: "Customize the experience with your property logo and contact information for brand consistency."
  },
  {
    icon: BarChart3,
    title: "Analytics & Insights",
    description: "Track tenant engagement and satisfaction metrics to continuously improve your service."
  }
];

export function FeaturesSection() {
  return (
    <section className="py-20 bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-6">
            Transform Your Tenant Experience
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Reduce support calls, increase tenant satisfaction, and differentiate your properties 
            with our comprehensive tenant onboarding solution.
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