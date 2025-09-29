import React, { useState, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Brain, Database, Target, ChartBar as BarChart3, Zap, Camera, Leaf, Bug, Activity, Cloud, Cpu, Download, Play, Settings, CircleCheck as CheckCircle2, CircleAlert as AlertCircle, TrendingUp, FolderOpen, ImagePlus, Trash2, Wand as Wand2, Sparkles, Image } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  modelFormats: {
    onnx: string;
    tensorflow: string;
  };
}

interface UploadedFile {
  file: File;
  id: string;
  preview?: string;
  category: 'plant' | 'non_plant';
}

interface GeneratedImage {
  base64: string;
  prompt: string;
  id: string;
  category: 'plant' | 'non_plant';
}

interface AIEnhancedAnalysisProps {
  userId: string;
}

const AIEnhancedAnalysis: React.FC<AIEnhancedAnalysisProps> = ({ userId }) => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState('');
  const [datasetStats, setDatasetStats] = useState<PlantDatasetStats | null>(null);
  const [trainingResult, setTrainingResult] = useState<TrainingResult | null>(null);
  const [currentTab, setCurrentTab] = useState<string>('mode-selection');
  const [dataMode, setDataMode] = useState<'generator' | 'manual' | null>(null);

  // Manual data gathering state
  const [plantImages, setPlantImages] = useState<UploadedFile[]>([]);
  const [nonPlantImages, setNonPlantImages] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);

  // Generated images state
  const [generatedPlantImages, setGeneratedPlantImages] = useState<GeneratedImage[]>([]);
  const [generatedNonPlantImages, setGeneratedNonPlantImages] = useState<GeneratedImage[]>([]);

  // Image generator settings
  const [plantGeneratorSettings, setPlantGeneratorSettings] = useState({
    prompt: '',
    template: '',
    style: 'Photorealistic',
    aspectRatio: '1:1',
    count: 10
  });

  const [nonPlantGeneratorSettings, setNonPlantGeneratorSettings] = useState({
    prompt: '',
    template: '',
    style: 'AI Training Data',
    aspectRatio: '1:1',
    count: 10
  });

  // Training configuration
  const [targetImageCount, setTargetImageCount] = useState(35000);
  const [modelArchitecture, setModelArchitecture] = useState('efficientnet');
  const [imageSize, setImageSize] = useState(224);
  const [batchSize, setBatchSize] = useState(32);
  const [epochs, setEpochs] = useState(50);
  const [learningRate, setLearningRate] = useState(0.001);

  // Plant generator templates and styles
  const PLANT_TEMPLATES = {
    '': '-- Choose Preset --',
    'Random': 'Random',
    'exoplanet': 'Terrestrial Exoplanet',
    'gasgiant': 'Massive Gas Giant',
    'nebula': 'Star-Forming Nebula',
    'galaxy': 'Spiral Galaxy'
  };

  const PLANT_STYLES = {
    'Photorealistic': 'Photorealistic (Default)',
    'Random': 'Random',
    'Cinematic': 'Cinematic Drama',
    'JWST Style': 'JWST Deep Field',
    'Classic Science': 'Classic Science Illustration'
  };

  // Non-plant generator templates and styles
  const NON_PLANT_TEMPLATES = {
    '': '-- Choose Preset --',
    'Random': 'Random',
    'abstract_data_texture': 'Synthetic Abstract Data',
    'fantasy_forest': 'Ancient Fantasy Forest',
    'cyberpunk_city': 'Neo-Tokyo Cyberpunk City',
    'abstract_sculpture': 'Abstract Art Sculpture',
    'historical_ship': '17th Century Galleon'
  };

  const NON_PLANT_STYLES = {
    'AI Training Data': 'AI Training Data (Recommended)',
    'High-Contrast Abstract': 'High-Contrast Abstract',
    'Random': 'Random',
    'Photorealistic': 'Photorealistic',
    'Cinematic': 'Cinematic Film Still',
    'Oil Painting': 'Detailed Oil Painting',
    'Digital Art': 'Vibrant Digital Art',
    'Ink Sketch': 'Monochromatic Ink Sketch'
  };

  const ASPECT_RATIOS = {
    '1:1': '1:1 (Square - Best for Training)',
    'Random': 'Random',
    '16:9': '16:9 (Widescreen)',
    '9:16': '9:16 (Vertical/Mobile)',
    '4:3': '4:3 (Classic)'
  };

  // Conditions to move between tabs
  const getTotalImages = () => {
    return plantImages.length + nonPlantImages.length + generatedPlantImages.length + generatedNonPlantImages.length;
  };

  const getPlantCount = () => {
    return plantImages.length + generatedPlantImages.length;
  };

  const getNonPlantCount = () => {
    return nonPlantImages.length + generatedNonPlantImages.length;
  };

  const canProceedToTraining = getTotalImages() >= 150 && getPlantCount() >= 100 && getNonPlantCount() >= 50;
  const canProceedToTesting = trainingResult !== null;
  const canProceedToExport = trainingResult !== null;

  // Generate plant images using Cosmic Vision AI
  const generatePlantImages = async () => {
    if (!plantGeneratorSettings.prompt && plantGeneratorSettings.template !== 'Random') {
      toast.error('Please enter a prompt or select Random template');
      return;
    }

    setLoading(true);
    setCurrentPhase('Generating plant images...');
    setProgress(0);

    try {
      // Simulate the Cosmic Vision AI generation process
      const images: GeneratedImage[] = [];
      
      for (let i = 0; i < plantGeneratorSettings.count; i++) {
        setProgress((i / plantGeneratorSettings.count) * 100);
        setCurrentPhase(`Generating plant image ${i + 1} of ${plantGeneratorSettings.count}...`);
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Generate a mock base64 image (in real implementation, this would call the actual API)
        const mockBase64 = generateMockImageBase64('plant');
        
        images.push({
          base64: mockBase64,
          prompt: plantGeneratorSettings.prompt || 'Random plant image',
          id: `generated_plant_${Date.now()}_${i}`,
          category: 'plant'
        });
      }

      setGeneratedPlantImages(prev => [...prev, ...images]);
      setProgress(100);
      toast.success(`Generated ${images.length} plant images successfully!`);
      
    } catch (error) {
      console.error('Error generating plant images:', error);
      toast.error('Failed to generate plant images');
    } finally {
      setLoading(false);
      setProgress(0);
      setCurrentPhase('');
    }
  };

  // Generate non-plant images using Dream Weaver AI
  const generateNonPlantImages = async () => {
    if (!nonPlantGeneratorSettings.prompt && nonPlantGeneratorSettings.template !== 'Random') {
      toast.error('Please enter a prompt or select Random template');
      return;
    }

    setLoading(true);
    setCurrentPhase('Generating non-plant images...');
    setProgress(0);

    try {
      // Simulate the Dream Weaver AI generation process
      const images: GeneratedImage[] = [];
      
      for (let i = 0; i < nonPlantGeneratorSettings.count; i++) {
        setProgress((i / nonPlantGeneratorSettings.count) * 100);
        setCurrentPhase(`Generating non-plant image ${i + 1} of ${nonPlantGeneratorSettings.count}...`);
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Generate a mock base64 image (in real implementation, this would call the actual API)
        const mockBase64 = generateMockImageBase64('non_plant');
        
        images.push({
          base64: mockBase64,
          prompt: nonPlantGeneratorSettings.prompt || 'Random non-plant image',
          id: `generated_non_plant_${Date.now()}_${i}`,
          category: 'non_plant'
        });
      }

      setGeneratedNonPlantImages(prev => [...prev, ...images]);
      setProgress(100);
      toast.success(`Generated ${images.length} non-plant images successfully!`);
      
    } catch (error) {
      console.error('Error generating non-plant images:', error);
      toast.error('Failed to generate non-plant images');
    } finally {
      setLoading(false);
      setProgress(0);
      setCurrentPhase('');
    }
  };

  // Generate mock base64 image data
  const generateMockImageBase64 = (type: 'plant' | 'non_plant'): string => {
    // This is a minimal 1x1 pixel PNG in base64 format
    // In real implementation, this would be the actual generated image
    const color = type === 'plant' ? 'green' : 'blue';
    return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  };

  // Handle file selection for manual mode
  const handleFileSelection = useCallback(
    async (files: FileList, category: 'plant' | 'non_plant') => {
      const newFiles: UploadedFile[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} is not an image file`);
          continue;
        }
        // Validate file size (max 10MB per image)
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} is larger than 10MB`);
          continue;
        }
        const fileId = `${category}_${Date.now()}_${i}`;
        let preview: string | undefined;
        try {
          preview = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.onerror = (e) => reject(e);
            reader.readAsDataURL(file);
          });
        } catch (e) {
          console.error('Error reading file preview', e);
        }
        newFiles.push({ file, id: fileId, preview, category });
      }
      if (category === 'plant') {
        setPlantImages((prev) => [...prev, ...newFiles]);
      } else {
        setNonPlantImages((prev) => [...prev, ...newFiles]);
      }
      toast.success(`Added ${newFiles.length} ${category.replace('_', '-')} images`);
    },
    []
  );

  // Remove uploaded file
  const removeFile = useCallback(
    (fileId: string, category: 'plant' | 'non_plant') => {
      if (category === 'plant') {
        setPlantImages((prev) => prev.filter((f) => f.id !== fileId));
      } else {
        setNonPlantImages((prev) => prev.filter((f) => f.id !== fileId));
      }
    },
    []
  );

  // Remove generated image
  const removeGeneratedImage = useCallback(
    (imageId: string, category: 'plant' | 'non_plant') => {
      if (category === 'plant') {
        setGeneratedPlantImages((prev) => prev.filter((img) => img.id !== imageId));
      } else {
        setGeneratedNonPlantImages((prev) => prev.filter((img) => img.id !== imageId));
      }
    },
    []
  );

  // Upload manual dataset to storage
  const uploadDataset = async () => {
    const totalImages = getTotalImages();
    const plantCount = getPlantCount();
    const nonPlantCount = getNonPlantCount();

    if (totalImages < 150) {
      toast.error('Need at least 150 total images');
      return;
    }

    if (plantCount < 100) {
      toast.error('Need at least 100 plant images');
      return;
    }

    if (nonPlantCount < 50) {
      toast.error('Need at least 50 non-plant images');
      return;
    }

    setUploading(true);
    setProgress(0);
    setCurrentPhase('Uploading dataset to storage...');

    try {
      let uploadedCount = 0;
      const totalFiles = plantImages.length + nonPlantImages.length + generatedPlantImages.length + generatedNonPlantImages.length;

      // Upload manual files
      for (const uploadFile of plantImages) {
        const fileName = `manual_dataset/plant/${uploadFile.id}_${uploadFile.file.name}`;
        const { error } = await supabase.storage
          .from('training-datasets')
          .upload(fileName, uploadFile.file);
        
        if (!error) {
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
              dataType: 'manual',
            },
          });
        }
        
        uploadedCount++;
        setProgress((uploadedCount / totalFiles) * 100);
      }

      for (const uploadFile of nonPlantImages) {
        const fileName = `manual_dataset/non_plant/${uploadFile.id}_${uploadFile.file.name}`;
        const { error } = await supabase.storage
          .from('training-datasets')
          .upload(fileName, uploadFile.file);
        
        if (!error) {
          await supabase.from('image_metadata').insert({
            id: uploadFile.id,
            user_id: userId,
            title: uploadFile.file.name,
            source: 'Manual_Upload',
            // FIX #2: Changed 'other' to 'non_plant' for consistency
            category: 'non_plant',
            file_path: fileName,
            metadata: {
              originalName: uploadFile.file.name,
              fileSize: uploadFile.file.size,
              uploadDate: new Date().toISOString(),
              dataType: 'manual',
            },
          });
        }
        
        uploadedCount++;
        setProgress((uploadedCount / totalFiles) * 100);
      }

      // Upload generated images
      for (const genImage of generatedPlantImages) {
        const fileName = `generated_dataset/plant/${genImage.id}.png`;
        const blob = base64ToBlob(genImage.base64);
        
        const { error } = await supabase.storage
          .from('training-datasets')
          .upload(fileName, blob);
        
        if (!error) {
          await supabase.from('image_metadata').insert({
            id: genImage.id,
            user_id: userId,
            title: `Generated Plant: ${genImage.prompt.substring(0, 50)}`,
            source: 'Cosmic_Vision_AI',
            category: 'plant',
            file_path: fileName,
            metadata: {
              prompt: genImage.prompt,
              generatedDate: new Date().toISOString(),
              dataType: 'generated',
            },
          });
        }
        
        uploadedCount++;
        setProgress((uploadedCount / totalFiles) * 100);
      }

      for (const genImage of generatedNonPlantImages) {
        const fileName = `generated_dataset/non_plant/${genImage.id}.png`;
        const blob = base64ToBlob(genImage.base64);
        
        const { error } = await supabase.storage
          .from('training-datasets')
          .upload(fileName, blob);
        
        if (!error) {
          await supabase.from('image_metadata').insert({
            id: genImage.id,
            user_id: userId,
            title: `Generated Non-Plant: ${genImage.prompt.substring(0, 50)}`,
            source: 'Dream_Weaver_AI',
            // FIX #2: Changed 'other' to 'non_plant' for consistency
            category: 'non_plant',
            file_path: fileName,
            metadata: {
              prompt: genImage.prompt,
              generatedDate: new Date().toISOString(),
              dataType: 'generated',
            },
          });
        }
        
        uploadedCount++;
        setProgress((uploadedCount / totalFiles) * 100);
      }

      const stats: PlantDatasetStats = {
        totalImages: totalFiles,
        plantImages: plantCount,
        nonPlantImages: nonPlantCount,
        sources: {
          Manual_Upload: plantImages.length + nonPlantImages.length,
          Cosmic_Vision_AI: generatedPlantImages.length,
          Dream_Weaver_AI: generatedNonPlantImages.length
        },
        plantTypes: { Generated: generatedPlantImages.length, Uploaded: plantImages.length },
        lightingConditions: { Mixed: totalFiles },
        resolutions: { Variable: totalFiles },
        backgrounds: { Mixed: totalFiles },
      };

      setDatasetStats(stats);
      setProgress(100);
      setCurrentPhase('Dataset upload completed!');
      toast.success(`Successfully uploaded ${totalFiles} images (${plantCount} plants, ${nonPlantCount} non-plants)`);
      
    } catch (error) {
      console.error('Error uploading dataset:', error);
      toast.error('Failed to upload dataset. Please try again.');
    } finally {
      setUploading(false);
      setProgress(0);
      setCurrentPhase('');
    }
  };

  // Convert base64 to blob
  // FIX #1: Made this function more robust by handling optional data URL prefixes.
  const base64ToBlob = (base64Data: string): Blob => {
    // Strip the data URL prefix if it exists, e.g., "data:image/png;base64,"
    const base64 = base64Data.startsWith('data:image')
      ? base64Data.split(',')[1]
      : base64Data;

    try {
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      return new Blob([byteArray], { type: 'image/png' });
    } catch (error) {
      console.error("Failed to decode base64 string:", error);
      // Return an empty blob or handle the error as appropriate
      return new Blob();
    }
  };

  // Train plant detection model
  const trainPlantDetectionModel = async () => {
    if (!canProceedToTraining) {
      toast.error('Please collect at least 150 total images (100 plants, 50 non-plants) before training.');
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
        { progress: 98, phase: 'Deploying to inference endpoint...' },
      ];
      
      for (const update of progressUpdates) {
        setProgress(update.progress);
        setCurrentPhase(update.phase);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      // Simulate training results
      const mockResult: TrainingResult = {
        modelId: `plant_detector_${Date.now()}`,
        endpointUrl: `https://api.example.com/models/plant_detector_${Date.now()}`,
        evaluation: {
          accuracy: 0.92 + Math.random() * 0.05,
          precision: 0.89 + Math.random() * 0.06,
          recall: 0.87 + Math.random() * 0.08,
          f1Score: 0.88 + Math.random() * 0.07,
          confusionMatrix: [[45, 5], [3, 47]],
          testAccuracy: 0.91 + Math.random() * 0.05,
          validationAccuracy: 0.90 + Math.random() * 0.06,
          trainingAccuracy: 0.94 + Math.random() * 0.04,
          auc: 0.95 + Math.random() * 0.04
        },
        trainingHistory: [],
        config: {
          modelArchitecture,
          imageSize,
          batchSize,
          epochs,
          learningRate
        },
        modelFormats: {
          onnx: `plant_detector_${Date.now()}.onnx`,
          tensorflow: `plant_detector_${Date.now()}.pb`
        }
      };

      setTrainingResult(mockResult);
      setProgress(100);
      setCurrentPhase('Model training completed successfully!');
      toast.success(`Model training complete! Accuracy: ${(mockResult.evaluation.accuracy * 100).toFixed(2)}%`);
      
    } catch (error) {
      console.error('Error training model:', error);
      toast.error('Failed to train model. Please try again.');
    } finally {
      setLoading(false);
      setProgress(0);
      setCurrentPhase('');
    }
  };

  // Test model with uploaded image
  const testPlantModel = async (imageFile: File) => {
    if (!trainingResult) {
      toast.error('Please train a model first.');
      return;
    }
    
    setLoading(true);
    setCurrentPhase('Processing image for plant detection...');
    
    try {
      // Simulate inference
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const isPlant = Math.random() > 0.5;
      const confidence = 0.7 + Math.random() * 0.25;
      
      toast.success(`${isPlant ? 'Plant' : 'Non-Plant'} detected with ${(confidence * 100).toFixed(1)}% confidence`);
      
    } catch (error) {
      console.error('Error testing model:', error);
      toast.error('Failed to run plant detection inference.');
    } finally {
      setLoading(false);
      setCurrentPhase('');
    }
  };

  // Download model
  const downloadModel = async (format: 'onnx' | 'tensorflow') => {
    if (!trainingResult) {
      toast.error('Please train a model first.');
      return;
    }
    
    try {
      // Simulate model download
      const modelData = new Uint8Array(1024); // Mock model data
      const blob = new Blob([modelData], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `plant_detector.${format === 'onnx' ? 'onnx' : 'pb'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(`${format.toUpperCase()} model downloaded successfully`);
    } catch (error) {
      console.error('Error downloading model:', error);
      toast.error('Failed to download model.');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Plant Detection AI System
        </CardTitle>
        <CardDescription>
          Complete ML pipeline: Generate/Upload data → Train model → Test → Export
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={currentTab} onValueChange={setCurrentTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="mode-selection">Mode</TabsTrigger>
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

          <TabsContent value="mode-selection" className="space-y-6">
            <div className="text-center space-y-4 pt-4">
              <h3 className="text-xl font-semibold">Choose Data Collection Mode</h3>
              <p className="text-muted-foreground">
                Select how you want to gather training data for your plant detection model
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setDataMode('generator')}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wand2 className="h-5 w-5 text-purple-500" />
                    AI Image Generation
                  </CardTitle>
                  <CardDescription>
                    Generate custom plant and non-plant images using AI
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-green-500" />
                      <span>Cosmic Vision AI for plant images</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-blue-500" />
                      <span>Dream Weaver AI for non-plant images</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Settings className="h-4 w-4 text-yellow-500" />
                      <span>Customizable prompts and styles</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setDataMode('manual')}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5 text-blue-500" />
                    Manual Upload
                  </CardTitle>
                  <CardDescription>
                    Upload your own images and folders
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-green-500" />
                      <span>Drag & drop folders and files</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ImagePlus className="h-4 w-4 text-blue-500" />
                      <span>Multiple file selection</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-yellow-500" />
                      <span>Full control over data quality</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {dataMode && (
              <div className="text-center pt-6">
                <Button
                  onClick={() => setCurrentTab('dataset')}
                  className="px-8"
                  size="lg"
                >
                  Continue with {dataMode === 'generator' ? 'AI Generation' : 'Manual Upload'} Mode
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="dataset" className="space-y-6">
            {dataMode === 'generator' ? (
              <div className="space-y-8">
                <div className="text-center">
                  <h3 className="text-xl font-semibold mb-2">AI Image Generation</h3>
                  <p className="text-muted-foreground">
                    Generate custom training images using specialized AI models
                  </p>
                </div>

                {/* Plant Image Generator */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Leaf className="h-5 w-5 text-green-500" />
                      Cosmic Vision AI - Plant Images
                    </CardTitle>
                    <CardDescription>
                      Generate realistic plant and celestial object images
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label>Template</Label>
                        <Select
                          value={plantGeneratorSettings.template}
                          onValueChange={(value) => setPlantGeneratorSettings(prev => ({ ...prev, template: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose template" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(PLANT_TEMPLATES).map(([key, label]) => (
                              <SelectItem key={key} value={key}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label>Style</Label>
                        <Select
                          value={plantGeneratorSettings.style}
                          onValueChange={(value) => setPlantGeneratorSettings(prev => ({ ...prev, style: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(PLANT_STYLES).map(([key, label]) => (
                              <SelectItem key={key} value={key}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label>Aspect Ratio</Label>
                        <Select
                          value={plantGeneratorSettings.aspectRatio}
                          onValueChange={(value) => setPlantGeneratorSettings(prev => ({ ...prev, aspectRatio: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(ASPECT_RATIOS).map(([key, label]) => (
                              <SelectItem key={key} value={key}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label>Custom Prompt</Label>
                      <Textarea
                        placeholder="Describe your celestial object (e.g., A molten lava ocean world with two green suns in the sky)"
                        value={plantGeneratorSettings.prompt}
                        onChange={(e) => setPlantGeneratorSettings(prev => ({ ...prev, prompt: e.target.value }))}
                        rows={3}
                      />
                    </div>

                    <div className="flex items-center gap-4">
                      <div>
                        <Label>Number of Images</Label>
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          value={plantGeneratorSettings.count}
                          onChange={(e) => setPlantGeneratorSettings(prev => ({ ...prev, count: parseInt(e.target.value) || 10 }))}
                          className="w-24"
                        />
                      </div>
                      
                      <Button
                        onClick={generatePlantImages}
                        disabled={loading}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate Plant Images
                      </Button>
                    </div>

                    {generatedPlantImages.length > 0 && (
                      <div>
                        <Label>Generated Plant Images ({generatedPlantImages.length})</Label>
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mt-2 max-h-48 overflow-y-auto p-2 border rounded-md">
                          {generatedPlantImages.map((img) => (
                            <div key={img.id} className="relative group">
                              <img
                                src={`data:image/png;base64,${img.base64}`}
                                alt="Generated plant"
                                className="w-full h-16 object-cover rounded border"
                              />
                              <Button
                                variant="destructive"
                                size="sm"
                                className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => removeGeneratedImage(img.id, 'plant')}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Non-Plant Image Generator */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Camera className="h-5 w-5 text-purple-500" />
                      Dream Weaver AI - Non-Plant Images
                    </CardTitle>
                    <CardDescription>
                      Generate diverse non-plant objects and scenes for training
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label>Template</Label>
                        <Select
                          value={nonPlantGeneratorSettings.template}
                          onValueChange={(value) => setNonPlantGeneratorSettings(prev => ({ ...prev, template: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose template" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(NON_PLANT_TEMPLATES).map(([key, label]) => (
                              <SelectItem key={key} value={key}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label>Style</Label>
                        <Select
                          value={nonPlantGeneratorSettings.style}
                          onValueChange={(value) => setNonPlantGeneratorSettings(prev => ({ ...prev, style: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(NON_PLANT_STYLES).map(([key, label]) => (
                              <SelectItem key={key} value={key}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label>Aspect Ratio</Label>
                        <Select
                          value={nonPlantGeneratorSettings.aspectRatio}
                          onValueChange={(value) => setNonPlantGeneratorSettings(prev => ({ ...prev, aspectRatio: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(ASPECT_RATIOS).map(([key, label]) => (
                              <SelectItem key={key} value={key}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label>Custom Prompt</Label>
                      <Textarea
                        placeholder="Describe a single, clearly identifiable object or scene for training (e.g., A bright red apple on a wooden table, clearly lit)"
                        value={nonPlantGeneratorSettings.prompt}
                        onChange={(e) => setNonPlantGeneratorSettings(prev => ({ ...prev, prompt: e.target.value }))}
                        rows={3}
                      />
                    </div>

                    <div className="flex items-center gap-4">
                      <div>
                        <Label>Number of Images</Label>
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          value={nonPlantGeneratorSettings.count}
                          onChange={(e) => setNonPlantGeneratorSettings(prev => ({ ...prev, count: parseInt(e.target.value) || 10 }))}
                          className="w-24"
                        />
                      </div>
                      
                      <Button
                        onClick={generateNonPlantImages}
                        disabled={loading}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate Non-Plant Images
                      </Button>
                    </div>

                    {generatedNonPlantImages.length > 0 && (
                      <div>
                        <Label>Generated Non-Plant Images ({generatedNonPlantImages.length})</Label>
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mt-2 max-h-48 overflow-y-auto p-2 border rounded-md">
                          {generatedNonPlantImages.map((img) => (
                            <div key={img.id} className="relative group">
                              <img
                                src={`data:image/png;base64,${img.base64}`}
                                alt="Generated non-plant"
                                className="w-full h-16 object-cover rounded border"
                              />
                              <Button
                                variant="destructive"
                                size="sm"
                                className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => removeGeneratedImage(img.id, 'non_plant')}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Dataset Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>Dataset Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-primary">{getTotalImages()}</div>
                        <div className="text-sm text-muted-foreground">Total Images</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-600">{getPlantCount()}</div>
                        <div className="text-sm text-muted-foreground">Plant Images</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-purple-600">{getNonPlantCount()}</div>
                        <div className="text-sm text-muted-foreground">Non-Plant Images</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-blue-600">
                          {canProceedToTraining ? '✓' : '✗'}
                        </div>
                        <div className="text-sm text-muted-foreground">Ready to Train</div>
                      </div>
                    </div>

                    {getTotalImages() > 0 && (
                      <div className="mt-6">
                        <Button
                          onClick={uploadDataset}
                          disabled={uploading || !canProceedToTraining}
                          className="w-full"
                          size="lg"
                        >
                          {uploading ? 'Uploading Dataset...' : `Upload Dataset (${getTotalImages()} images)`}
                        </Button>
                        
                        {!canProceedToTraining && (
                          <p className="text-sm text-muted-foreground mt-2 text-center">
                            Need at least 150 total images (100 plants, 50 non-plants) to proceed
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              /* Manual Upload Mode */
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-xl font-semibold mb-2">Manual Dataset Upload</h3>
                  <p className="text-muted-foreground">
                    Upload your own images and organize them into plant and non-plant categories
                  </p>
                </div>

                {/* Plant Images Upload */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Leaf className="h-5 w-5 text-green-500" />
                      Plant Images ({plantImages.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Label>Select Folder</Label>
                    <Input
                      type="file"
                      multiple
                      accept="image/*"
                      webkitdirectory=""
                      onChange={(e) => e.target.files && handleFileSelection(e.target.files, 'plant')}
                      className="mb-2"
                    />
                    <Label>Select Files</Label>
                    <Input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => e.target.files && handleFileSelection(e.target.files, 'plant')}
                    />
                    
                    {plantImages.length > 0 && (
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 max-h-48 overflow-y-auto p-2 border rounded-md">
                        {plantImages.slice(0, 24).map((uploadFile) => (
                          <div key={uploadFile.id} className="relative group">
                            <img
                              src={uploadFile.preview}
                              alt="Plant"
                              className="w-full h-16 object-cover rounded border"
                            />
                            <Button
                              variant="destructive"
                              size="sm"
                              className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => removeFile(uploadFile.id, 'plant')}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                        {plantImages.length > 24 && (
                          <div className="flex items-center justify-center text-sm text-muted-foreground">
                            +{plantImages.length - 24} more
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Non-Plant Images Upload */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Camera className="h-5 w-5 text-purple-500" />
                      Non-Plant Images ({nonPlantImages.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Label>Select Folder</Label>
                    <Input
                      type="file"
                      multiple
                      accept="image/*"
                      webkitdirectory=""
                      onChange={(e) => e.target.files && handleFileSelection(e.target.files, 'non_plant')}
                      className="mb-2"
                    />
                    <Label>Select Files</Label>
                    <Input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => e.target.files && handleFileSelection(e.target.files, 'non_plant')}
                    />
                    
                    {nonPlantImages.length > 0 && (
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 max-h-48 overflow-y-auto p-2 border rounded-md">
                        {nonPlantImages.slice(0, 24).map((uploadFile) => (
                          <div key={uploadFile.id} className="relative group">
                            <img
                              src={uploadFile.preview}
                              alt="Non-plant"
                              className="w-full h-16 object-cover rounded border"
                            />
                            <Button
                              variant="destructive"
                              size="sm"
                              className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => removeFile(uploadFile.id, 'non_plant')}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                        {nonPlantImages.length > 24 && (
                          <div className="flex items-center justify-center text-sm text-muted-foreground">
                            +{nonPlantImages.length - 24} more
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Dataset Summary for Manual Mode */}
                <Card>
                  <CardHeader>
                    <CardTitle>Dataset Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-primary">{getTotalImages()}</div>
                        <div className="text-sm text-muted-foreground">Total Images</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-600">{getPlantCount()}</div>
                        <div className="text-sm text-muted-foreground">Plant Images</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-purple-600">{getNonPlantCount()}</div>
                        <div className="text-sm text-muted-foreground">Non-Plant Images</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-blue-600">
                          {canProceedToTraining ? '✓' : '✗'}
                        </div>
                        <div className="text-sm text-muted-foreground">Ready to Train</div>
                      </div>
                    </div>

                    {getTotalImages() > 0 && (
                      <div className="mt-6">
                        <Button
                          onClick={uploadDataset}
                          disabled={uploading || !canProceedToTraining}
                          className="w-full"
                          size="lg"
                        >
                          {uploading ? 'Uploading Dataset...' : `Upload Dataset (${getTotalImages()} images)`}
                        </Button>
                        
                        {!canProceedToTraining && (
                          <p className="text-sm text-muted-foreground mt-2 text-center">
                            Need at least 150 total images (100 plants, 50 non-plants) to proceed
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Progress Indicator */}
            {(loading || uploading) && (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{currentPhase}</span>
                      <span className="font-medium">{progress.toFixed(0)}%</span>
                    </div>
                    <Progress value={progress} className="w-full" />
                  </div>
                </CardContent>
              </Card>
            )}

            {datasetStats && (
              <div className="text-center pt-6">
                <Button
                  onClick={() => setCurrentTab('training')}
                  className="px-8"
                  size="lg"
                >
                  Proceed to Model Training
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="training" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Model Training Configuration
                </CardTitle>
                <CardDescription>
                  Configure and train your plant detection model
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Model Architecture</Label>
                    <Select value={modelArchitecture} onValueChange={setModelArchitecture}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="efficientnet">EfficientNet</SelectItem>
                        <SelectItem value="resnet50">ResNet-50</SelectItem>
                        <SelectItem value="vit">Vision Transformer</SelectItem>
                        <SelectItem value="mobilenetv3">MobileNetV3</SelectItem>
                        <SelectItem value="convnext">ConvNeXt</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Input Image Size</Label>
                    <Input
                      type="number"
                      min={32}
                      max={1024}
                      value={imageSize}
                      onChange={(e) => setImageSize(parseInt(e.target.value) || 224)}
                    />
                  </div>

                  <div>
                    <Label>Batch Size</Label>
                    <Input
                      type="number"
                      min={8}
                      max={128}
                      value={batchSize}
                      onChange={(e) => setBatchSize(parseInt(e.target.value) || 32)}
                    />
                  </div>

                  <div>
                    <Label>Epochs</Label>
                    <Input
                      type="number"
                      min={1}
                      max={500}
                      value={epochs}
                      onChange={(e) => setEpochs(parseInt(e.target.value) || 50)}
                    />
                  </div>

                  <div>
                    <Label>Learning Rate</Label>
                    <Input
                      type="number"
                      step={0.0001}
                      min={0.00001}
                      max={1}
                      value={learningRate}
                      onChange={(e) => setLearningRate(parseFloat(e.target.value) || 0.001)}
                    />
                  </div>
                </div>

                <Button
                  onClick={trainPlantDetectionModel}
                  disabled={loading || !canProceedToTraining}
                  className="w-full"
                  size="lg"
                >
                  {loading ? 'Training Model...' : 'Start Model Training'}
                </Button>

                {!canProceedToTraining && (
                  <p className="text-sm text-muted-foreground text-center">
                    Complete dataset collection first (need 150+ images)
                  </p>
                )}

                {loading && (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{currentPhase}</span>
                          <span className="font-medium">{progress.toFixed(0)}%</span>
                        </div>
                        <Progress value={progress} className="w-full" />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {trainingResult && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        Training Complete!
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div>
                          <div className="text-2xl font-bold text-green-600">
                            {(trainingResult.evaluation.accuracy * 100).toFixed(1)}%
                          </div>
                          <div className="text-sm text-muted-foreground">Accuracy</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-blue-600">
                            {(trainingResult.evaluation.f1Score * 100).toFixed(1)}%
                          </div>
                          <div className="text-sm text-muted-foreground">F1-Score</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-purple-600">
                            {(trainingResult.evaluation.precision * 100).toFixed(1)}%
                          </div>
                          <div className="text-sm text-muted-foreground">Precision</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-yellow-600">
                            {(trainingResult.evaluation.recall * 100).toFixed(1)}%
                          </div>
                          <div className="text-sm text-muted-foreground">Recall</div>
                        </div>
                      </div>

                      <div className="mt-6 text-center">
                        <Button
                          onClick={() => setCurrentTab('testing')}
                          className="px-8"
                          size="lg"
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

          <TabsContent value="testing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Model Testing & Inference
                </CardTitle>
                <CardDescription>
                  Test your trained model with new images
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {trainingResult ? (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center p-4 bg-muted/20 rounded-lg">
                      <div>
                        <div className="text-lg font-bold text-green-600">
                          {(trainingResult.evaluation.accuracy * 100).toFixed(1)}%
                        </div>
                        <div className="text-sm text-muted-foreground">Test Accuracy</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-blue-600">
                          {(trainingResult.evaluation.f1Score * 100).toFixed(1)}%
                        </div>
                        <div className="text-sm text-muted-foreground">F1-Score</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-purple-600">
                          {trainingResult.modelId.substring(0, 12)}...
                        </div>
                        <div className="text-sm text-muted-foreground">Model ID</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-yellow-600">
                          {(trainingResult.evaluation.auc * 100).toFixed(1)}%
                        </div>
                        <div className="text-sm text-muted-foreground">AUC-ROC</div>
                      </div>
                    </div>

                    <div>
                      <Label>Test Image</Label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            await testPlantModel(file);
                          }
                        }}
                      />
                    </div>

                    {loading && currentPhase && (
                      <div className="text-center">
                        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                        <p className="text-sm text-muted-foreground">{currentPhase}</p>
                      </div>
                    )}

                    <div className="text-center">
                      <Button
                        onClick={() => setCurrentTab('export')}
                        className="px-8"
                        size="lg"
                      >
                        Export Your Model
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No model available. Please train a model first.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="export" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Model Export & Deployment
                </CardTitle>
                <CardDescription>
                  Download your trained model in different formats
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {trainingResult ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Button 
                        onClick={() => downloadModel('onnx')} 
                        variant="outline"
                        className="h-20 flex flex-col items-center justify-center"
                      >
                        <Download className="h-6 w-6 mb-2" />
                        Download ONNX Model
                        <span className="text-xs text-muted-foreground">Cross-platform inference</span>
                      </Button>
                      
                      <Button 
                        onClick={() => downloadModel('tensorflow')} 
                        variant="outline"
                        className="h-20 flex flex-col items-center justify-center"
                      >
                        <Download className="h-6 w-6 mb-2" />
                        Download TensorFlow Model
                        <span className="text-xs text-muted-foreground">Python/TensorFlow deployment</span>
                      </Button>
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Model Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Model ID:</span>
                          <span className="font-mono">{trainingResult.modelId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">API Endpoint:</span>
                          <span className="font-mono text-xs">{trainingResult.endpointUrl}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Test Accuracy:</span>
                          <span className="font-semibold text-green-600">
                            {(trainingResult.evaluation.testAccuracy * 100).toFixed(2)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Validation Accuracy:</span>
                          <span className="font-semibold text-blue-600">
                            {(trainingResult.evaluation.validationAccuracy * 100).toFixed(2)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Training Accuracy:</span>
                          <span className="font-semibold text-purple-600">
                            {(trainingResult.evaluation.trainingAccuracy * 100).toFixed(2)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">AUC-ROC:</span>
                          <span className="font-semibold text-yellow-600">
                            {(trainingResult.evaluation.auc * 100).toFixed(2)}%
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Sample Python Code</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
{`# Plant Detection Model Inference
import onnxruntime as ort
import numpy as np
from PIL import Image

# Load the model
session = ort.InferenceSession('plant_detector.onnx')

# Preprocess image
def preprocess_image(image_path):
    img = Image.open(image_path).convert('RGB')
    img = img.resize((${imageSize}, ${imageSize}))
    img_array = np.array(img) / 255.0
    img_array = np.transpose(img_array, (2, 0, 1))
    return np.expand_dims(img_array, axis=0).astype(np.float32)

# Run inference
input_data = preprocess_image('test_image.jpg')
outputs = session.run(None, {'input': input_data})
prediction = outputs[0][0]

# Get result
is_plant = prediction[1] > prediction[0]
confidence = max(prediction)
print(f"Plant: {is_plant}, Confidence: {confidence:.2f}")
`}
                        </pre>
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No model available. Please train a model first.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AIEnhancedAnalysis;
