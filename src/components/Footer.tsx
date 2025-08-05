import { Home, Mail, MapPin, Phone } from "lucide-react";
import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="bg-foreground text-background py-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 mb-12">
          {/* Brand */}
          <div className="sm:col-span-2 md:col-span-2">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-gradient-hero flex items-center justify-center shadow-soft">
                <Home className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold">CalmlySettled</span>
            </div>
            <p className="text-background/80 leading-relaxed max-w-md">
              Making your move stress-free with personalized recommendations and local insights. 
              Join others who've calmly settled into their new home.
            </p>
          </div>
          
          {/* Resources */}
          <div>
            <h3 className="font-semibold mb-4">Resources</h3>
            <ul className="space-y-3 text-background/80">
              <li><Link to="/about" className="hover:text-background transition-smooth">About Us</Link></li>
              <li><Link to="/how-it-works" className="hover:text-background transition-smooth">How It Works</Link></li>
              <li><Link to="/features" className="hover:text-background transition-smooth">Features</Link></li>
              <li><Link to="/faq" className="hover:text-background transition-smooth">FAQ</Link></li>
              
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
                <span>925-437-6966</span>
              </li>
              <li className="flex items-center space-x-2">
                <MapPin className="h-4 w-4" />
                <span>Bloomfield, CT</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-background/20 pt-8 text-center text-background/60">
          <p>&copy; 2025 CalmlySettled. All rights reserved. Making moves memorable since 2025.</p>
        </div>
      </div>
    </footer>
  );
}