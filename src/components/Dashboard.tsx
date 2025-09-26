import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Upload, History, BarChart3, Telescope, Brain } from "lucide-react";
import { toast } from "sonner";
import DataUpload from "./DataUpload";
import AnalysisResults from "./AnalysisResults";
import AnalysisHistory from "./AnalysisHistory";
import AIEnhancedAnalysis from "./AIEnhancedAnalysis";
import type { User, Session } from '@supabase/supabase-js';

interface DashboardProps {
  user: User;
  session: Session;
}

const Dashboard = ({ user, session }: DashboardProps) => {
  const [loading, setLoading] = useState(false);

  const clearLocalSupabaseState = () => {
    // Clear all Supabase-related items from localStorage
    Object.keys(localStorage).forEach(key => {
      if (key.toLowerCase().startsWith('supabase')) {
        localStorage.removeItem(key);
      }
    });
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      // First check if there's an active session
      const { data: { session }, error: getSessionError } = await supabase.auth.getSession();
      
      if (getSessionError) {
        console.error('Error getting session:', getSessionError);
      }

      if (!session) {
        // No session exists, clear local state and treat as successful logout
        clearLocalSupabaseState();
        toast.success("Signed out successfully");
        setLoading(false);
        return;
      }

      // Attempt to sign out
      const { error } = await supabase.auth.signOut();
      if (error) {
        // Handle session_not_found as a successful logout
        if (error.message?.includes('session_not_found') || 
            error.message?.includes('Session from session_id claim in JWT does not exist')) {
          clearLocalSupabaseState();
          toast.success("Signed out successfully");
        } else {
          toast.error("Error signing out");
        }
      } else {
        clearLocalSupabaseState();
        toast.success("Signed out successfully");
      }
    } catch (error) {
      // Handle thrown errors that might contain session_not_found
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('session_not_found') || 
          errorMessage.includes('Session from session_id claim in JWT does not exist')) {
        clearLocalSupabaseState();
        toast.success("Signed out successfully");
      } else {
        toast.error("An unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen cosmic-gradient">
      <div className="absolute inset-0 bg-[url('/src/assets/hero-nebula.jpg')] bg-cover bg-center opacity-10" />
      
      {/* Header */}
      <header className="relative z-10 border-b border-border/20 backdrop-blur-md">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg stellar-gradient">
              <Telescope className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold stellar-gradient bg-clip-text text-transparent">
                Stellar Spectre
              </h1>
              <p className="text-sm text-muted-foreground">
                Exoplanet Detection System
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">
                {user.email}
              </p>
              <p className="text-xs text-muted-foreground">
                Observatory Access
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              disabled={loading}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              {loading ? "Signing out..." : "Sign Out"}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">
            Exoplanet Transit Analysis
          </h2>
          <p className="text-muted-foreground">
            Upload stellar light curve data to detect planetary transits using advanced AI analysis
          </p>
        </div>

        <Tabs defaultValue="upload" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 max-w-2xl">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="ai-enhanced" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              AI Enhanced
            </TabsTrigger>
            <TabsTrigger value="results" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Results
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            <DataUpload userId={user.id} />
          </TabsContent>

          <TabsContent value="ai-enhanced" className="space-y-6">
            <AIEnhancedAnalysis userId={user.id} />
          </TabsContent>

          <TabsContent value="results" className="space-y-6">
            <AnalysisResults />
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <AnalysisHistory userId={user.id} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;