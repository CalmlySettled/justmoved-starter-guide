import { Building, Link, Users, BarChart3 } from "lucide-react";

const steps = [
  {
    icon: Building,
    title: "Add Your Properties",
    description: "Set up your property portfolio with custom branding, contact information, and location details in minutes."
  },
  {
    icon: Link,
    title: "Generate Tenant Links",
    description: "Create personalized welcome links for each new tenant that include your property branding and local recommendations."
  },
  {
    icon: Users,
    title: "Enhance Move-In Experience",
    description: "Tenants receive curated local recommendations and essential information, reducing your support calls by 70%."
  },
  {
    icon: BarChart3,
    title: "Track Success Metrics",
    description: "Monitor tenant engagement, satisfaction scores, and support call reduction through your analytics dashboard."
  }
];

export function HowItWorksSection() {
  return (
    <section className="py-20 bg-muted/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-6">
            How CalmlySettled Works for Property Managers
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Four simple steps to transform your tenant onboarding from reactive to proactive
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {steps.map((step, index) => (
            <div 
              key={index}
              className="text-center group hover:scale-105 transition-smooth"
            >
              <div className="relative mb-6">
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-hero flex items-center justify-center shadow-glow group-hover:shadow-card">
                  <step.icon className="h-10 w-10 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-accent rounded-full flex items-center justify-center text-accent-foreground font-bold text-sm shadow-soft">
                  {index + 1}
                </div>
              </div>
              
              <h3 className="text-xl font-semibold text-foreground mb-4">
                {step.title}
              </h3>
              
              <p className="text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}