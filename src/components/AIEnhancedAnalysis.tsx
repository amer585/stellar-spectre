import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Brain, Zap, Database, Rocket, Star, Moon, Globe, Download, Target, ChartBar as BarChart3, Leaf, Camera, CircleCheck as CheckCircle2, CircleAlert as AlertCircle, TrendingUp } from 'lucide-react';
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

interface AIEnhancedAnalysisProps {
  userId: string;
}

const AIEnhancedAnalysis: React.FC<AIEnhancedAnalysisProps> = ({ userId }) => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [datasetStats, setDatasetStats] = useState<PlantDatasetStats | null>(null);
  const [trainingResult, setTrainingResult] = useState<TrainingResult | null>(null);
  const [currentPhase, setCurrentPhase] = useState<string>('');
  const [targetImageCount, setTargetImageCount] = useState(35000);
  const [modelArchitecture, setModelArchitecture] = useState('efficientnet');
  const [imageSize, setImageSize] = useState(224);
  const [batchSize, setBatchSize] = useState(32);
  const [epochs, setEpochs] = useState(50);
  const [learningRate, setLearningRate] = useState(0.001);
  const { toast } = useToast();

  // Plant Dataset Collection
  const collectPlantDataset = async () => {
    setLoading(true);
    setProgress(5);
    setCurrentPhase('Initializing plant dataset collection...');
    
    try {
      const { data, error } = await supabase.functions.invoke('plant-dataset-collector', {
        body: {
          action: 'collect-dataset',
          userId,
          targetCount: targetImageCount,
          requirements: {
            plantImages: Math.floor(targetImageCount * 0.7), // 70% plants
            nonPlantImages: Math.floor(targetImageCount * 0.3), // 30% non-plants
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
      setCurrentPhase('Plant dataset collection completed!');
      
      toast({
        title: "Plant Dataset Collection Complete",
        description: `Successfully collected ${data.stats.totalImages.toLocaleString()} images (${data.stats.plantImages.toLocaleString()} plants, ${data.stats.nonPlantImages.toLocaleString()} non-plants)`,
      });
    } catch (error) {
      console.error('Error collecting plant dataset:', error);
      toast({
        title: "Error",
        description: "Failed to collect plant dataset. Please try again.",
        variant: "destructive",
      });
      setCurrentPhase('Collection failed');
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  // Plant Detection Model Training
  const trainPlantDetectionModel = async () => {
    if (!datasetStats || datasetStats.totalImages < 10000) {
      toast({
        title: "Insufficient Data",
        description: "Please collect at least 10,000 images before training the model.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setProgress(0);
    setCurrentPhase('Initializing plant detection model training...');
    
    try {
      // Simulate training progress updates with realistic stages
      const progressUpdates = [
        { progress: 5, phase: 'Loading dataset and preprocessing images...' },
        { progress: 15, phase: `Initializing ${modelArchitecture.toUpperCase()} with ImageNet pretrained weights...` },
        { progress: 25, phase: 'Setting up data augmentation pipeline...' },
        { progress: 35, phase: 'Starting transfer learning - freezing backbone layers...' },
        { progress: 45, phase: 'Training classification head (epochs 1-15)...' },
        { progress: 55, phase: 'Fine-tuning backbone layers (epochs 16-35)...' },
        { progress: 65, phase: 'Advanced training with learning rate scheduling...' },
        { progress: 75, phase: 'Validating model performance on validation set...' },
        { progress: 85, phase: 'Testing on holdout test set...' },
        { progress: 95, phase: 'Exporting model to ONNX and TensorFlow formats...' },
        { progress: 98, phase: 'Deploying model to inference endpoint...' }
      ];

      for (const update of progressUpdates) {
        setProgress(update.progress);
        setCurrentPhase(update.phase);
        await new Promise(resolve => setTimeout(resolve, 3000));
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
      setCurrentPhase('Plant detection model training completed successfully!');
      
      toast({
        title: "Plant Detection Model Trained Successfully!",
        description: `Model accuracy: ${(data.evaluation.accuracy * 100).toFixed(2)}% | F1-Score: ${(data.evaluation.f1Score * 100).toFixed(2)}%`,
      });
    } catch (error) {
      console.error('Error training plant model:', error);
      toast({
        title: "Error",
        description: "Failed to train plant detection model. Please try again.",
        variant: "destructive",
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
        title: "No Model",
        description: "Please train a model first.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setCurrentPhase('Processing image for plant detection...');

    try {
      // Convert file to base64
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
        title: "Plant Detection Result",
        description: `${data.isPlant ? 'Plant' : 'Non-Plant'} detected with ${(data.confidence * 100).toFixed(1)}% confidence`,
      });

      return data;
    } catch (error) {
      console.error('Error testing plant model:', error);
      toast({
        title: "Error",
        description: "Failed to run plant detection inference.",
        variant: "destructive",
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
        title: "No Model",
        description: "Please train a model first.",
        variant: "destructive",
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

      // Create download link
      const blob = new Blob([data.modelData], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `plant_detector_${trainingResult.modelId}.${format === 'onnx' ? 'onnx' : 'pb'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Model Downloaded",
        description: `${format.toUpperCase()} model downloaded successfully`,
      });
    } catch (error) {
      console.error('Error downloading model:', error);
      toast({
        title: "Error",
        description: "Failed to download model.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
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

      <Tabs defaultValue="collection" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="collection">Dataset Collection</TabsTrigger>
          <TabsTrigger value="training">Model Training</TabsTrigger>
          <TabsTrigger value="inference">Testing & Inference</TabsTrigger>
          <TabsTrigger value="export">Model Export</TabsTrigger>
        </TabsList>

        {/* Dataset Collection Tab */}
        <TabsContent value="collection" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Plant Dataset Collection
              </CardTitle>
              <CardDescription>
                Collect diverse plant and non-plant images from multiple open datasets
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Target Dataset Size</Label>
                  <Select 
                    value={targetImageCount.toString()} 
                    onValueChange={(value) => setTargetImageCount(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15000">15,000 images (Quick)</SelectItem>
                      <SelectItem value="25000">25,000 images (Standard)</SelectItem>
                      <SelectItem value="35000">35,000 images (Comprehensive)</SelectItem>
                      <SelectItem value="50000">50,000 images (Research Grade)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Dataset Composition</Label>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">70% Plants</Badge>
                    <Badge variant="outline">30% Non-Plants</Badge>
                    <Badge variant="secondary">Balanced Classes</Badge>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Leaf className="h-4 w-4 text-green-600" />
                    Plant Sources
                  </h4>
                  <div className="space-y-1 text-sm">
                    <div>• PlantCLEF (25,000+ species)</div>
                    <div>• ImageNet Plant Classes</div>
                    <div>• Google Open Images (Plant labels)</div>
                    <div>• Kaggle Plant Datasets</div>
                    <div>• PlantVillage (Disease detection)</div>
                    <div>• iNaturalist Plant Observations</div>
                  </div>
                </div>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Globe className="h-4 w-4 text-blue-600" />
                    Non-Plant Sources
                  </h4>
                  <div className="space-y-1 text-sm">
                    <div>• COCO Dataset (Animals, Objects)</div>
                    <div>• ImageNet Non-Plant Classes</div>
                    <div>• Google Open Images (Non-Plant)</div>
                    <div>• CIFAR-10/100 (Vehicles, Animals)</div>
                    <div>• Landscape Images (No Vegetation)</div>
                    <div>• Indoor Objects & Furniture</div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <h4 className="font-medium mb-2">Diversity Requirements</h4>
                <div className="grid gap-2 md:grid-cols-4 text-sm">
                  <div>
                    <strong>Lighting:</strong> Natural, Artificial, Mixed, Low-light
                  </div>
                  <div>
                    <strong>Backgrounds:</strong> Field, Indoor, Garden, Wild, Studio
                  </div>
                  <div>
                    <strong>Resolutions:</strong> 224px to 1024px
                  </div>
                  <div>
                    <strong>Perspectives:</strong> Close-up, Medium, Wide, Aerial
                  </div>
                </div>
              </div>

              <Button 
                onClick={collectPlantDataset} 
                disabled={loading}
                className="w-full"
                size="lg"
              >
                {loading ? 'Collecting Plant Dataset...' : 'Start Dataset Collection'}
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
                    <CardTitle className="text-lg text-green-800">Dataset Collection Complete! 🌱</CardTitle>
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
                        <div className="text-xl font-bold text-red-600">{datasetStats.nonPlantImages.toLocaleString()}</div>
                        <div className="text-xs text-red-700">Non-Plant Images</div>
                      </div>
                      <div className="text-center p-3 bg-white rounded-lg">
                        <div className="text-xl font-bold text-purple-600">
                          {Math.round((datasetStats.plantImages / datasetStats.totalImages) * 100)}%
                        </div>
                        <div className="text-xs text-purple-700">Plant Ratio</div>
                      </div>
                    </div>
                    
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div>
                        <h5 className="font-medium mb-2">Data Sources</h5>
                        {Object.entries(datasetStats.sources).map(([source, count]) => (
                          <div key={source} className="flex justify-between text-sm">
                            <span>{source}:</span>
                            <span className="font-medium">{count.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                      <div>
                        <h5 className="font-medium mb-2">Plant Types</h5>
                        {Object.entries(datasetStats.plantTypes).slice(0, 6).map(([type, count]) => (
                          <div key={type} className="flex justify-between text-sm">
                            <span>{type}:</span>
                            <span className="font-medium">{count.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Model Training Tab */}
        <TabsContent value="training" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Plant Detection Model Training
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
                        <SelectItem value="resnet">ResNet-50</SelectItem>
                        <SelectItem value="vit">Vision Transformer (ViT-Base)</SelectItem>
                        <SelectItem value="mobilenet">MobileNetV3 (Fast)</SelectItem>
                        <SelectItem value="convnext">ConvNeXt (State-of-art)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Image Size</Label>
                    <Select value={imageSize.toString()} onValueChange={(value) => setImageSize(parseInt(value))}>
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
                      min="8"
                      max="128"
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
                      min="10"
                      max="200"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Learning Rate</Label>
                    <Select value={learningRate.toString()} onValueChange={(value) => setLearningRate(parseFloat(value))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0.0001">0.0001 (Conservative)</SelectItem>
                        <SelectItem value="0.001">0.001 (Standard)</SelectItem>
                        <SelectItem value="0.01">0.01 (Aggressive)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Data Split</Label>
                    <div className="flex gap-2 text-sm">
                      <Badge variant="outline">80% Train</Badge>
                      <Badge variant="outline">10% Validation</Badge>
                      <Badge variant="outline">10% Test</Badge>
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
                disabled={loading || !datasetStats}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <Brain className="mr-2 h-4 w-4 animate-spin" />
                    Training Plant Detection Model...
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
                  <div className="text-xs text-muted-foreground text-center">
                    Training with transfer learning - this may take 15-30 minutes
                  </div>
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
                        <h5 className="font-medium mb-2">Test Set Performance</h5>
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
                        <h5 className="font-medium mb-2">Training Progress</h5>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Train Acc:</span>
                            <span className="font-medium">{(trainingResult.evaluation.trainingAccuracy * 100).toFixed(2)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Val Acc:</span>
                            <span className="font-medium">{(trainingResult.evaluation.validationAccuracy * 100).toFixed(2)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>AUC-ROC:</span>
                            <span className="font-medium">{(trainingResult.evaluation.auc * 100).toFixed(2)}%</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h5 className="font-medium mb-2">Model Info</h5>
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
                            <span>Status:</span>
                            <Badge variant="default">Deployed</Badge>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <h5 className="font-medium mb-2">Confusion Matrix</h5>
                      <div className="grid grid-cols-2 gap-2 max-w-xs">
                        <div className="text-center p-3 bg-green-100 border rounded">
                          <div className="font-bold">{trainingResult.evaluation.confusionMatrix[0][0]}</div>
                          <div className="text-xs">True Non-Plant</div>
                        </div>
                        <div className="text-center p-3 bg-red-100 border rounded">
                          <div className="font-bold">{trainingResult.evaluation.confusionMatrix[0][1]}</div>
                          <div className="text-xs">False Plant</div>
                        </div>
                        <div className="text-center p-3 bg-red-100 border rounded">
                          <div className="font-bold">{trainingResult.evaluation.confusionMatrix[1][0]}</div>
                          <div className="text-xs">False Non-Plant</div>
                        </div>
                        <div className="text-center p-3 bg-green-100 border rounded">
                          <div className="font-bold">{trainingResult.evaluation.confusionMatrix[1][1]}</div>
                          <div className="text-xs">True Plant</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Testing & Inference Tab */}
        <TabsContent value="inference" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Plant Detection Testing
              </CardTitle>
              <CardDescription>
                Test your trained binary classifier with new images
              </CardDescription>
            </CardHeader>
            <CardContent>
              {trainingResult ? (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span className="font-medium">Binary Classifier Ready</span>
                    </div>
                    <div className="text-sm text-green-700">
                      Plant detection accuracy: {(trainingResult.evaluation.accuracy * 100).toFixed(1)}% | 
                      F1-Score: {(trainingResult.evaluation.f1Score * 100).toFixed(1)}% | 
                      Model: {modelArchitecture.toUpperCase()}
                    </div>
                  </div>

                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-semibold mb-2">Upload Test Image</h3>
                    <p className="text-gray-600 mb-4">Upload any image to test plant vs non-plant classification</p>
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
                        Choose Image
                      </Button>
                    </label>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Card className="p-4">
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Leaf className="h-4 w-4 text-green-600" />
                        Plant Detection
                      </h4>
                      <div className="space-y-1 text-sm">
                        <div>• Trees and shrubs</div>
                        <div>• Flowers and flowering plants</div>
                        <div>• Crops and vegetables</div>
                        <div>• Indoor houseplants</div>
                        <div>• Leaves and foliage</div>
                        <div>• Succulents and cacti</div>
                      </div>
                    </Card>
                    <Card className="p-4">
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Globe className="h-4 w-4 text-blue-600" />
                        Non-Plant Detection
                      </h4>
                      <div className="space-y-1 text-sm">
                        <div>• Animals and people</div>
                        <div>• Vehicles and machinery</div>
                        <div>• Buildings and structures</div>
                        <div>• Furniture and objects</div>
                        <div>• Landscapes without vegetation</div>
                        <div>• Abstract patterns</div>
                      </div>
                    </Card>
                  </div>

                  {loading && currentPhase && (
                    <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                      <span className="text-sm text-blue-700">{currentPhase}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Brain className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold mb-2">No Model Available</h3>
                  <p className="text-gray-600">Train a plant detection model first to enable testing</p>
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
            <CardContent>
              {trainingResult ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Download className="h-5 w-5 text-blue-600" />
                        <h4 className="font-medium">ONNX Format</h4>
                      </div>
                      <div className="space-y-2 text-sm mb-4">
                        <div>• Cross-platform inference</div>
                        <div>• Optimized for production</div>
                        <div>• Compatible with ONNX Runtime</div>
                        <div>• Smaller file size</div>
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
                        <Download className="h-5 w-5 text-orange-600" />
                        <h4 className="font-medium">TensorFlow Format</h4>
                      </div>
                      <div className="space-y-2 text-sm mb-4">
                        <div>• Native TensorFlow support</div>
                        <div>• TensorFlow Serving ready</div>
                        <div>• Mobile deployment (TFLite)</div>
                        <div>• Full model graph</div>
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

                  <Card className="p-4 bg-gray-50">
                    <h4 className="font-medium mb-3">Sample Inference Script</h4>
                    <div className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm font-mono overflow-x-auto">
                      <div className="text-gray-400"># Python inference script for ONNX model</div>
                      <div className="mt-2">
                        <div>import onnxruntime as ort</div>
                        <div>import numpy as np</div>
                        <div>from PIL import Image</div>
                        <div className="mt-2">
                          <div># Load model</div>
                          <div>session = ort.InferenceSession('plant_detector.onnx')</div>
                        </div>
                        <div className="mt-2">
                          <div># Preprocess image</div>
                          <div>img = Image.open('test_image.jpg').resize(({imageSize}, {imageSize}))</div>
                          <div>img_array = np.array(img).astype(np.float32) / 255.0</div>
                          <div>img_batch = np.expand_dims(img_array, axis=0)</div>
                        </div>
                        <div className="mt-2">
                          <div># Run inference</div>
                          <div>outputs = session.run(None, {{'input': img_batch}})</div>
                          <div>prediction = outputs[0][0]</div>
                          <div>is_plant = prediction > 0.5</div>
                          <div>confidence = prediction if is_plant else 1 - prediction</div>
                        </div>
                        <div className="mt-2">
                          <div>print(f"Plant: {{is_plant}}, Confidence: {{confidence:.2f}}")</div>
                        </div>
                      </div>
                    </div>
                  </Card>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Card className="p-4">
                      <h4 className="font-medium mb-2">Model Specifications</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Architecture:</span>
                          <span className="font-medium">{modelArchitecture.toUpperCase()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Input Size:</span>
                          <span className="font-medium">{imageSize}×{imageSize}×3</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Output:</span>
                          <span className="font-medium">Binary (Plant/Non-Plant)</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Pretrained:</span>
                          <span className="font-medium">ImageNet</span>
                        </div>
                      </div>
                    </Card>

                    <Card className="p-4">
                      <h4 className="font-medium mb-2">Deployment Options</h4>
                      <div className="space-y-1 text-sm">
                        <div>• Cloud API (REST endpoint)</div>
                        <div>• Edge devices (ONNX Runtime)</div>
                        <div>• Mobile apps (TensorFlow Lite)</div>
                        <div>• Web browsers (TensorFlow.js)</div>
                        <div>• Docker containers</div>
                        <div>• Kubernetes clusters</div>
                      </div>
                    </Card>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Download className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold mb-2">No Model Available</h3>
                  <p className="text-gray-600">Train a plant detection model first to enable export</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* System Status Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Dataset Status
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
                <span className="font-medium text-green-600">{datasetStats?.plantImages.toLocaleString() || '0'}</span>
              </div>
              <div className="flex justify-between">
                <span>Non-Plant:</span>
                <span className="font-medium text-blue-600">{datasetStats?.nonPlantImages.toLocaleString() || '0'}</span>
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
              Model Status
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
              <Target className="h-5 w-5" />
              Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Target Accuracy:</span>
                <span className="font-medium">&gt; 90%</span>
              </div>
              <div className="flex justify-between">
                <span>Target F1:</span>
                <span className="font-medium">&gt; 88%</span>
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5" />
              Export Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>ONNX:</span>
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
                <span>API Endpoint:</span>
                <Badge variant={trainingResult ? "default" : "secondary"}>
                  {trainingResult ? "Active" : "Deploy First"}
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
      </div>
    </div>
  );
};

export default AIEnhancedAnalysis;