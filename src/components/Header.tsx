import { Button } from "@/components/ui/button";
import { Home, LogOut, LayoutDashboard } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export function Header() {
  const { user, signOut } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border/50 shadow-soft">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-hero flex items-center justify-center shadow-soft">
            <Home className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-foreground">JustMoved</span>
        </div>
        
        <nav className="hidden md:flex items-center space-x-8">
          <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-smooth">
            How It Works
          </a>
          <a href="#features" className="text-muted-foreground hover:text-foreground transition-smooth">
            Features
          </a>
          <a href="#faq" className="text-muted-foreground hover:text-foreground transition-smooth">
            FAQ
          </a>
        </nav>
        
        <div className="flex items-center space-x-4">
          {user ? (
            <>
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {user.email}
              </span>
              <Link to="/dashboard">
                <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={signOut}
                className="hidden sm:inline-flex"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
              <Link to="/onboarding">
                <Button variant="default">
                  Take Quiz
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link to="/auth">
                <Button variant="ghost" className="hidden sm:inline-flex">
                  Sign In
                </Button>
              </Link>
              <Link to="/onboarding">
                <Button variant="default">
                  Get Started
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}