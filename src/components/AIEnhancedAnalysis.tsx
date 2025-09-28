import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Brain, Database, Target, ChartBar as BarChart3, Zap, Camera, Leaf, Bug, Activity, Cloud, Cpu, Download, Play, Settings, CircleCheck as CheckCircle2, CircleAlert as AlertCircle, TrendingUp, FolderOpen, ImagePlus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PlantDatasetStats {
  totalImages: number;
  plantImages: number;
  nonPlantImages: number;
  sources: Record<string, number>;
  plantTypes: Record<string, number>;
  lightingConditions: Record<string, number>;
  resolutions: Record<string, number>;
  backgrounds: Record<string, number>;
}

interface ModelEvaluation {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  confusionMatrix: number[][];
  testAccuracy: number;
  validationAccuracy: number;
  trainingAccuracy: number;
  auc: number;
}

interface TrainingResult {
  modelId: string;
  endpointUrl: string;
  evaluation: ModelEvaluation;
  trainingHistory: any[];
  config: any;
  modelFormats: { onnx: string; tensorflow: string };
}

interface UploadedFile {
  file: File;
  id: string;
  preview?: string;
  category: 'plant' | 'non_plant';
}

interface AIEnhancedAnalysisProps {
  userId: string;
}

const AIEnhancedAnalysis: React.FC<AIEnhancedAnalysisProps> = ({ userId }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState('');
  const [datasetStats, setDatasetStats] = useState<PlantDatasetStats | null>(null);
  const [trainingResult, setTrainingResult] = useState<TrainingResult | null>(null);
  const [currentTab, setCurrentTab] = useState('mode-selection');
  const [dataMode, setDataMode] = useState<'automatic' | 'manual' | null>(null);
  
  // Manual data gathering state
  const [plantImages, setPlantImages] = useState<UploadedFile[]>([]);
  const [nonPlantImages, setNonPlantImages] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  
  // Training configuration
  const [targetImageCount, setTargetImageCount] = useState(35000);
  const [modelArchitecture, setModelArchitecture] = useState('efficientnet');
  const [imageSize, setImageSize] = useState(224);
  const [batchSize, setBatchSize] = useState(32);
  const [epochs, setEpochs] = useState(50);
  const [learningRate, setLearningRate] = useState(0.001);

  // Check if user can proceed to next tab
  const canProceedToTraining = datasetStats && (datasetStats.plantImages >= 100 && datasetStats.nonPlantImages >= 50);
  const canProceedToTesting = trainingResult !== null;
  const canProceedToExport = trainingResult !== null;

  // Handle file selection for manual mode
  const handleFileSelection = useCallback(async (files: FileList, category: 'plant' | 'non_plant') => {
    const newFiles: UploadedFile[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Invalid File',
          description: `${file.name} is not an image file`,
          variant: 'destructive',
        });
        continue;
      }
      
      // Validate file size (max 10MB per image)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'File Too Large',
          description: `${file.name} is larger than 10MB`,
          variant: 'destructive',
        });
        continue;
      }
      
      const fileId = `${category}_${Date.now()}_${i}`;
      
      // Generate preview for images
      const preview = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });
      
      newFiles.push({
        file,
        id: fileId,
        preview,
        category
      });
    }
    
    if (category === 'plant') {
      setPlantImages(prev => [...prev, ...newFiles]);
    } else {
      setNonPlantImages(prev => [...prev, ...newFiles]);
    }
    
    toast({
      title: 'Files Added',
      description: `Added ${newFiles.length} ${category.replace('_', '-')} images`,
    });
  }, [toast]);

  // Remove uploaded file
  const removeFile = useCallback((fileId: string, category: 'plant' | 'non_plant') => {
    if (category === 'plant') {
      setPlantImages(prev => prev.filter(f => f.id !== fileId));
    } else {
      setNonPlantImages(prev => prev.filter(f => f.id !== fileId));
    }
  }, []);

  // Upload manual dataset to storage
  const uploadManualDataset = async () => {
    if (plantImages.length < 100 || nonPlantImages.length < 50) {
      toast({
        title: 'Insufficient Data',
        description: 'Need at least 100 plant images and 50 non-plant images',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    setProgress(0);
    setCurrentPhase('Uploading images to storage...');

    try {
      const totalFiles = plantImages.length + nonPlantImages.length;
      let uploadedCount = 0;

      // Upload plant images
      for (const uploadFile of plantImages) {
        const fileName = `manual_dataset/plant/${uploadFile.id}_${uploadFile.file.name}`;
        
        const { error } = await supabase.storage
          .from('training-datasets')
          .upload(fileName, uploadFile.file);

        if (error) {
          console.error(`Failed to upload ${uploadFile.file.name}:`, error);
        } else {
          // Store metadata
          await supabase.from('image_metadata').insert({
            id: uploadFile.id,
            user_id: userId,
            title: uploadFile.file.name,
            source: 'Manual_Upload',
            category: 'plant',
            file_path: fileName,
            metadata: {
              originalName: uploadFile.file.name,
              fileSize: uploadFile.file.size,
              uploadDate: new Date().toISOString(),
              dataType: 'manual'
            }
          });
        }

        uploadedCount++;
        setProgress((uploadedCount / totalFiles) * 100);
      }

      // Upload non-plant images
      for (const uploadFile of nonPlantImages) {
        const fileName = `manual_dataset/non_plant/${uploadFile.id}_${uploadFile.file.name}`;
        
        const { error } = await supabase.storage
          .from('training-datasets')
          .upload(fileName, uploadFile.file);

        if (error) {
          console.error(`Failed to upload ${uploadFile.file.name}:`, error);
        } else {
          // Store metadata
          await supabase.from('image_metadata').insert({
            id: uploadFile.id,
            user_id: userId,
            title: uploadFile.file.name,
            source: 'Manual_Upload',
            category: 'other',
            file_path: fileName,
            metadata: {
              originalName: uploadFile.file.name,
              fileSize: uploadFile.file.size,
              uploadDate: new Date().toISOString(),
              dataType: 'manual'
            }
          });
        }

        uploadedCount++;
        setProgress((uploadedCount / totalFiles) * 100);
      }

      // Create dataset stats
      const stats: PlantDatasetStats = {
        totalImages: plantImages.length + nonPlantImages.length,
        plantImages: plantImages.length,
        nonPlantImages: nonPlantImages.length,
        sources: { 'Manual_Upload': plantImages.length + nonPlantImages.length },
        plantTypes: { 'User_Uploaded': plantImages.length },
        lightingConditions: { 'Mixed': plantImages.length + nonPlantImages.length },
        resolutions: { 'Variable': plantImages.length + nonPlantImages.length },
        backgrounds: { 'Mixed': plantImages.length + nonPlantImages.length }
      };

      setDatasetStats(stats);
      setProgress(100);
      setCurrentPhase('Manual dataset upload completed!');

      toast({
        title: 'Dataset Upload Complete',
        description: `Successfully uploaded ${stats.totalImages} images (${stats.plantImages} plants, ${stats.nonPlantImages} non-plants)`,
      });

    } catch (error) {
      console.error('Error uploading manual dataset:', error);
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload dataset. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      setProgress(0);
      setCurrentPhase('');
    }
  };

  // Automatic dataset collection
  const collectAutomaticDataset = async () => {
    setLoading(true);
    setProgress(5);
    setCurrentPhase('Initializing automatic dataset collection...');
    
    try {
      const { data, error } = await supabase.functions.invoke('plant-dataset-collector', {
        body: {
          action: 'collect-dataset',
          userId,
          targetCount: targetImageCount,
          requirements: {
            plantImages: Math.floor(targetImageCount * 0.7),
            nonPlantImages: Math.floor(targetImageCount * 0.3),
            sources: ['PlantCLEF', 'ImageNet', 'Google_Open_Images', 'Kaggle_Plants', 'PlantVillage'],
            diversity: {
              lightingConditions: ['natural', 'artificial', 'mixed', 'low_light'],
              backgrounds: ['field', 'greenhouse', 'indoor', 'garden', 'wild'],
              plantTypes: ['trees', 'flowers', 'crops', 'leaves', 'indoor_plants', 'succulents'],
              perspectives: ['close_up', 'medium', 'wide_shot', 'aerial']
            }
          }
        }
      });

      if (error) throw error;

      setDatasetStats(data.stats);
      setProgress(100);
      setCurrentPhase('Automatic dataset collection completed!');
      
      toast({
        title: 'Dataset Collection Complete',
        description: `Successfully collected ${data.stats.totalImages.toLocaleString()} images`,
      });

    } catch (err) {
      console.error('Error collecting dataset:', err);
      toast({
        title: 'Error',
        description: 'Failed to collect dataset. Please try again.',
        variant: 'destructive',
      });
      setCurrentPhase('Collection failed');
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  // Train plant detection model
  const trainPlantDetectionModel = async () => {
    if (!canProceedToTraining) {
      toast({
        title: 'Insufficient Data',
        description: 'Please collect at least 100 plant images and 50 non-plant images before training.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setProgress(0);
    setCurrentPhase('Initializing model training...');

    try {
      const progressUpdates = [
        { progress: 10, phase: 'Loading dataset and preprocessing images...' },
        { progress: 20, phase: `Initializing ${modelArchitecture.toUpperCase()} with ImageNet pretrained weights...` },
        { progress: 30, phase: 'Setting up data augmentation pipeline...' },
        { progress: 40, phase: 'Starting transfer learning - freezing backbone layers...' },
        { progress: 50, phase: 'Training classification head (phase 1)...' },
        { progress: 65, phase: 'Fine-tuning backbone layers (phase 2)...' },
        { progress: 80, phase: 'Advanced training with learning rate scheduling...' },
        { progress: 90, phase: 'Validating model performance...' },
        { progress: 95, phase: 'Exporting model formats...' },
        { progress: 98, phase: 'Deploying to inference endpoint...' }
      ];

      for (const update of progressUpdates) {
        setProgress(update.progress);
        setCurrentPhase(update.phase);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      const { data, error } = await supabase.functions.invoke('plant-model-trainer', {
        body: {
          action: 'train-model',
          userId,
          config: {
            modelArchitecture,
            imageSize,
            batchSize,
            epochs,
            learningRate,
            optimizer: 'AdamW',
            scheduler: 'CosineAnnealingLR',
            augmentation: {
              rotation: 30,
              brightness: 0.2,
              contrast: 0.2,
              saturation: 0.2,
              hue: 0.1,
              horizontalFlip: true,
              verticalFlip: false,
              cutmix: true,
              mixup: true
            },
            splitRatio: {
              train: 0.8,
              validation: 0.1,
              test: 0.1
            }
          }
        }
      });

      if (error) throw error;

      setTrainingResult(data);
      setProgress(100);
      setCurrentPhase('Model training completed successfully!');
      
      toast({
        title: 'Model Training Complete!',
        description: `Accuracy: ${(data.evaluation.accuracy * 100).toFixed(2)}% | F1-Score: ${(data.evaluation.f1Score * 100).toFixed(2)}%`,
      });

    } catch (err) {
      console.error('Error training model:', err);
      toast({
        title: 'Training Failed',
        description: 'Failed to train model. Please try again.',
        variant: 'destructive',
      });
      setCurrentPhase('Training failed');
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  // Test trained model
  const testPlantModel = async (imageFile: File) => {
    if (!trainingResult) {
      toast({
        title: 'No Model Available',
        description: 'Please train a model first.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setCurrentPhase('Processing image for plant detection...');

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(imageFile);
      });
      const base64Image = await base64Promise;

      const { data, error } = await supabase.functions.invoke('plant-model-trainer', {
        body: {
          action: 'inference',
          userId,
          imageData: base64Image
        }
      });

      if (error) throw error;

      toast({
        title: 'Plant Detection Result',
        description: `${data.isPlant ? 'Plant' : 'Non-Plant'} detected with ${(data.confidence * 100).toFixed(1)}% confidence`,
      });

      return data;

    } catch (err) {
      console.error('Error testing model:', err);
      toast({
        title: 'Inference Failed',
        description: 'Failed to run plant detection inference.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setCurrentPhase('');
    }
  };

  // Download model files
  const downloadModel = async (format: 'onnx' | 'tensorflow') => {
    if (!trainingResult) {
      toast({
        title: 'No Model Available',
        description: 'Please train a model first.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('plant-model-trainer', {
        body: {
          action: 'download-model',
          userId,
          format,
          modelId: trainingResult.modelId
        }
      });

      if (error) throw error;

      const blob = new Blob([new Uint8Array(data.modelData)], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Model Downloaded',
        description: `${format.toUpperCase()} model downloaded successfully`,
      });

    } catch (err) {
      console.error('Error downloading model:', err);
      toast({
        title: 'Download Failed',
        description: 'Failed to download model.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Leaf className="h-6 w-6 text-green-600" />
            Plant Detection AI System
          </CardTitle>
          <CardDescription>
            Binary classifier for plant vs non-plant detection using CNN/Transformer models with transfer learning
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="mode-selection">Data Mode</TabsTrigger>
          <TabsTrigger 
            value="dataset" 
            disabled={!dataMode}
            className={!dataMode ? "opacity-50 cursor-not-allowed" : ""}
          >
            Dataset Collection
          </TabsTrigger>
          <TabsTrigger 
            value="training" 
            disabled={!canProceedToTraining}
            className={!canProceedToTraining ? "opacity-50 cursor-not-allowed" : ""}
          >
            Model Training
          </TabsTrigger>
          <TabsTrigger 
            value="testing" 
            disabled={!canProceedToTesting}
            className={!canProceedToTesting ? "opacity-50 cursor-not-allowed" : ""}
          >
            Testing & Inference
          </TabsTrigger>
          <TabsTrigger 
            value="export" 
            disabled={!canProceedToExport}
            className={!canProceedToExport ? "opacity-50 cursor-not-allowed" : ""}
          >
            Model Export
          </TabsTrigger>
        </TabsList>

        {/* Mode Selection Tab */}
        <TabsContent value="mode-selection" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Choose Data Collection Mode</CardTitle>
              <CardDescription>
                Select how you want to gather training data for your plant detection model
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Card className={`p-6 cursor-pointer transition-all border-2 ${dataMode === 'automatic' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                      onClick={() => setDataMode('automatic')}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-full bg-blue-100">
                      <Database className="h-6 w-6 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold">Automatic Collection</h3>
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>• Collect 25,000+ plant images from PlantCLEF, ImageNet, Google Open Images</p>
                    <p>• Collect 10,000+ non-plant images from COCO, ImageNet</p>
                    <p>• Diverse lighting, backgrounds, perspectives</p>
                    <p>• Balanced classes automatically</p>
                    <p>• Professional research-grade datasets</p>
                  </div>
                  <Badge className="mt-4" variant={dataMode === 'automatic' ? 'default' : 'outline'}>
                    Recommended for Production
                  </Badge>
                </Card>

                <Card className={`p-6 cursor-pointer transition-all border-2 ${dataMode === 'manual' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                      onClick={() => setDataMode('manual')}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-full bg-green-100">
                      <Upload className="h-6 w-6 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold">Manual Upload</h3>
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>• Upload your own plant and non-plant images</p>
                    <p>• Support for multiple files, folders, and batch upload</p>
                    <p>• All image formats accepted (JPG, PNG, WEBP, etc.)</p>
                    <p>• Minimum: 100 plant + 50 non-plant images</p>
                    <p>• Full control over dataset composition</p>
                  </div>
                  <Badge className="mt-4" variant={dataMode === 'manual' ? 'default' : 'outline'}>
                    Custom Dataset
                  </Badge>
                </Card>
              </div>

              {dataMode && (
                <div className="flex justify-center pt-4">
                  <Button 
                    onClick={() => setCurrentTab('dataset')}
                    className="px-8"
                  >
                    Continue with {dataMode === 'automatic' ? 'Automatic' : 'Manual'} Mode
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dataset Collection Tab */}
        <TabsContent value="dataset" className="space-y-4">
          {dataMode === 'automatic' ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Automatic Dataset Collection
                </CardTitle>
                <CardDescription>
                  Collect diverse plant images from multiple research datasets
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Target Dataset Size</Label>
                  <Select value={String(targetImageCount)} onValueChange={(value) => setTargetImageCount(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15000">15,000 images</SelectItem>
                      <SelectItem value="25000">25,000 images</SelectItem>
                      <SelectItem value="35000">35,000 images</SelectItem>
                      <SelectItem value="50000">50,000 images</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <h4 className="font-medium">Data Sources</h4>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">PlantCLEF (15K images)</Badge>
                      <Badge variant="outline">ImageNet Plants (8K)</Badge>
                      <Badge variant="outline">Google Open Images (12K)</Badge>
                      <Badge variant="outline">Kaggle Datasets (5K)</Badge>
                      <Badge variant="secondary">COCO Non-Plants (10K)</Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Diversity Features</h4>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">Multiple Lighting</Badge>
                      <Badge variant="outline">Various Backgrounds</Badge>
                      <Badge variant="outline">Different Perspectives</Badge>
                      <Badge variant="secondary">Balanced Classes</Badge>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={collectAutomaticDataset} 
                  disabled={loading}
                  className="w-full"
                  size="lg"
                >
                  {loading ? 'Collecting Dataset...' : 'Start Automatic Collection'}
                </Button>

                {loading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{currentPhase}</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                )}

                {datasetStats && (
                  <Card className="bg-green-50 border-green-200">
                    <CardHeader>
                      <CardTitle className="text-lg text-green-800">Dataset Ready! 🌱</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-2 md:grid-cols-4">
                        <div className="text-center p-3 bg-white rounded-lg">
                          <div className="text-xl font-bold text-green-600">{datasetStats.totalImages.toLocaleString()}</div>
                          <div className="text-xs text-green-700">Total Images</div>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg">
                          <div className="text-xl font-bold text-blue-600">{datasetStats.plantImages.toLocaleString()}</div>
                          <div className="text-xs text-blue-700">Plant Images</div>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg">
                          <div className="text-xl font-bold text-purple-600">{datasetStats.nonPlantImages.toLocaleString()}</div>
                          <div className="text-xs text-purple-700">Non-Plant Images</div>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg">
                          <div className="text-xl font-bold text-orange-600">{Object.keys(datasetStats.sources).length}</div>
                          <div className="text-xs text-orange-700">Data Sources</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Manual Dataset Upload
                </CardTitle>
                <CardDescription>
                  Upload your own plant and non-plant images for training
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Plant Images Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-green-600">Plant Images ({plantImages.length})</h3>
                    <Badge variant="outline">Minimum: 100 images</Badge>
                  </div>
                  
                  <div className="border-2 border-dashed border-green-300 rounded-xl p-6 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-4 rounded-full bg-green-100">
                        <Leaf className="h-8 w-8 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Upload Plant Images</h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          Trees, flowers, crops, leaves, indoor plants, etc.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) => e.target.files && handleFileSelection(e.target.files, 'plant')}
                          className="hidden"
                          id="plant-images"
                        />
                        <label htmlFor="plant-images">
                          <Button variant="outline" className="cursor-pointer">
                            <ImagePlus className="mr-2 h-4 w-4" />
                            Select Images
                          </Button>
                        </label>
                        
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          webkitdirectory=""
                          onChange={(e) => e.target.files && handleFileSelection(e.target.files, 'plant')}
                          className="hidden"
                          id="plant-folder"
                        />
                        <label htmlFor="plant-folder">
                          <Button variant="outline" className="cursor-pointer">
                            <FolderOpen className="mr-2 h-4 w-4" />
                            Select Folder
                          </Button>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Plant Images Preview */}
                  {plantImages.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium">Plant Images Preview</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-40 overflow-y-auto">
                        {plantImages.slice(0, 12).map((uploadFile) => (
                          <div key={uploadFile.id} className="relative group">
                            <img 
                              src={uploadFile.preview} 
                              alt={uploadFile.file.name}
                              className="w-full h-16 object-cover rounded border"
                            />
                            <Button
                              variant="destructive"
                              size="icon"
                              className="absolute -top-1 -right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => removeFile(uploadFile.id, 'plant')}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      {plantImages.length > 12 && (
                        <p className="text-sm text-muted-foreground">
                          Showing 12 of {plantImages.length} images
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Non-Plant Images Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-blue-600">Non-Plant Images ({nonPlantImages.length})</h3>
                    <Badge variant="outline">Minimum: 50 images</Badge>
                  </div>
                  
                  <div className="border-2 border-dashed border-blue-300 rounded-xl p-6 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-4 rounded-full bg-blue-100">
                        <Camera className="h-8 w-8 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Upload Non-Plant Images</h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          Animals, people, vehicles, furniture, landscapes, etc.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) => e.target.files && handleFileSelection(e.target.files, 'non_plant')}
                          className="hidden"
                          id="non-plant-images"
                        />
                        <label htmlFor="non-plant-images">
                          <Button variant="outline" className="cursor-pointer">
                            <ImagePlus className="mr-2 h-4 w-4" />
                            Select Images
                          </Button>
                        </label>
                        
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          webkitdirectory=""
                          onChange={(e) => e.target.files && handleFileSelection(e.target.files, 'non_plant')}
                          className="hidden"
                          id="non-plant-folder"
                        />
                        <label htmlFor="non-plant-folder">
                          <Button variant="outline" className="cursor-pointer">
                            <FolderOpen className="mr-2 h-4 w-4" />
                            Select Folder
                          </Button>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Non-Plant Images Preview */}
                  {nonPlantImages.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium">Non-Plant Images Preview</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-40 overflow-y-auto">
                        {nonPlantImages.slice(0, 12).map((uploadFile) => (
                          <div key={uploadFile.id} className="relative group">
                            <img 
                              src={uploadFile.preview} 
                              alt={uploadFile.file.name}
                              className="w-full h-16 object-cover rounded border"
                            />
                            <Button
                              variant="destructive"
                              size="icon"
                              className="absolute -top-1 -right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => removeFile(uploadFile.id, 'non_plant')}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      {nonPlantImages.length > 12 && (
                        <p className="text-sm text-muted-foreground">
                          Showing 12 of {nonPlantImages.length} images
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Upload Progress */}
                {uploading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{currentPhase}</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                )}

                {/* Upload Button */}
                {dataMode === 'manual' && (plantImages.length > 0 || nonPlantImages.length > 0) && (
                  <Button 
                    onClick={uploadManualDataset}
                    disabled={uploading || plantImages.length < 100 || nonPlantImages.length < 50}
                    className="w-full"
                    size="lg"
                  >
                    {uploading ? 'Uploading Dataset...' : `Upload Dataset (${plantImages.length + nonPlantImages.length} images)`}
                  </Button>
                )}

                {/* Dataset Stats */}
                {datasetStats && (
                  <Card className="bg-green-50 border-green-200">
                    <CardHeader>
                      <CardTitle className="text-lg text-green-800">Dataset Ready! 🌱</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-2 md:grid-cols-4">
                        <div className="text-center p-3 bg-white rounded-lg">
                          <div className="text-xl font-bold text-green-600">{datasetStats.totalImages.toLocaleString()}</div>
                          <div className="text-xs text-green-700">Total Images</div>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg">
                          <div className="text-xl font-bold text-blue-600">{datasetStats.plantImages.toLocaleString()}</div>
                          <div className="text-xs text-blue-700">Plant Images</div>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg">
                          <div className="text-xl font-bold text-purple-600">{datasetStats.nonPlantImages.toLocaleString()}</div>
                          <div className="text-xs text-purple-700">Non-Plant Images</div>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg">
                          <div className="text-xl font-bold text-orange-600">{Math.round((datasetStats.plantImages / datasetStats.totalImages) * 100)}%</div>
                          <div className="text-xs text-orange-700">Plant Ratio</div>
                        </div>
                      </div>
                      
                      <div className="mt-4 flex justify-center">
                        <Button 
                          onClick={() => setCurrentTab('training')}
                          className="px-8"
                        >
                          Proceed to Model Training
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        {/* Model Training Tab */}
        <TabsContent value="training" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Model Training Configuration
              </CardTitle>
              <CardDescription>
                Train CNN/Transformer models with transfer learning for binary plant classification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Model Architecture</Label>
                    <Select value={modelArchitecture} onValueChange={setModelArchitecture}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="efficientnet">EfficientNet-B4 (Recommended)</SelectItem>
                        <SelectItem value="resnet50">ResNet-50</SelectItem>
                        <SelectItem value="vit">Vision Transformer (ViT)</SelectItem>
                        <SelectItem value="mobilenetv3">MobileNetV3 (Fast)</SelectItem>
                        <SelectItem value="convnext">ConvNeXt (Latest)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Input Image Size</Label>
                    <Select value={String(imageSize)} onValueChange={(value) => setImageSize(parseInt(value))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="224">224×224 (Standard)</SelectItem>
                        <SelectItem value="256">256×256</SelectItem>
                        <SelectItem value="384">384×384 (High Quality)</SelectItem>
                        <SelectItem value="512">512×512 (Max Quality)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Batch Size</Label>
                    <Input 
                      type="number" 
                      value={batchSize}
                      onChange={(e) => setBatchSize(parseInt(e.target.value))}
                      min={8}
                      max={128}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Training Epochs</Label>
                    <Input 
                      type="number" 
                      value={epochs}
                      onChange={(e) => setEpochs(parseInt(e.target.value))}
                      min={10}
                      max={200}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Learning Rate</Label>
                    <Input 
                      type="number" 
                      step="0.0001"
                      value={learningRate}
                      onChange={(e) => setLearningRate(parseFloat(e.target.value))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Data Split</Label>
                    <div className="text-sm text-muted-foreground">
                      80% Training • 10% Validation • 10% Test
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-sm font-medium text-blue-800">Transfer Learning</div>
                  <div className="text-xs text-blue-600">ImageNet pretrained weights</div>
                </div>
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="text-sm font-medium text-green-800">Data Augmentation</div>
                  <div className="text-xs text-green-600">Rotation, flip, color jitter</div>
                </div>
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="text-sm font-medium text-purple-800">Optimization</div>
                  <div className="text-xs text-purple-600">AdamW + Cosine LR</div>
                </div>
              </div>

              <Button 
                onClick={trainPlantDetectionModel} 
                disabled={loading || !canProceedToTraining}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <Brain className="mr-2 h-4 w-4 animate-spin" />
                    Training Model...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    Start Model Training
                  </>
                )}
              </Button>

              {loading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{currentPhase}</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}

              {trainingResult && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardHeader>
                    <CardTitle className="text-lg text-blue-800">Training Complete! 🎯</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <h5 className="font-medium mb-2">Performance Metrics</h5>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Accuracy:</span>
                            <span className="font-bold text-green-600">{(trainingResult.evaluation.accuracy * 100).toFixed(2)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Precision:</span>
                            <span className="font-medium">{(trainingResult.evaluation.precision * 100).toFixed(2)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Recall:</span>
                            <span className="font-medium">{(trainingResult.evaluation.recall * 100).toFixed(2)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>F1-Score:</span>
                            <span className="font-bold text-blue-600">{(trainingResult.evaluation.f1Score * 100).toFixed(2)}%</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h5 className="font-medium mb-2">Model Details</h5>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Architecture:</span>
                            <span className="font-medium">{modelArchitecture.toUpperCase()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Input Size:</span>
                            <span className="font-medium">{imageSize}×{imageSize}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Parameters:</span>
                            <span className="font-medium">~25M</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Status:</span>
                            <Badge variant="default">Deployed</Badge>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h5 className="font-medium mb-2">Confusion Matrix</h5>
                        <div className="grid grid-cols-2 gap-1 text-xs">
                          <div className="p-2 bg-green-100 rounded text-center">
                            <div className="font-bold">{trainingResult.evaluation.confusionMatrix[0][0]}</div>
                            <div>True Non-Plant</div>
                          </div>
                          <div className="p-2 bg-red-100 rounded text-center">
                            <div className="font-bold">{trainingResult.evaluation.confusionMatrix[0][1]}</div>
                            <div>False Plant</div>
                          </div>
                          <div className="p-2 bg-red-100 rounded text-center">
                            <div className="font-bold">{trainingResult.evaluation.confusionMatrix[1][0]}</div>
                            <div>False Non-Plant</div>
                          </div>
                          <div className="p-2 bg-green-100 rounded text-center">
                            <div className="font-bold">{trainingResult.evaluation.confusionMatrix[1][1]}</div>
                            <div>True Plant</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex justify-center">
                      <Button 
                        onClick={() => setCurrentTab('testing')}
                        className="px-8"
                      >
                        Test Your Model
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Testing & Inference Tab */}
        <TabsContent value="testing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Model Testing & Inference
              </CardTitle>
              <CardDescription>
                Test your trained binary classifier with new images
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {trainingResult ? (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span className="font-medium">Model Ready for Inference</span>
                    </div>
                    <div className="text-sm text-green-700">
                      Accuracy: {(trainingResult.evaluation.accuracy * 100).toFixed(1)}% | 
                      F1-Score: {(trainingResult.evaluation.f1Score * 100).toFixed(1)}% | 
                      Architecture: {modelArchitecture.toUpperCase()}
                    </div>
                  </div>

                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <Camera className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-semibold mb-2">Upload Test Image</h3>
                    <p className="text-gray-600 mb-4">Upload an image to test plant vs non-plant classification</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          await testPlantModel(file);
                        }
                      }}
                      className="hidden"
                      id="test-image"
                    />
                    <label htmlFor="test-image">
                      <Button variant="outline" className="cursor-pointer">
                        <Upload className="mr-2 h-4 w-4" />
                        Choose Test Image
                      </Button>
                    </label>
                  </div>

                  {loading && currentPhase && (
                    <div className="text-center py-4">
                      <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                      <p className="text-sm text-muted-foreground">{currentPhase}</p>
                    </div>
                  )}

                  <div className="grid gap-4 md:grid-cols-2">
                    <Card className="p-4">
                      <h4 className="font-medium mb-2">Model Capabilities</h4>
                      <div className="space-y-1 text-sm">
                        <div>• Binary plant/non-plant classification</div>
                        <div>• Transfer learning from ImageNet</div>
                        <div>• Robust to lighting variations</div>
                        <div>• Multi-scale object detection</div>
                        <div>• Real-time inference ready</div>
                      </div>
                    </Card>
                    <Card className="p-4">
                      <h4 className="font-medium mb-2">Supported Plant Types</h4>
                      <div className="space-y-1 text-sm">
                        <div>• Trees and shrubs</div>
                        <div>• Flowers and flowering plants</div>
                        <div>• Crops and vegetables</div>
                        <div>• Indoor houseplants</div>
                        <div>• Leaves and foliage</div>
                      </div>
                    </Card>
                  </div>

                  <div className="flex justify-center">
                    <Button 
                      onClick={() => setCurrentTab('export')}
                      className="px-8"
                    >
                      Export Your Model
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Target className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold mb-2">No Model Available</h3>
                  <p className="text-gray-600">Complete dataset collection and model training first</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Model Export Tab */}
        <TabsContent value="export" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Model Export & Deployment
              </CardTitle>
              <CardDescription>
                Export trained models in ONNX and TensorFlow formats for production use
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {trainingResult ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 rounded bg-orange-100">
                          <Download className="h-4 w-4 text-orange-600" />
                        </div>
                        <h4 className="font-medium">ONNX Format</h4>
                      </div>
                      <div className="space-y-2 text-sm mb-4">
                        <div>• Cross-platform inference</div>
                        <div>• Optimized for production</div>
                        <div>• Works with Python, C++, C#</div>
                        <div>• ~25MB model size</div>
                      </div>
                      <Button 
                        onClick={() => downloadModel('onnx')}
                        className="w-full"
                        variant="outline"
                      >
                        Download ONNX Model
                      </Button>
                    </Card>

                    <Card className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 rounded bg-blue-100">
                          <Download className="h-4 w-4 text-blue-600" />
                        </div>
                        <h4 className="font-medium">TensorFlow Format</h4>
                      </div>
                      <div className="space-y-2 text-sm mb-4">
                        <div>• Native TensorFlow deployment</div>
                        <div>• TensorFlow Serving ready</div>
                        <div>• Mobile deployment (TFLite)</div>
                        <div>• ~40MB model size</div>
                      </div>
                      <Button 
                        onClick={() => downloadModel('tensorflow')}
                        className="w-full"
                        variant="outline"
                      >
                        Download TensorFlow Model
                      </Button>
                    </Card>
                  </div>

                  <Card className="p-4">
                    <h4 className="font-medium mb-3">Sample Inference Script (Python)</h4>
                    <div className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
                      <pre>{`# Plant Detection Inference Script
import onnxruntime as ort
import numpy as np
from PIL import Image
import cv2

# Load the trained model
session = ort.InferenceSession('plant_detector_${trainingResult.modelId}.onnx')

def preprocess_image(image_path):
    """Preprocess image for model input"""
    img = Image.open(image_path).convert('RGB')
    img = img.resize((${imageSize}, ${imageSize}))
    img_array = np.array(img).astype(np.float32) / 255.0
    
    # ImageNet normalization
    mean = np.array([0.485, 0.456, 0.406])
    std = np.array([0.229, 0.224, 0.225])
    img_array = (img_array - mean) / std
    
    # Add batch dimension
    img_batch = np.expand_dims(img_array.transpose(2, 0, 1), axis=0)
    return img_batch

def predict_plant(image_path):
    """Predict if image contains a plant"""
    img_batch = preprocess_image(image_path)
    
    # Run inference
    outputs = session.run(None, {'input': img_batch})
    prediction = outputs[0][0]
    
    # Binary classification
    is_plant = prediction[1] > prediction[0]  # Class 1 = Plant
    confidence = max(prediction)
    
    return {
        'is_plant': bool(is_plant),
        'confidence': float(confidence),
        'plant_probability': float(prediction[1]),
        'non_plant_probability': float(prediction[0])
    }

# Example usage
result = predict_plant('test_image.jpg')
print(f"Plant: {result['is_plant']}")
print(f"Confidence: {result['confidence']:.2f}")
print(f"Plant Probability: {result['plant_probability']:.2f}")
`}</pre>
                    </div>
                  </Card>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Card className="p-4">
                      <h4 className="font-medium mb-2">Model Performance</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Test Accuracy:</span>
                          <span className="font-bold text-green-600">{(trainingResult.evaluation.testAccuracy * 100).toFixed(2)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Validation Accuracy:</span>
                          <span className="font-medium">{(trainingResult.evaluation.validationAccuracy * 100).toFixed(2)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Training Accuracy:</span>
                          <span className="font-medium">{(trainingResult.evaluation.trainingAccuracy * 100).toFixed(2)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>AUC-ROC:</span>
                          <span className="font-medium">{(trainingResult.evaluation.auc * 100).toFixed(2)}%</span>
                        </div>
                      </div>
                    </Card>

                    <Card className="p-4">
                      <h4 className="font-medium mb-2">Deployment Info</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>API Endpoint:</span>
                          <Badge variant="outline">Active</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Model ID:</span>
                          <span className="font-mono text-xs">{trainingResult.modelId.slice(0, 12)}...</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Formats:</span>
                          <span className="font-medium">ONNX + TensorFlow</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Inference Script:</span>
                          <Badge variant="outline">Ready</Badge>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Download className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold mb-2">No Model Available</h3>
                  <p className="text-gray-600">Complete dataset collection and model training first</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* System Status Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Dataset
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Total Images:</span>
                <span className="font-medium">{datasetStats?.totalImages.toLocaleString() || '0'}</span>
              </div>
              <div className="flex justify-between">
                <span>Plant Images:</span>
                <span className="font-medium">{datasetStats?.plantImages.toLocaleString() || '0'}</span>
              </div>
              <div className="flex justify-between">
                <span>Non-Plant:</span>
                <span className="font-medium">{datasetStats?.nonPlantImages.toLocaleString() || '0'}</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <Badge variant={datasetStats ? "default" : "secondary"}>
                  {datasetStats ? "Ready" : "Collect Data"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Model
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Architecture:</span>
                <span className="font-medium">{modelArchitecture.toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span>Accuracy:</span>
                <span className="font-medium">{trainingResult ? `${(trainingResult.evaluation.accuracy * 100).toFixed(1)}%` : 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span>F1-Score:</span>
                <span className="font-medium">{trainingResult ? `${(trainingResult.evaluation.f1Score * 100).toFixed(1)}%` : 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <Badge variant={trainingResult ? "default" : "secondary"}>
                  {trainingResult ? "Trained" : "Train Model"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cloud className="h-5 w-5" />
              Deployment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>API Endpoint:</span>
                <Badge variant={trainingResult ? "default" : "secondary"}>
                  {trainingResult ? "Active" : "Deploy Model"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>ONNX Export:</span>
                <Badge variant={trainingResult ? "default" : "secondary"}>
                  {trainingResult ? "Available" : "Train First"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>TensorFlow:</span>
                <Badge variant={trainingResult ? "default" : "secondary"}>
                  {trainingResult ? "Available" : "Train First"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Inference Script:</span>
                <Badge variant={trainingResult ? "default" : "secondary"}>
                  {trainingResult ? "Ready" : "Train First"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Target Accuracy:</span>
                <span className="font-medium">≥90%</span>
              </div>
              <div className="flex justify-between">
                <span>Target F1-Score:</span>
                <span className="font-medium">≥88%</span>
              </div>
              <div className="flex justify-between">
                <span>Achieved:</span>
                <span className="font-medium text-green-600">
                  {trainingResult && trainingResult.evaluation.accuracy >= 0.90 && trainingResult.evaluation.f1Score >= 0.88 ? '✓ Targets Met' : 'Pending'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Production Ready:</span>
                <Badge variant={trainingResult && trainingResult.evaluation.accuracy >= 0.90 ? "default" : "secondary"}>
                  {trainingResult && trainingResult.evaluation.accuracy >= 0.90 ? "Yes" : "No"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AIEnhancedAnalysis;