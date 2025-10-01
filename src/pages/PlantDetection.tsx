import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PlantDetectionSystem from "@/components/PlantDetectionSystem";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Leaf, ArrowLeft } from "lucide-react";
import type { User, Session } from '@supabase/supabase-js';

const PlantDetection = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        if (!session?.user) {
          navigate("/auth");
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (!session?.user) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen cosmic-gradient flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!user || !session) {
    return null; // Will redirect to auth
  }

  return (
    <div className="min-h-screen cosmic-gradient">
      <div className="absolute inset-0 bg-[url('/src/assets/hero-nebula.jpg')] bg-cover bg-center opacity-10" />
      
      {/* Header */}
      <header className="relative z-10 border-b border-border/20 backdrop-blur-md">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-600">
              <Leaf className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-green-600">
                Plant Detection System
              </h1>
              <p className="text-sm text-muted-foreground">
                ML Pipeline for Plant Identification
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-sm font-medium text-foreground">
              {user.email}
            </p>
            <p className="text-xs text-muted-foreground">
              ML Engineer
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-4 py-8">
        <PlantDetectionSystem />
      </main>
    </div>
  );
};

export default PlantDetection;