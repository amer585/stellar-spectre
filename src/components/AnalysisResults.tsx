import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, Clock, Download, BarChart3, Target } from "lucide-react";
import { toast } from "sonner";

interface TransitAnalysis {
  id: string;
  file_name: string;
  analysis_result: any; // Use any for JSON data from database
  created_at: string;
  status: string; // Use string instead of union for database compatibility
}

const AnalysisResults = () => {
  const [results, setResults] = useState<TransitAnalysis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLatestResults();
  }, []);

  const fetchLatestResults = async () => {
    try {
      const { data, error } = await supabase
        .from('transit_analyses')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching results:', error);
        toast.error("Failed to load analysis results");
        return;
      }

      setResults(data || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error("Failed to load analysis results");
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "bg-green-500";
    if (confidence >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  const formatPeriod = (period?: number) => {
    if (!period) return "N/A";
    if (period < 1) {
      return `${(period * 24).toFixed(2)} hours`;
    }
    return `${period.toFixed(3)} days`;
  };

  const formatDepth = (depth?: number) => {
    if (!depth) return "N/A";
    return `${(depth * 100).toFixed(4)}%`;
  };

  const formatPlanetSize = (ratio?: number) => {
    if (!ratio) return "N/A";
    return `${(ratio * 100).toFixed(2)}% of star radius`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Analysis Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading analysis results...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (results.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Analysis Results
          </CardTitle>
          <CardDescription>
            Transit detection results will appear here after analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No analysis results yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Upload a light curve file to begin detection
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Recent Analysis Results
          </CardTitle>
          <CardDescription>
            Latest exoplanet transit detection analyses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {results.map((result) => (
              <div key={result.id} className="border border-border rounded-lg p-6 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusIcon(result.status)}
                      <h3 className="font-semibold">{result.file_name}</h3>
                      <Badge variant={result.analysis_result?.detection ? "default" : "secondary"}>
                        {result.analysis_result?.detection ? "Transit Detected" : "No Transit"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Analyzed {new Date(result.created_at).toLocaleString()}
                    </p>
                  </div>
                  
                  {result.status === 'completed' && (
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground mb-1">Confidence</div>
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={result.analysis_result?.confidence_score || 0} 
                          className="w-20"
                        />
                        <span 
                          className={`text-sm font-medium px-2 py-1 rounded text-white ${getConfidenceColor(result.analysis_result?.confidence_score || 0)}`}
                        >
                          {result.analysis_result?.confidence_score || 0}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Detection Details */}
                {result.status === 'completed' && result.analysis_result?.detection && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-border">
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-muted-foreground">Orbital Period</div>
                      <div className="text-lg font-semibold stellar-gradient bg-clip-text text-transparent">
                        {formatPeriod(result.analysis_result.orbital_period)}
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-muted-foreground">Transit Depth</div>
                      <div className="text-lg font-semibold text-nebula-blue">
                        {formatDepth(result.analysis_result.transit_depth)}
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-muted-foreground">Planet Size</div>
                      <div className="text-lg font-semibold text-cosmic-teal">
                        {formatPlanetSize(result.analysis_result.planet_radius_ratio)}
                      </div>
                    </div>
                  </div>
                )}

                {/* Additional Info */}
                {result.status === 'completed' && result.analysis_result?.analysis_notes && (
                  <div className="pt-4 border-t border-border">
                    <div className="text-sm font-medium text-muted-foreground mb-2">Analysis Notes</div>
                    <p className="text-sm text-foreground bg-muted/30 p-3 rounded">
                      {result.analysis_result.analysis_notes}
                    </p>
                  </div>
                )}

                {/* Processing Status */}
                {result.status === 'processing' && (
                  <div className="flex items-center gap-2 pt-4 border-t border-border">
                    <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full"></div>
                    <span className="text-sm text-muted-foreground">Analysis in progress...</span>
                  </div>
                )}

                {/* Error Status */}
                {result.status === 'failed' && (
                  <div className="pt-4 border-t border-border">
                    <div className="flex items-center gap-2 text-red-500">
                      <XCircle className="h-4 w-4" />
                      <span className="text-sm">Analysis failed</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalysisResults;