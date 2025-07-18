import { MapPin, UserCheck, Calendar, Heart } from "lucide-react";

const steps = [
  {
    icon: UserCheck,
    title: "Take Our Quiz",
    description: "Tell us about your lifestyle, family, and what matters most to you in your new city."
  },
  {
    icon: MapPin,
    title: "Get Personalized Recommendations",
    description: "Receive curated lists of local essentials, from grocery stores to pediatricians, tailored to your needs."
  },
  {
    icon: Calendar,
    title: "Complete Your To-Do List",
    description: "Follow our customized checklist of important tasks like car registration and utility setup."
  },
  {
    icon: Heart,
    title: "Feel at Home",
    description: "Discover fun activities, community resources, and start building connections in your new neighborhood."
  }
];

export function HowItWorksSection() {
  return (
    <section className="py-20 bg-muted/30">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            How JustMoved Works
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Four simple steps to transform your moving experience from stressful to seamless
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
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