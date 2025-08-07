import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, ExternalLink, Clock } from "lucide-react";
import { format, parseISO, isToday, isTomorrow, isThisWeek } from "date-fns";

interface Event {
  id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  venue: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  };
  ticket_url: string;
  logo_url?: string;
  category: string;
  is_free: boolean;
  distance_miles: number;
}

interface EventCardProps {
  event: Event;
  onClick?: (event: Event) => void;
}

export function EventCard({ event, onClick }: EventCardProps) {
  const startDate = parseISO(event.start_date);
  const endDate = parseISO(event.end_date);
  
  const formatEventDate = (date: Date) => {
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    if (isThisWeek(date)) return format(date, "EEEE");
    return format(date, "MMM dd");
  };

  const formatEventTime = (date: Date) => {
    return format(date, "h:mm a");
  };

  const handleCardClick = () => {
    onClick?.(event);
  };

  const handleTicketClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(event.ticket_url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Card 
      className="h-full cursor-pointer hover:shadow-md transition-shadow duration-200 group max-h-32"
      onClick={handleCardClick}
    >
      <CardHeader className="p-3 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-medium line-clamp-1 group-hover:text-primary transition-colors">
              {event.name}
            </CardTitle>
            <div className="flex items-center gap-1 mt-1">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {formatEventDate(startDate)}
              </span>
              <Clock className="h-3 w-3 text-muted-foreground ml-1" />
              <span className="text-xs text-muted-foreground">
                {formatEventTime(startDate)}
              </span>
            </div>
          </div>
          {event.logo_url && (
            <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0">
              <img 
                src={event.logo_url} 
                alt={event.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 p-3">
        <div className="space-y-2">
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground truncate">
              {event.venue.name}
            </span>
            <span className="text-xs text-muted-foreground">
              • {event.distance_miles} mi
            </span>
          </div>

          <div className="flex items-center justify-end">
            <Button 
              size="sm" 
              onClick={handleTicketClick}
              className="h-6 px-2 text-xs"
            >
              <ExternalLink className="h-2 w-2 mr-1" />
              Tickets
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}