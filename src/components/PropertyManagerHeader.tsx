import React from 'react';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';

interface PropertyManagerHeaderProps {
  onSignOut: () => void;
  userName?: string;
}

const PropertyManagerHeader: React.FC<PropertyManagerHeaderProps> = ({ onSignOut, userName }) => {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="flex items-center space-x-2">
          <Link to="/property-manager/dashboard" className="flex items-center space-x-2">
            <img 
              src="/calmlysettled-logo.png" 
              alt="CalmlySettled Logo" 
              className="h-8 w-8"
            />
            <span className="font-bold text-primary">CalmlySettled</span>
          </Link>
          <span className="text-sm text-muted-foreground">Property Manager</span>
        </div>
        
        <div className="flex flex-1 items-center justify-end space-x-4">
          {userName && (
            <span className="text-sm text-muted-foreground">
              Welcome, {userName}
            </span>
          )}
          <Button variant="ghost" size="sm" onClick={onSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </header>
  );
};

export default PropertyManagerHeader;