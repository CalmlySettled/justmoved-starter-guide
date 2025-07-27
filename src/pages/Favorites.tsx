import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart } from "lucide-react";

export default function Favorites() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Your Favorites</h1>
            <p className="text-xl text-muted-foreground">
              Save places you love and want to visit
            </p>
          </div>

          <Card className="max-w-md mx-auto text-center">
            <CardHeader>
              <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <Heart className="h-8 w-8 text-muted-foreground" />
              </div>
              <CardTitle>No favorites yet</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Start exploring places and save your favorites to see them here!
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}