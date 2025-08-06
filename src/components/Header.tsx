import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Home, LogOut, LayoutDashboard, ChevronDown, User, Settings, Menu, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";


export function Header() {
  const { user, signOut } = useAuth();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);

  const getUserName = () => {
    if (!user) return '';
    
    // First check for display name in user metadata
    const displayName = user.user_metadata?.display_name || user.user_metadata?.full_name;
    if (displayName) {
      // Return just the first name (first word)
      return displayName.split(' ')[0];
    }
    
    // Fall back to extracting from email if no display name
    const emailName = user.email?.split('@')[0] || '';
    return emailName
      .replace(/[._]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ') || 'User';
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border/50 shadow-soft">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
          <div className="w-10 h-10 rounded-lg bg-gradient-hero flex items-center justify-center shadow-soft">
            <Home className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl sm:text-2xl font-bold text-foreground">CalmlySettled</span>
        </Link>
        
        <nav className="hidden md:flex items-center space-x-8">
          <Link 
            to="/explore"
            className="text-muted-foreground hover:text-foreground transition-smooth"
          >
            Essentials
          </Link>
          <Link 
            to="/popular"
            className="text-muted-foreground hover:text-foreground transition-smooth"
          >
            Popular
          </Link>
        </nav>
        
        <div className="flex items-center space-x-4">
          {/* Mobile menu */}
          {isMobile && (
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden min-h-[44px] min-w-[44px]">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 bg-background">
                <div className="flex flex-col space-y-6 mt-8">
                  <Link 
                    to="/explore"
                    className="text-lg font-medium text-foreground hover:text-primary transition-smooth"
                    onClick={() => setIsOpen(false)}
                  >
                    Essentials
                  </Link>
                  <Link 
                    to="/popular"
                    className="text-lg font-medium text-foreground hover:text-primary transition-smooth"
                    onClick={() => setIsOpen(false)}
                  >
                    Popular
                  </Link>
                  
                  <div className="border-t border-border pt-6">
                     {user ? (
                      <div className="mb-8">
                        <Link to="/onboarding" onClick={() => setIsOpen(false)}>
                          <Button variant="default" size="mobile" className="w-full">
                            Settle Me In
                          </Button>
                        </Link>
                      </div>
                    ) : null}
                     {user ? (
                      <div className="space-y-4">
                        <Link to="/profile" onClick={() => setIsOpen(false)}>
                          <Button variant="ghost" size="mobile" className="w-full justify-start">
                            <User className="h-4 w-4 mr-2" />
                            Profile
                          </Button>
                        </Link>
                        <Link to="/favorites" onClick={() => setIsOpen(false)}>
                          <Button variant="ghost" size="mobile" className="w-full justify-start">
                            <Star className="h-4 w-4 mr-2" />
                            My Favorites
                          </Button>
                        </Link>
                        <Button 
                          variant="ghost" 
                          size="mobile"
                          className="w-full justify-start text-destructive hover:text-destructive"
                          onClick={() => {
                            signOut();
                            setIsOpen(false);
                          }}
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          Sign Out
                        </Button>
                      </div>
                    ) : (
                      <div>
                        <Link to="/auth" onClick={() => setIsOpen(false)}>
                          <Button size="mobile" className="w-full bg-gradient-hero text-white border-0 shadow-glow hover:shadow-card-hover transition-all">
                            Sign In
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          )}

          {/* Desktop navigation */}
          {!isMobile && (
            <>
              {user ? (
                <>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="flex items-center space-x-2">
                        <User className="h-4 w-4" />
                        <span className="hidden sm:inline">{getUserName()}</span>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 bg-background border border-border shadow-lg z-50">
                      <DropdownMenuItem asChild>
                        <Link to="/profile" className="flex items-center">
                          <User className="h-4 w-4 mr-2" />
                          Profile
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/favorites" className="flex items-center">
                          <Star className="h-4 w-4 mr-2" />
                          My Favorites
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign Out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <>
                  <Link to="/auth">
                    <Button className="bg-gradient-hero text-white border-0 shadow-glow hover:shadow-card-hover transition-all">
                      Sign In
                    </Button>
                  </Link>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}