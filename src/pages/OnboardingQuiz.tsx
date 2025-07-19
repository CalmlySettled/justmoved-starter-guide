import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function OnboardingQuiz() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 shadow-soft">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-hero flex items-center justify-center shadow-soft">
              <Home className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-foreground">JustMoved</span>
          </Link>
          
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Let's Get You Settled In!
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Tell us a bit about yourself so we can create your personalized local guide
          </p>
        </div>

        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-center text-2xl">
              Onboarding Quiz Coming Soon
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground mb-8">
              We're preparing 7 personalized questions to help you get the most out of JustMoved. 
              This quiz will help us understand your needs and create a customized local guide just for you.
            </p>
            
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                The quiz will cover:
              </div>
              <ul className="text-left text-muted-foreground space-y-2 max-w-md mx-auto">
                <li>• Your location and living situation</li>
                <li>• Your lifestyle preferences</li>
                <li>• Essential services you need</li>
                <li>• Activities and interests</li>
                <li>• Family needs and priorities</li>
              </ul>
            </div>

            <div className="mt-12">
              <Link to="/">
                <Button variant="outline" size="lg">
                  Return to Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}