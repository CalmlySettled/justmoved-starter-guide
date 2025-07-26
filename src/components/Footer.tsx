import { Home, Mail, MapPin, Phone } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-foreground text-background py-16">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-gradient-hero flex items-center justify-center shadow-soft">
                <Home className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold">CalmlySettled</span>
            </div>
            <p className="text-background/80 leading-relaxed max-w-md">
              Making your move stress-free with personalized recommendations and local insights. 
              Join thousands who've found their perfect new home with CalmlySettled.
            </p>
          </div>
          
          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-3 text-background/80">
              <li><a href="#how-it-works" className="hover:text-background transition-smooth">How It Works</a></li>
              <li><a href="#features" className="hover:text-background transition-smooth">Features</a></li>
              <li><a href="#faq" className="hover:text-background transition-smooth">FAQ</a></li>
              <li><a href="#" className="hover:text-background transition-smooth">Concierge Service</a></li>
            </ul>
          </div>
          
          {/* Contact */}
          <div>
            <h3 className="font-semibold mb-4">Contact</h3>
            <ul className="space-y-3 text-background/80">
              <li className="flex items-center space-x-2">
                <Mail className="h-4 w-4" />
                <span>hello@calmlysettled.com</span>
              </li>
              <li className="flex items-center space-x-2">
                <Phone className="h-4 w-4" />
                <span>1-800-CALMLY</span>
              </li>
              <li className="flex items-center space-x-2">
                <MapPin className="h-4 w-4" />
                <span>San Francisco, CA</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-background/20 pt-8 text-center text-background/60">
          <p>&copy; 2024 CalmlySettled. All rights reserved. Making moves memorable since 2024.</p>
        </div>
      </div>
    </footer>
  );
}