import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, AlertCircle, CheckCircle2, Image } from "lucide-react";
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
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      // Validate file type and size
      const dataTypes = ['.csv', '.txt', '.dat', '.tsv', '.json', '.xlsx', '.xls', '.fits', '.h5', '.hdf5', '.parquet'];
      const imageTypes = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff', '.webp'];
      const validTypes = [...dataTypes, ...imageTypes];
      const fileExtension = '.' + selectedFile.name.split('.').pop()?.toLowerCase();
      
      if (!validTypes.includes(fileExtension)) {
        toast.error("Please upload a supported file (Data: CSV, TXT, DAT, TSV, JSON, XLSX, XLS, FITS, H5, HDF5, Parquet | Images: PNG, JPG, JPEG, GIF, BMP, TIFF, WEBP)");
        return;
      }
      
      if (selectedFile.size > 50 * 1024 * 1024) { // 50MB limit
        toast.error("File size must be less than 50MB");
        return;
      }
      
      setFile(selectedFile);
      setUploadComplete(false);
      setProgress(0);
      
      // Generate preview for images
      if (imageTypes.includes(fileExtension)) {
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target?.result as string);
        reader.readAsDataURL(selectedFile);
      } else {
        setPreview(null);
      }
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
      setPreview(null);
      
    } catch (error: any) {
      console.error('Upload/Analysis error:', error);
      toast.error(error.message || "Failed to upload and analyze file");
    } finally {
      setUploading(false);
      setAnalyzing(false);
      setProgress(0);
    }
  };

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
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
            Light Curve Analysis Upload
          </CardTitle>
          <CardDescription>
            Upload stellar data files (CSV, JSON, FITS, Excel) or light curve images (PNG, JPG) for AI-powered exoplanet transit detection
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Upload Area */}
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ${
              isDragging
                ? "border-primary bg-primary/5 scale-105 shadow-lg"
                : file
                ? "border-primary/50 bg-primary/5"
                : "border-border hover:border-accent hover:bg-accent/5"
            }`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            {preview ? (
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <img 
                    src={preview} 
                    alt="Preview" 
                    className="max-h-32 max-w-full rounded-lg object-contain"
                  />
                  <div className="absolute top-2 right-2 p-1 rounded-full bg-background/80 backdrop-blur-sm">
                    <Image className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <div>
                  <p className="text-lg font-medium">{file?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {file && `${(file.size / 1024 / 1024).toFixed(2)} MB`} • Light curve image
                  </p>
                </div>
                <Button variant="outline" type="button" size="sm">
                  Change File
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className={`p-6 rounded-full transition-colors ${
                  isDragging ? "bg-primary/20" : "bg-muted"
                }`}>
                  {isDragging ? (
                    <Upload className="h-10 w-10 text-primary animate-bounce" />
                  ) : file ? (
                    <CheckCircle2 className="h-10 w-10 text-primary" />
                  ) : (
                    <FileText className="h-10 w-10 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="text-xl font-medium mb-2">
                    {isDragging 
                      ? "Drop your file here" 
                      : file 
                      ? file.name 
                      : "Drag & drop your light curve data"
                    }
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {file 
                      ? `${(file.size / 1024 / 1024).toFixed(2)} MB` 
                      : "Data files (CSV, JSON, FITS, Excel) or Light curve images (PNG, JPG)"
                    }
                  </p>
                </div>
                <Button 
                  variant={isDragging ? "default" : "outline"} 
                  type="button"
                  className="transition-all"
                >
                  Browse Files
                </Button>
              </div>
            )}
          </div>

          <Input
            id="file-input"
            type="file"
            accept=".csv,.txt,.dat,.tsv,.json,.xlsx,.xls,.fits,.h5,.hdf5,.parquet,.png,.jpg,.jpeg,.gif,.bmp,.tiff,.webp"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* File Format Info */}
          <div className="bg-gradient-to-r from-muted/50 to-muted/30 rounded-xl p-6 border border-border/50">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-accent" />
              Supported Formats & Data Types
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-foreground mb-2">📊 Data Files:</p>
                <ul className="text-muted-foreground space-y-1">
                  <li>• Time-series data (CSV, TSV, JSON)</li>
                  <li>• Excel files (XLSX, XLS)</li>
                  <li>• Astronomy formats (FITS, HDF5)</li>
                  <li>• Advanced: Parquet, DAT, TXT</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-foreground mb-2">🖼️ Light Curve Images:</p>
                <ul className="text-muted-foreground space-y-1">
                  <li>• Charts/graphs (PNG, JPG, JPEG)</li>
                  <li>• Scientific plots (TIFF, BMP)</li>
                  <li>• Web images (WEBP, GIF)</li>
                  <li>• AI will extract data from plots</li>
                </ul>
              </div>
            </div>
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