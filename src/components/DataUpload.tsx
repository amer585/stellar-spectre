import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface DataUploadProps {
  userId: string;
}

const DataUpload = ({ userId }: DataUploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadComplete, setUploadComplete] = useState(false);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      // Validate file type and size
      const validTypes = ['.csv', '.txt', '.dat', '.tsv', '.json', '.xlsx', '.xls', '.fits', '.h5', '.hdf5', '.parquet'];
      const fileExtension = '.' + selectedFile.name.split('.').pop()?.toLowerCase();
      
      if (!validTypes.includes(fileExtension)) {
        toast.error("Please upload a supported data file (CSV, TXT, DAT, TSV, JSON, XLSX, XLS, FITS, H5, HDF5, or Parquet)");
        return;
      }
      
      if (selectedFile.size > 50 * 1024 * 1024) { // 50MB limit
        toast.error("File size must be less than 50MB");
        return;
      }
      
      setFile(selectedFile);
      setUploadComplete(false);
      setProgress(0);
    }
  }, []);

  const handleUploadAndAnalyze = async () => {
    if (!file) {
      toast.error("Please select a file first");
      return;
    }

    setUploading(true);
    setProgress(10);

    try {
      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      setProgress(30);
      
      const { error: uploadError } = await supabase.storage
        .from('light-curves')
        .upload(`${userId}/${fileName}`, file);

      if (uploadError) {
        throw uploadError;
      }

      setProgress(60);
      setUploading(false);
      setAnalyzing(true);
      setUploadComplete(true);

      // Call the analysis edge function
      const { data, error: analysisError } = await supabase.functions.invoke('analyze-transit', {
        body: {
          userId,
          fileName,
          originalName: file.name
        }
      });

      setProgress(100);

      if (analysisError) {
        throw analysisError;
      }

      toast.success("Analysis complete! Check the Results tab for findings.");
      setFile(null);
      
    } catch (error: any) {
      console.error('Upload/Analysis error:', error);
      toast.error(error.message || "Failed to upload and analyze file");
    } finally {
      setUploading(false);
      setAnalyzing(false);
      setProgress(0);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      // Directly call handleFileSelect with constructed event
      handleFileSelect({
        target: {
          files: e.dataTransfer.files
        }
      } as React.ChangeEvent<HTMLInputElement>);
    }
  }, [handleFileSelect]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Light Curve Data Upload
          </CardTitle>
          <CardDescription>
            Upload stellar brightness measurements for exoplanet transit detection
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Upload Area */}
          <div
            className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-accent transition-colors"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 rounded-full bg-muted">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="text-lg font-medium">
                  {file ? file.name : "Drag & drop your light curve file"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "Multiple formats supported (max 50MB)"}
                </p>
              </div>
              <Button variant="outline" type="button">
                Browse Files
              </Button>
            </div>
          </div>

          <Input
            id="file-input"
            type="file"
            accept=".csv,.txt,.dat,.tsv,.json,.xlsx,.xls,.fits,.h5,.hdf5,.parquet"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* File Format Info */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Expected Data Format
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Time column (days, hours, or Julian dates)</li>
              <li>• Brightness/flux measurements (normalized or raw)</li>
              <li>• Optional: measurement errors/uncertainties</li>
              <li>• CSV format with headers preferred</li>
            </ul>
          </div>

          {/* Upload Progress */}
          {(uploading || analyzing) && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {uploading && "Uploading file..."}
                  {analyzing && "Analyzing for transits..."}
                </span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
              {analyzing && (
                <p className="text-xs text-muted-foreground">
                  AI analysis in progress - detecting periodic brightness dips...
                </p>
              )}
            </div>
          )}

          {/* Upload Status */}
          {uploadComplete && !analyzing && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm">File uploaded successfully</span>
            </div>
          )}

          {/* Action Button */}
          <Button
            onClick={handleUploadAndAnalyze}
            disabled={!file || uploading || analyzing}
            className="w-full"
            size="lg"
          >
            {uploading && "Uploading..."}
            {analyzing && "Analyzing Transits..."}
            {!uploading && !analyzing && (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload & Analyze
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default DataUpload;