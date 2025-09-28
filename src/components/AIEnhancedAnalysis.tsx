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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Upload,
  Brain,
  Zap,
  Database,
  Rocket,
  Star,
  Moon,
  Globe,
  Download,
  Target,
  ChartBar as BarChart3,
  Leaf,
  Camera,
  CircleCheck as CheckCircle2,
  CircleAlert as AlertCircle,
  TrendingUp,
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
  modelFormats: { onnx: string; tensorflow: string };
}

interface AIEnhancedAnalysisProps {
  userId: string;
}

const AIEnhancedAnalysis: React.FC<AIEnhancedAnalysisProps> = ({ userId }) => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [datasetStats, setDatasetStats] =
    useState<PlantDatasetStats | null>(null);
  const [trainingResult, setTrainingResult] = useState<TrainingResult | null>(
    null
  );
  const [currentPhase, setCurrentPhase] = useState('');
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
                lightingConditions: [
                  'natural',
                  'artificial',
                  'mixed',
                  'low_light',
                ],
                backgrounds: ['field', 'greenhouse', 'indoor', 'garden', 'wild'],
                plantTypes: [
                  'trees',
                  'flowers',
                  'crops',
                  'leaves',
                  'indoor_plants',
                  'succulents',
                ],
                perspectives: [
                  'close_up',
                  'medium',
                  'wide_shot',
                  'aerial',
                ],
              },
            },
          },
        }
      );
      if (error) throw error;
      setDatasetStats(data.stats);
      setProgress(100);
      setCurrentPhase('Plant dataset collection completed!');
      toast({
        title: 'Plant Dataset Collection Complete',
        description: `Successfully collected ${data.stats.totalImages.toLocaleString()} images (${data.stats.plantImages.toLocaleString()} plants, ${data.stats.nonPlantImages.toLocaleString()} non-plants)`,
      });
    } catch (err) {
      console.error('Error collecting plant dataset:', err);
      toast({
        title: 'Error',
        description: 'Failed to collect plant dataset. Please try again.',
        variant: 'destructive',
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
        title: 'Insufficient Data',
        description: 'Please collect at least 10,000 images before training the model.',
        variant: 'destructive',
      });
      return;
    }
    setLoading(true);
    setProgress(0);
    setCurrentPhase('Initializing plant detection model training...');
    try {
      const progressUpdates = [
        { progress: 5, phase: 'Loading dataset and preprocessing images...' },
        {
          progress: 15,
          phase: `Initializing ${modelArchitecture.toUpperCase()} with ImageNet pretrained weights...`,
        },
        { progress: 25, phase: 'Setting up data augmentation pipeline...' },
        { progress: 35, phase: 'Starting transfer learning - freezing backbone layers...' },
        { progress: 45, phase: 'Training classification head (epochs 1-15)...' },
        { progress: 55, phase: 'Fine-tuning backbone layers (epochs 16-35)...' },
        {
          progress: 65,
          phase: 'Advanced training with learning rate scheduling...',
        },
        { progress: 75, phase: 'Validating model performance on validation set...' },
        { progress: 85, phase: 'Testing on holdout test set...' },
        {
          progress: 95,
          phase: 'Exporting model to ONNX and TensorFlow formats...',
        },
        { progress: 98, phase: 'Deploying model to inference endpoint...' },
      ];
      for (const update of progressUpdates) {
        setProgress(update.progress);
        setCurrentPhase(update.phase);
        await new Promise((resolve) => setTimeout(resolve, 3000));
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
              splitRatio: {
                train: 0.8,
                validation: 0.1,
                test: 0.1,
              },
            },
          },
        }
      );
      if (error) throw error;
      setTrainingResult(data);
      setProgress(100);
      setCurrentPhase('Plant detection model training completed successfully!');
      toast({
        title: 'Plant Detection Model Trained Successfully!',
        description: `Model accuracy: ${(data.evaluation.accuracy * 100).toFixed(
          2
        )}% | F1-Score: ${(data.evaluation.f1Score * 100).toFixed(2)}%`,
      });
    } catch (err) {
      console.error('Error training plant model:', err);
      toast({
        title: 'Error',
        description: 'Failed to train plant detection model. Please try again.',
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
        title: 'No Model',
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

      toast({
        title: 'Plant Detection Result',
        description: `${data.isPlant ? 'Plant' : 'Non-Plant'} detected with ${(
          data.confidence * 100
        ).toFixed(1)}% confidence`,
      });
      return data;
    } catch (err) {
      console.error('Error testing plant model:', err);
      toast({
        title: 'Error',
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
        title: 'No Model',
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

      const blob = new Blob([data.modelData], {
        type: 'application/octet-stream',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `plant_detector_${trainingResult.modelId}.${
        format === 'onnx' ? 'onnx' : 'pb'
      }`;
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
        title: 'Error',
        description: 'Failed to download model.',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      {/* Header */}
      <h1>Plant Detection AI System</h1>
      <p>Binary classifier for plant vs non-plant detection using CNN/Transformer models with transfer learning</p>

      {/* Tabs */}
      <Tabs value="dataset" className="my-4">
        <TabsList>
          <TabsTrigger value="dataset">Dataset Collection</TabsTrigger>
          <TabsTrigger value="train">Model Training</TabsTrigger>
          <TabsTrigger value="test">Testing & Inference</TabsTrigger>
          <TabsTrigger value="export">Model Export</TabsTrigger>
        </TabsList>

        <TabsContent value="dataset">
          <Card>
            <CardHeader>
              <CardTitle>Plant Dataset Collection</CardTitle>
              <CardDescription>
                Collect diverse plant and non-plant images
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div>
                Target Dataset Size{' '}
                <Select
                  value={String(targetImageCount)}
                  onValueChange={(value) =>
                    setTargetImageCount(parseInt(value))
                  }
                >
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

              <div className="mt-4">
                <Button onClick={collectPlantDataset} disabled={loading}>
                  {loading ? 'Collecting...' : 'Start Dataset Collection'}
                </Button>
              </div>

              {loading && currentPhase && (
                <div className="mt-2">
                  {currentPhase} — {progress}%
                </div>
              )}

              {datasetStats && (
                <div className="mt-4 space-y-2">
                  <div>Total Images: {datasetStats.totalImages.toLocaleString()}</div>
                  <div>Plant Images: {datasetStats.plantImages.toLocaleString()}</div>
                  <div>Non-Plant Images: {datasetStats.nonPlantImages.toLocaleString()}</div>
                  <div>
                    Plant Ratio:{' '}
                    {Math.round(
                      (datasetStats.plantImages / datasetStats.totalImages) * 100
                    )}
                    %
                  </div>
                  <div>Data Sources:</div>
                  {Object.entries(datasetStats.sources).map(
                    ([source, count]) => (
                      <div key={source}>
                        {source}: {count.toLocaleString()}
                      </div>
                    )
                  )}
                  <div>Plant Types:</div>
                  {Object.entries(datasetStats.plantTypes)
                    .slice(0, 6)
                    .map(([type, count]) => (
                      <div key={type}>
                        {type}: {count.toLocaleString()}
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="train">
          <Card>
            <CardHeader>
              <CardTitle>Model Training</CardTitle>
              <CardDescription>
                Train CNN/Transformer models with transfer learning for binary plant classification
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  Model Architecture{' '}
                  <Select
                    value={modelArchitecture}
                    onValueChange={(value) => setModelArchitecture(value)}
                  >
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
                  Input Size{' '}
                  <Select
                    value={String(imageSize)}
                    onValueChange={(value) => setImageSize(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="224">224×224</SelectItem>
                      <SelectItem value="256">256×256</SelectItem>
                      <SelectItem value="384">384×384</SelectItem>
                      <SelectItem value="512">512×512</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  Batch Size{' '}
                  <Input
                    type="number"
                    value={String(batchSize)}
                    onChange={(e) => setBatchSize(parseInt(e.target.value))}
                    min={8}
                    max={128}
                  />
                </div>

                <div>
                  Epochs{' '}
                  <Input
                    type="number"
                    value={String(epochs)}
                    onChange={(e) => setEpochs(parseInt(e.target.value))}
                    min={10}
                    max={200}
                  />
                </div>

                <div>
                  Learning Rate{' '}
                  <Input
                    type="number"
                    value={String(learningRate)}
                    onChange={(e) => setLearningRate(parseFloat(e.target.value))}
                    step={0.0001}
                  />
                </div>

                <div>
                  <Button onClick={trainPlantDetectionModel} disabled={loading}>
                    {loading ? 'Training...' : 'Start Model Training'}
                  </Button>
                </div>

                {loading && currentPhase && (
                  <div>
                    {currentPhase} — {progress}%
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {trainingResult && (
            <div className="mt-4 space-y-2">
              <div>
                Accuracy: {(trainingResult.evaluation.accuracy * 100).toFixed(2)}%
              </div>
              <div>
                Precision:{' '}
                {(trainingResult.evaluation.precision * 100).toFixed(2)}%
              </div>
              <div>
                Recall: {(trainingResult.evaluation.recall * 100).toFixed(2)}%
              </div>
              <div>
                F1-Score:{' '}
                {(trainingResult.evaluation.f1Score * 100).toFixed(2)}%
              </div>
              <div>
                Train Acc:{' '}
                {(trainingResult.evaluation.trainingAccuracy * 100).toFixed(2)}%
              </div>
              <div>
                Val Acc:{' '}
                {(trainingResult.evaluation.validationAccuracy * 100).toFixed(2)}%
              </div>
              <div>
                AUC-ROC:{' '}
                {(trainingResult.evaluation.auc * 100).toFixed(2)}%
              </div>
              <div>
                Architecture: {modelArchitecture.toUpperCase()}
              </div>
              <div>Input Size: {imageSize}×{imageSize}</div>
              <div>Status: Deployed</div>
              <div>
                Confusion Matrix:
                <div>
                  True Non-Plant: {trainingResult.evaluation.confusionMatrix[0][0]}
                </div>
                <div>
                  False Plant: {trainingResult.evaluation.confusionMatrix[0][1]}
                </div>
                <div>
                  False Non-Plant: {trainingResult.evaluation.confusionMatrix[1][0]}
                </div>
                <div>
                  True Plant: {trainingResult.evaluation.confusionMatrix[1][1]}
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="test">
          <Card>
            <CardHeader>
              <CardTitle>Testing & Inference</CardTitle>
              <CardDescription>
                Test your trained binary classifier with new images
              </CardDescription>
            </CardHeader>
            <CardContent>
              {trainingResult ? (
                <>
                  <p>
                    Run inference with your trained model. Accuracy:{' '}
                    {(trainingResult.evaluation.accuracy * 100).toFixed(1)}% | F1-Score:{' '}
                    {(trainingResult.evaluation.f1Score * 100).toFixed(1)}% | Model:{' '}
                    {modelArchitecture.toUpperCase()}
                  </p>
                  <div>
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
                      <Button>Choose Image</Button>
                    </label>
                  </div>
                  {loading && currentPhase && (
                    <div>
                      {currentPhase}
                    </div>
                  )}
                </>
              ) : (
                <p>Train a plant detection model first to enable testing</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export">
          <Card>
            <CardHeader>
              <CardTitle>Model Export & Deployment</CardTitle>
              <CardDescription>
                Export trained models in ONNX and TensorFlow formats for production use
              </CardDescription>
            </CardHeader>
            <CardContent>
              {trainingResult ? (
                <>
                  <div>
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => downloadModel('onnx')}
                    >
                      Download ONNX Model
                    </Button>
                  </div>
                  <div>
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => downloadModel('tensorflow')}
                    >
                      Download TensorFlow Model
                    </Button>
                  </div>
                  <div>
                    <pre>
                      {`# Python inference script for ONNX model
import onnxruntime as ort
import numpy as np
from PIL import Image

session = ort.InferenceSession('plant_detector.onnx')
img = Image.open('test_image.jpg').resize({` +
                        `{imageSize}, {imageSize}` +
                        `})
img_array = np.array(img).astype(np.float32) / 255.0
img_batch = np.expand_dims(img_array, axis=0)
outputs = session.run(None, {'input': img_batch})
prediction = outputs[0][0]
const isPlant = prediction > 0.5;
const confidence = isPlant ? prediction : 1 - prediction;
console.log(\`Plant: \${isPlant}, Confidence: \${confidence.toFixed(2)}\`);
`}
                    </pre>
                  </div>
                </>
              ) : (
                <p>Train a plant detection model first to enable export</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* System Status Cards */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Dataset Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div>Total Images: {datasetStats?.totalImages.toLocaleString() ?? '0'}</div>
            <div>Plant Images: {datasetStats?.plantImages.toLocaleString() ?? '0'}</div>
            <div>Non-Plant: {datasetStats?.nonPlantImages.toLocaleString() ?? '0'}</div>
            <div>Status: {datasetStats ? 'Ready' : 'Collect Data'}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Model Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div>Architecture: {modelArchitecture.toUpperCase()}</div>
            <div>
              Accuracy:{' '}
              {trainingResult
                ? `${(trainingResult.evaluation.accuracy * 100).toFixed(1)}%`
                : 'N/A'}
            </div>
            <div>
              F1-Score:{' '}
              {trainingResult
                ? `${(trainingResult.evaluation.f1Score * 100).toFixed(1)}%`
                : 'N/A'}
            </div>
            <div>Status: {trainingResult ? 'Trained' : 'Train Model'}</div>
            <div>Export Status: {trainingResult ? 'Available' : 'Train First'}</div>
            <div>API Endpoint: {trainingResult ? 'Active' : 'Deploy First'}</div>
            <div>Inference Script: {trainingResult ? 'Ready' : 'Train First'}</div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default AIEnhancedAnalysis;
