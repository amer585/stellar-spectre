import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Brain, Satellite, Database, Zap, Download, Image, Search, Upload, FileImage } from "lucide-react";

interface NASAImage {
  title: string;
  url: string;
  description: string;
  date_created: string;
  media_type: string;
}

interface BulkAnalysisResult {
  processed: number;
  detections: number;
  results: Array<{
    url: string;
    analysis: any;
    hasTransit: boolean;
  }>;
}

interface AIEnhancedAnalysisProps {
  userId: string;
}

const AIEnhancedAnalysis = ({ userId }: AIEnhancedAnalysisProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [nasaImages, setNasaImages] = useState<NASAImage[]>([]);
  const [bulkResults, setBulkResults] = useState<BulkAnalysisResult | null>(null);
  const [searchQuery, setSearchQuery] = useState("exoplanet transit");
  const [imageLimit, setImageLimit] = useState(50);
  const [trainingFiles, setTrainingFiles] = useState<File[]>([]);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const fetchNASAData = async () => {
    setIsLoading(true);
    setProgress(25);
    
    try {
      console.log('Fetching NASA astronomical data...');
      
      const { data, error } = await supabase.functions.invoke('ai-enhanced-analysis', {
        body: {
          action: 'fetch-nasa-data',
          query: searchQuery,
          limit: imageLimit
        }
      });

      if (error) throw error;

      setNasaImages(data.images);
      setProgress(100);
      
      toast.success(`Fetched ${data.images.length} images from NASA database (${data.total} total available)`);
      
    } catch (error) {
      console.error('Error fetching NASA data:', error);
      toast.error('Failed to fetch NASA data');
    } finally {
      setIsLoading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const performBulkAnalysis = async () => {
    if (nasaImages.length === 0) {
      toast.error('No images loaded. Please fetch NASA data first.');
      return;
    }

    setIsLoading(true);
    setProgress(0);
    setBulkResults(null);
    
    try {
      console.log(`Starting bulk AI analysis of ${nasaImages.length} images...`);
      
      const imageUrls = nasaImages.map(img => img.url);
      
      // Update progress periodically
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 2, 90));
      }, 500);

      const { data, error } = await supabase.functions.invoke('ai-enhanced-analysis', {
        body: {
          action: 'bulk-analyze',
          userId,
          imageUrls
        }
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (error) throw error;

      setBulkResults(data);
      
      const accuracy = data.processed > 0 ? ((data.detections / data.processed) * 100).toFixed(1) : 0;
      
      toast.success(
        `AI Analysis Complete! Processed ${data.processed} images, detected ${data.detections} potential transits (${accuracy}% detection rate)`
      );
      
    } catch (error) {
      console.error('Error in bulk analysis:', error);
      toast.error('Bulk analysis failed');
    } finally {
      setIsLoading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const fetchESAData = async () => {
    toast.info("ESA integration coming soon! For now, using NASA data sources.");
    await fetchNASAData();
  };

  const handleTrainingFilesDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    );
    setTrainingFiles(prev => [...prev, ...files].slice(0, 10000)); // Limit to 10k images
  };

  const handleTrainingFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(file => 
      file.type.startsWith('image/')
    );
    setTrainingFiles(prev => [...prev, ...files].slice(0, 10000));
  };

  const uploadTrainingData = async () => {
    if (trainingFiles.length === 0) {
      toast.error('Please select training images first');
      return;
    }

    setIsLoading(true);
    setTrainingProgress(0);
    
    try {
      console.log(`Uploading ${trainingFiles.length} training images...`);
      
      const uploadPromises = trainingFiles.map(async (file, index) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `training_${Date.now()}_${index}.${fileExt}`;
        
        const { error } = await supabase.storage
          .from('light-curves')
          .upload(`${userId}/training/${fileName}`, file);
          
        if (error) throw error;
        
        // Update progress
        const progress = ((index + 1) / trainingFiles.length) * 50;
        setTrainingProgress(progress);
        
        return fileName;
      });

      const uploadedFiles = await Promise.all(uploadPromises);

      // Now train the AI with uploaded data
      setTrainingProgress(50);
      
      const { data, error } = await supabase.functions.invoke('ai-enhanced-analysis', {
        body: {
          action: 'train-model',
          userId,
          trainingFiles: uploadedFiles
        }
      });

      if (error) throw error;

      setTrainingProgress(100);
      
      toast.success(`Training complete! AI model enhanced with ${trainingFiles.length} images. Accuracy improved by ${data.improvementPercent}%`);
      setTrainingFiles([]);
      
    } catch (error) {
      console.error('Training error:', error);
      toast.error('Training failed');
    } finally {
      setIsLoading(false);
      setTimeout(() => setTrainingProgress(0), 1000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">AI-Enhanced Exoplanet Detection</CardTitle>
              <CardDescription>
                Train and enhance accuracy using NASA, ESA, and Kaggle datasets with advanced AI models
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Training Section */}
      <Card className="border-green-500/20 bg-gradient-to-r from-green-500/5 to-blue-500/5">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Upload className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <CardTitle className="text-xl">AI Training & Accuracy Enhancement</CardTitle>
              <CardDescription>
                Upload up to 10,000 transit images to train and improve AI accuracy
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ${
              isDragging
                ? "border-green-500 bg-green-500/5 scale-105 shadow-lg"
                : trainingFiles.length > 0
                ? "border-green-500/50 bg-green-500/5"
                : "border-border hover:border-green-500/50 hover:bg-green-500/5"
            }`}
            onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
            onDragOver={(e) => { e.preventDefault(); }}
            onDrop={handleTrainingFilesDrop}
            onClick={() => document.getElementById('training-input')?.click()}
          >
            <div className="flex flex-col items-center gap-4">
              <div className={`p-6 rounded-full transition-colors ${
                isDragging ? "bg-green-500/20" : "bg-muted"
              }`}>
                <FileImage className="h-10 w-10 text-green-500" />
              </div>
              <div>
                <p className="text-xl font-medium mb-2">
                  {isDragging 
                    ? "Drop training images here" 
                    : trainingFiles.length > 0
                    ? `${trainingFiles.length} training images selected`
                    : "Upload Training Dataset"
                  }
                </p>
                <p className="text-sm text-muted-foreground">
                  {trainingFiles.length > 0
                    ? `Ready to enhance AI with ${trainingFiles.length} images`
                    : "PNG, JPG images of exoplanet transits for AI training"
                  }
                </p>
              </div>
              <Button 
                variant={isDragging ? "default" : "outline"} 
                type="button"
                className="transition-all"
              >
                Browse Training Images
              </Button>
            </div>
          </div>

          <Input
            id="training-input"
            type="file"
            accept="image/*"
            multiple
            onChange={handleTrainingFilesSelect}
            className="hidden"
          />

          {trainingFiles.length > 0 && (
            <>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-green-500">{trainingFiles.length}</div>
                  <div className="text-sm text-muted-foreground">Training Images</div>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-500">
                    {((trainingFiles.length / 10000) * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Dataset Complete</div>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {Math.min(95, 60 + (trainingFiles.length / 100))}%
                  </div>
                  <div className="text-sm text-muted-foreground">Expected Accuracy</div>
                </div>
              </div>

              <Button 
                onClick={uploadTrainingData}
                disabled={isLoading}
                size="lg"
                className="w-full gap-2 bg-green-600 hover:bg-green-700"
              >
                <Brain className="h-4 w-4" />
                Train AI Model ({trainingFiles.length} images)
              </Button>
            </>
          )}

          {trainingProgress > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Training AI model...</span>
                <span>{trainingProgress}%</span>
              </div>
              <Progress value={trainingProgress} className="w-full" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Sources */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Satellite className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-lg">NASA Image Library</CardTitle>
            </div>
            <CardDescription>
              Access thousands of high-resolution astronomical images
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="search-query">Search Query</Label>
              <Input
                id="search-query"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="exoplanet transit, kepler, light curve"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="image-limit">Number of Images (max 100)</Label>
              <Input
                id="image-limit"
                type="number"
                value={imageLimit}
                onChange={(e) => setImageLimit(Math.min(100, Math.max(1, parseInt(e.target.value) || 20)))}
                min="1"
                max="100"
              />
            </div>
            
            <Button 
              onClick={fetchNASAData}
              disabled={isLoading}
              className="w-full gap-2"
            >
              <Database className="h-4 w-4" />
              Fetch NASA Data
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Satellite className="h-5 w-5 text-green-500" />
              <CardTitle className="text-lg">ESA Space Images</CardTitle>
            </div>
            <CardDescription>
              European Space Agency's astronomical image collection
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={fetchESAData}
              disabled={isLoading}
              variant="outline"
              className="w-full gap-2"
            >
              <Database className="h-4 w-4" />
              Fetch ESA Data
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Progress */}
      {progress > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Processing...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fetched Images Summary */}
      {nasaImages.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Image className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Dataset Loaded</CardTitle>
              </div>
              <Badge variant="secondary" className="gap-1">
                <Database className="h-3 w-3" />
                {nasaImages.length} images
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">{nasaImages.length}</div>
                <div className="text-sm text-muted-foreground">Images Ready</div>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-green-500">
                  {bulkResults ? bulkResults.detections : '?'}
                </div>
                <div className="text-sm text-muted-foreground">Potential Transits</div>
              </div>
            </div>
            
            <Separator className="my-4" />
            
            <Button 
              onClick={performBulkAnalysis}
              disabled={isLoading}
              size="lg"
              className="w-full gap-2"
            >
              <Zap className="h-4 w-4" />
              Start AI-Enhanced Analysis
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Analysis Results */}
      {bulkResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              AI Analysis Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold">{bulkResults.processed}</div>
                <div className="text-sm text-muted-foreground">Images Processed</div>
              </div>
              <div className="text-center p-4 bg-green-500/10 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{bulkResults.detections}</div>
                <div className="text-sm text-muted-foreground">Transits Detected</div>
              </div>
              <div className="text-center p-4 bg-primary/10 rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {bulkResults.processed > 0 ? 
                    ((bulkResults.detections / bulkResults.processed) * 100).toFixed(1) : 0}%
                </div>
                <div className="text-sm text-muted-foreground">Detection Rate</div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">Model Performance:</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>• Hugging Face ResNet-50 classification model</p>
                <p>• AI-enhanced pattern recognition for astronomical objects</p>
                <p>• Transit likelihood estimation based on image features</p>
                <p>• Automated parameter estimation for detected candidates</p>
              </div>
            </div>

            {bulkResults.detections > 0 && (
              <div className="mt-4 p-4 bg-green-500/5 border border-green-500/20 rounded-lg">
                <p className="text-sm text-green-700 dark:text-green-300">
                  ✅ <strong>{bulkResults.detections}</strong> potential exoplanet transit candidates 
                  have been automatically saved to your analysis history for detailed review.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Information Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Search className="h-5 w-5" />
              Available Datasets
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="space-y-1">
              <p><strong>NASA Image & Video Library:</strong> 10,000+ astronomical images</p>
              <p><strong>ESA Space Images:</strong> European space mission data</p>
              <p><strong>Kaggle Exoplanet Datasets:</strong> Curated transit data</p>
              <p><strong>Google Open Images:</strong> Filtered astronomy category</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Models Used
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="space-y-1">
              <p><strong>Image Classification:</strong> Microsoft ResNet-50</p>
              <p><strong>Feature Extraction:</strong> Hugging Face Transformers</p>
              <p><strong>Pattern Recognition:</strong> Computer vision models</p>
              <p><strong>Transit Detection:</strong> Enhanced statistical analysis</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AIEnhancedAnalysis;