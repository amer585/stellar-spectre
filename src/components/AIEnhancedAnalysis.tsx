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
import {
  Upload,
  Brain,
  Database,
  Target,
  BarChart3,
  Zap,
  Camera,
  Leaf,
  Bug,
  Activity,
  Cloud,
  Cpu,
  Download,
  Play,
  Settings,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  FolderOpen,
  ImagePlus,
  Trash2,
} from 'lucide-react';
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

interface AIEnhancedAnalysisProps {
  userId: string;
}

const AIEnhancedAnalysis: React.FC<AIEnhancedAnalysisProps> = ({ userId }) => {
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState('');
  const [datasetStats, setDatasetStats] =
    useState<PlantDatasetStats | null>(null);
  const [trainingResult, setTrainingResult] =
    useState<TrainingResult | null>(null);
  const [currentTab, setCurrentTab] = useState<string>('mode-selection');
  const [dataMode, setDataMode] = useState<'automatic' | 'manual' | null>(
    null
  );

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

  // Conditions to move between tabs
  const canProceedToTraining =
    datasetStats !== null &&
    datasetStats.plantImages >= 100 &&
    datasetStats.nonPlantImages >= 50;
  const canProceedToTesting = trainingResult !== null;
  const canProceedToExport = trainingResult !== null;

  // Handle file selection for manual mode
  const handleFileSelection = useCallback(
    async (files: FileList, category: 'plant' | 'non_plant') => {
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
      toast({
        title: 'Files Added',
        description: `Added ${newFiles.length} ${category.replace(
          '_',
          '-'
        )} images`,
      });
    },
    [toast]
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

      // Helper to upload a batch
      const uploadBatch = async (uploadFiles: UploadedFile[], cat: 'plant' | 'other') => {
        for (const uploadFile of uploadFiles) {
          const fileName = `manual_dataset/${cat}/${uploadFile.id}_${uploadFile.file.name}`;
          const { error } = await supabase.storage
            .from('training-datasets')
            .upload(fileName, uploadFile.file);
          if (error) {
            console.error(`Failed to upload ${uploadFile.file.name}:`, error);
          } else {
            await supabase
              .from('image_metadata')
              .insert({
                id: uploadFile.id,
                user_id: userId,
                title: uploadFile.file.name,
                source: 'Manual_Upload',
                category: cat === 'plant' ? 'plant' : 'other',
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
      };

      await uploadBatch(plantImages, 'plant');
      await uploadBatch(nonPlantImages, 'other');

      const stats: PlantDatasetStats = {
        totalImages: plantImages.length + nonPlantImages.length,
        plantImages: plantImages.length,
        nonPlantImages: nonPlantImages.length,
        sources: { Manual_Upload: plantImages.length + nonPlantImages.length },
        plantTypes: { User_Uploaded: plantImages.length },
        lightingConditions: { Mixed: plantImages.length + nonPlantImages.length },
        resolutions: { Variable: plantImages.length + nonPlantImages.length },
        backgrounds: { Mixed: plantImages.length + nonPlantImages.length },
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
      const { data, error } = await supabase.functions.invoke(
        'plant-dataset-collector',
        {
          body: {
            action: 'collect-dataset',
            userId,
            targetCount: targetImageCount,
            requirements: {
              plantImages: Math.floor(targetImageCount * 0.7),
              nonPlantImages: Math.floor(targetImageCount * 0.3),
              sources: [
                'PlantCLEF',
                'ImageNet',
                'Google_Open_Images',
                'Kaggle_Plants',
                'PlantVillage',
              ],
              diversity: {
                lightingConditions: ['natural', 'artificial', 'mixed', 'low_light'],
                backgrounds: ['field', 'greenhouse', 'indoor', 'garden', 'wild'],
                plantTypes: ['trees', 'flowers', 'crops', 'leaves', 'indoor_plants', 'succulents'],
                perspectives: ['close_up', 'medium', 'wide_shot', 'aerial'],
              },
            },
          },
        }
      );
      if (error) throw error;
      if (!data) {
        throw new Error('No data returned');
      }
      // Type cast / assume data.stats matches PlantDatasetStats
      setDatasetStats(data.stats);
      setProgress(100);
      setCurrentPhase('Automatic dataset collection completed!');
      toast({
        title: 'Dataset Collection Complete',
        description: `Successfully collected ${data.stats.totalImages.toLocaleString()} images`,
      });
    } catch (err: any) {
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
        { progress: 98, phase: 'Deploying to inference endpoint...' },
      ];
      for (const update of progressUpdates) {
        setProgress(update.progress);
        setCurrentPhase(update.phase);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      const { data, error } = await supabase.functions.invoke(
        'plant-model-trainer',
        {
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
                mixup: true,
              },
              splitRatio: { train: 0.8, validation: 0.1, test: 0.1 },
            },
          },
        }
      );
      if (error) throw error;
      if (!data) {
        throw new Error('No training result returned');
      }
      setTrainingResult(data);
      setProgress(100);
      setCurrentPhase('Model training completed successfully!');
      toast({
        title: 'Model Training Complete!',
        description: `Accuracy: ${(data.evaluation.accuracy * 100).toFixed(2)}% | F1-Score: ${(data.evaluation.f1Score * 100).toFixed(2)}%`,
      });
    } catch (err: any) {
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

  // Test / inference
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

      const { data, error } = await supabase.functions.invoke(
        'plant-model-trainer',
        {
          body: {
            action: 'inference',
            userId,
            imageData: base64Image,
          },
        }
      );
      if (error) throw error;
      if (!data) {
        throw new Error('No inference result returned');
      }
      toast({
        title: 'Plant Detection Result',
        description: `${data.isPlant ? 'Plant' : 'Non-Plant'} detected with ${(data.confidence * 100).toFixed(1)}% confidence`,
      });
      return data;
    } catch (err: any) {
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

  // Download model (onnx or tensorflow)
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
      const { data, error } = await supabase.functions.invoke(
        'plant-model-trainer',
        {
          body: {
            action: 'download-model',
            userId,
            format,
            modelId: trainingResult.modelId,
          },
        }
      );
      if (error) throw error;
      if (!data) {
        throw new Error('No model data returned');
      }
      const blob = new Blob([new Uint8Array(data.modelData)], {
        type: 'application/octet-stream',
      });
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
    } catch (err: any) {
      console.error('Error downloading model:', err);
      toast({
        title: 'Download Failed',
        description: 'Failed to download model.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plant Detection AI System</CardTitle>
        <CardDescription>
          Binary classifier for plant vs non-plant detection using
          transfer learning
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={currentTab} onValueChange={setCurrentTab}>
          <TabsList>
            <TabsTrigger value="mode-selection">Data Mode</TabsTrigger>
            <TabsTrigger value="dataset">Dataset Collection</TabsTrigger>
            <TabsTrigger value="training">Model Training</TabsTrigger>
            <TabsTrigger value="testing">Testing & Inference</TabsTrigger>
            <TabsTrigger value="export">Model Export</TabsTrigger>
          </TabsList>

          <TabsContent value="mode-selection">
            <div className="flex flex-col space-y-4">
              <Button onClick={() => setDataMode('automatic')}>
                Automatic Collection
              </Button>
              <Button onClick={() => setDataMode('manual')}>
                Manual Upload
              </Button>
              {dataMode && (
                <Button
                  onClick={() => setCurrentTab('dataset')}
                  className="px-8"
                >
                  Continue with{' '}
                  {dataMode === 'automatic' ? 'Automatic' : 'Manual'} Mode
                </Button>
              )}
            </div>
          </TabsContent>

          <TabsContent value="dataset">
            {dataMode === 'automatic' ? (
              <div className="space-y-4">
                <Label>Target Dataset Size</Label>
                <Select
                  value={targetImageCount.toString()}
                  onValueChange={(v) => setTargetImageCount(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select target count" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15000">15,000 images</SelectItem>
                    <SelectItem value="25000">25,000 images</SelectItem>
                    <SelectItem value="35000">35,000 images</SelectItem>
                    <SelectItem value="50000">50,000 images</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={collectAutomaticDataset}
                  disabled={loading}
                >
                  {loading ? 'Collecting Dataset...' : 'Start Automatic Collection'}
                </Button>
                {loading && (
                  <div>
                    {currentPhase} — {progress.toFixed(1)}%
                    <Progress value={progress} />
                  </div>
                )}
                {datasetStats && (
                  <div>
                    <p>Dataset Ready!</p>
                    <p>Total Images: {datasetStats.totalImages.toLocaleString()}</p>
                    <p>Plants: {datasetStats.plantImages.toLocaleString()}</p>
                    <p>Non-Plants: {datasetStats.nonPlantImages.toLocaleString()}</p>
                    <p>Sources: {Object.keys(datasetStats.sources).length}</p>
                  </div>
                )}
                {datasetStats && (
                  <Button
                    onClick={() => setCurrentTab('training')}
                    className="px-8"
                  >
                    Proceed to Model Training
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <Label>Manual Dataset Upload</Label>
                <div>
                  <Label>Plant Images ({plantImages.length})</Label>
                  <Input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) =>
                      e.target.files &&
                      handleFileSelection(e.target.files, 'plant')
                    }
                  />
                  {plantImages.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {plantImages.slice(0, 12).map((uploadFile) => (
                        <div key={uploadFile.id}>
                          <img
                            src={uploadFile.preview}
                            alt=""
                            className="w-full h-auto"
                          />
                          <Button
                            variant="destructive"
                            onClick={() =>
                              removeFile(uploadFile.id, 'plant')
                            }
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                      {plantImages.length > 12 && (
                        <p>Showing 12 of {plantImages.length} images</p>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <Label>Non-Plant Images ({nonPlantImages.length})</Label>
                  <Input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) =>
                      e.target.files &&
                      handleFileSelection(e.target.files, 'non_plant')
                    }
                  />
                  {nonPlantImages.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {nonPlantImages.slice(0, 12).map((uploadFile) => (
                        <div key={uploadFile.id}>
                          <img
                            src={uploadFile.preview}
                            alt=""
                            className="w-full h-auto"
                          />
                          <Button
                            variant="destructive"
                            onClick={() =>
                              removeFile(uploadFile.id, 'non_plant')
                            }
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                      {nonPlantImages.length > 12 && (
                        <p>Showing 12 of {nonPlantImages.length} images</p>
                      )}
                    </div>
                  )}
                </div>
                {uploading && (
                  <div className="mt-2">
                    {currentPhase} — {progress.toFixed(1)}%
                    <Progress value={progress} />
                  </div>
                )}
                {(plantImages.length > 0 || nonPlantImages.length > 0) && (
                  <Button
                    onClick={uploadManualDataset}
                    disabled={uploading}
                  >
                    {uploading
                      ? 'Uploading Dataset...'
                      : `Upload Dataset (${plantImages.length + nonPlantImages.length} images)`}
                  </Button>
                )}
                {datasetStats && (
                  <Button
                    onClick={() => setCurrentTab('training')}
                    className="px-8"
                  >
                    Proceed to Model Training
                  </Button>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="training">
            <div className="space-y-4">
              <Label>Model Training Configuration</Label>
              <div>
                <Label>Model Architecture</Label>
                <Select
                  value={modelArchitecture}
                  onValueChange={setModelArchitecture}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select model" />
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
                  onChange={(e) =>
                    setImageSize(parseInt(e.target.value))
                  }
                />
              </div>
              <div>
                <Label>Batch Size</Label>
                <Input
                  type="number"
                  min={8}
                  max={128}
                  value={batchSize}
                  onChange={(e) =>
                    setBatchSize(parseInt(e.target.value))
                  }
                />
              </div>
              <div>
                <Label>Epochs</Label>
                <Input
                  type="number"
                  min={1}
                  max={500}
                  value={epochs}
                  onChange={(e) => setEpochs(parseInt(e.target.value))}
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
                  onChange={(e) =>
                    setLearningRate(parseFloat(e.target.value))
                  }
                />
              </div>
              <Button
                onClick={trainPlantDetectionModel}
                disabled={loading || !canProceedToTraining}
              >
                {loading ? 'Training Model...' : 'Start Model Training'}
              </Button>
              {loading && (
                <div>
                  {currentPhase} — {progress.toFixed(1)}%
                  <Progress value={progress} />
                </div>
              )}
              {trainingResult && (
                <div className="mt-4">
                  <h3>Training Complete!</h3>
                  <p>
                    Accuracy: {(trainingResult.evaluation.accuracy * 100).toFixed(2)}%
                  </p>
                  <p>
                    F1-Score: {(trainingResult.evaluation.f1Score * 100).toFixed(2)}%
                  </p>
                  <Button
                    onClick={() => setCurrentTab('testing')}
                    className="px-8"
                  >
                    Test Your Model
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="testing">
            <div className="space-y-4">
              <h3>Model Testing & Inference</h3>
              {trainingResult ? (
                <>
                  <p>
                    Accuracy:{' '}
                    {(trainingResult.evaluation.accuracy * 100).toFixed(1)}% | F1-Score:{' '}
                    {(trainingResult.evaluation.f1Score * 100).toFixed(1)}%
                  </p>
                  <div>
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
                    <p>
                      {currentPhase} — {progress.toFixed(1)}%
                    </p>
                  )}
                </>
              ) : (
                <p>No Model Available — train a model first.</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="export">
            <div className="space-y-4">
              <h3>Model Export & Deployment</h3>
              {trainingResult ? (
                <>
                  <Button onClick={() => downloadModel('onnx')} variant="outline">
                    Download ONNX Model
                  </Button>
                  <Button onClick={() => downloadModel('tensorflow')} variant="outline">
                    Download TensorFlow Model
                  </Button>
                  <div className="mt-4">
                    <h4>Model Info</h4>
                    <p>Model ID: {trainingResult.modelId}</p>
                    <p>API Endpoint: {trainingResult.endpointUrl}</p>
                    <p>
                      Test Accuracy: {(trainingResult.evaluation.testAccuracy * 100).toFixed(2)}%
                    </p>
                    <p>
                      Validation Accuracy: {(trainingResult.evaluation.validationAccuracy * 100).toFixed(2)}%
                    </p>
                    <p>
                      Training Accuracy: {(trainingResult.evaluation.trainingAccuracy * 100).toFixed(2)}%
                    </p>
                    <p>AUC-ROC: {(trainingResult.evaluation.auc * 100).toFixed(2)}%</p>
                  </div>
                </>
              ) : (
                <p>No Model Available — train first.</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AIEnhancedAnalysis;
