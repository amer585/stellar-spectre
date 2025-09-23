import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { History, Search, Filter, Download, Calendar } from "lucide-react";
import { toast } from "sonner";

interface AnalysisHistoryProps {
  userId: string;
}

interface HistoryEntry {
  id: string;
  file_name: string;
  analysis_result: any; // Use any for JSON data from database
  created_at: string;
  status: string;
}

const AnalysisHistory = ({ userId }: AnalysisHistoryProps) => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  useEffect(() => {
    fetchHistory();
  }, [userId]);

  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('transit_analyses')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching history:', error);
        toast.error("Failed to load analysis history");
        return;
      }

      setHistory(data || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error("Failed to load analysis history");
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = history
    .filter(entry => {
      const matchesSearch = entry.file_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterStatus === "all" || entry.status === filterStatus;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "confidence":
          return (b.analysis_result?.confidence_score || 0) - (a.analysis_result?.confidence_score || 0);
        case "detections":
          return Number(b.analysis_result?.detection || false) - Number(a.analysis_result?.detection || false);
        default: // newest
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'processing':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const downloadReport = async (entry: HistoryEntry) => {
    try {
      const report = {
        filename: entry.file_name,
        analysis_date: entry.created_at,
        detection: entry.analysis_result?.detection ? "Yes" : "No",
        confidence_score: `${entry.analysis_result?.confidence_score || 0}%`,
        orbital_period: entry.analysis_result?.orbital_period 
          ? `${entry.analysis_result.orbital_period.toFixed(3)} days` 
          : "N/A",
        status: entry.status
      };

      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transit-analysis-${entry.id}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success("Report downloaded successfully");
    } catch (error) {
      toast.error("Failed to download report");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Analysis History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading analysis history...</p>
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
            <History className="h-5 w-5" />
            Analysis History
          </CardTitle>
          <CardDescription>
            View and manage your previous transit detection analyses
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by filename..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="confidence">By Confidence</SelectItem>
                <SelectItem value="detections">Detections First</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* History List */}
          {filteredHistory.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm || filterStatus !== "all" 
                  ? "No analyses match your filters" 
                  : "No analysis history yet"
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredHistory.map((entry) => (
                <div 
                  key={entry.id} 
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/20 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium">{entry.file_name}</h4>
                      <Badge variant={getStatusBadgeVariant(entry.status)}>
                        {entry.status}
                      </Badge>
                      {entry.analysis_result?.detection && (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Transit Detected
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                      <span>
                        {new Date(entry.created_at).toLocaleDateString()} at{' '}
                        {new Date(entry.created_at).toLocaleTimeString()}
                      </span>
                      {entry.analysis_result?.confidence_score && (
                        <span>
                          Confidence: {entry.analysis_result.confidence_score}%
                        </span>
                      )}
                      {entry.analysis_result?.orbital_period && (
                        <span>
                          Period: {entry.analysis_result.orbital_period.toFixed(3)} days
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadReport(entry)}
                      disabled={entry.status !== 'completed'}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Summary Stats */}
          {history.length > 0 && (
            <div className="mt-6 pt-6 border-t border-border">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-primary">{history.length}</div>
                  <div className="text-sm text-muted-foreground">Total Analyses</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {history.filter(h => h.analysis_result?.detection).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Detections</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {history.filter(h => h.status === 'completed').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Completed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {history.filter(h => h.status === 'processing').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Processing</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalysisHistory;