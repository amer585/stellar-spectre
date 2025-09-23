import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Dashboard from "@/components/Dashboard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Telescope, ArrowRight } from "lucide-react";
import heroImage from "@/assets/hero-nebula.jpg";
import type { User, Session } from '@supabase/supabase-js';

interface IndexProps {
  user: User | null;
  session: Session | null;
}

const Index = ({ user, session }: IndexProps) => {
  const navigate = useNavigate();

  useEffect(() => {
    // Update document title and meta description for SEO
    document.title = "Stellar Spectre - AI-Powered Exoplanet Detection System";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute("content", "Advanced AI system for detecting exoplanets using stellar light curve analysis and the transit method. Professional astrophysics tools for researchers and astronomers.");
    }
  }, []);

  if (user && session) {
    return <Dashboard user={user} session={session} />;
  }

  return (
    <div className="min-h-screen cosmic-gradient">
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-30"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      
      <main className="relative z-10">
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-20 text-center">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8 inline-block p-4 rounded-full stellar-gradient stellar-glow">
              <Telescope className="h-12 w-12 text-primary-foreground" />
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              <span className="stellar-gradient bg-clip-text text-transparent">
                Stellar Spectre
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              AI-Powered Exoplanet Detection System using advanced transit method analysis
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Button
                size="lg"
                onClick={() => navigate("/auth")}
                className="stellar-gradient stellar-glow text-lg px-8 py-4"
              >
                Start Detection Analysis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-4 py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Advanced Transit Detection
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Professional-grade tools for analyzing stellar light curves and detecting planetary transits
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card className="p-8 text-center border-border/50 bg-card/50 backdrop-blur-sm">
              <div className="mb-6 p-4 rounded-full nebula-gradient w-fit mx-auto">
                <svg className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-4">AI Analysis Engine</h3>
              <p className="text-muted-foreground">
                Advanced machine learning algorithms detect periodic brightness dips with high precision and confidence scoring
              </p>
            </Card>

            <Card className="p-8 text-center border-border/50 bg-card/50 backdrop-blur-sm">
              <div className="mb-6 p-4 rounded-full analysis-gradient w-fit mx-auto">
                <svg className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 3v18h18"/>
                  <path d="M18 17l-5-5-5 5-3-3"/>
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-4">Transit Method</h3>
              <p className="text-muted-foreground">
                Specialized in detecting U-shaped and V-shaped brightness curves indicating planetary transits across stellar disks
              </p>
            </Card>

            <Card className="p-8 text-center border-border/50 bg-card/50 backdrop-blur-sm">
              <div className="mb-6 p-4 rounded-full stellar-gradient w-fit mx-auto">
                <svg className="h-8 w-8 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14,2 14,8 20,8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10,9 9,9 8,9"/>
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-4">Detailed Reports</h3>
              <p className="text-muted-foreground">
                Comprehensive analysis reports with orbital periods, planet sizes, and confidence metrics for scientific research
              </p>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Index;
