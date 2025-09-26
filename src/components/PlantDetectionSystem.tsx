import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  TrendingUp
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PlantDetectionSystemProps {
  userId: string;
}

interface DatasetStats {
  totalImages: number;
  plantImages: number;
  nonPlantImages: number;
  annotatedImages: number;
  plantTypes: Record<string, number>;
  healthStatus: Record<string, number>;
  sources: Record<string, number>;
}

interface ModelMetrics {
  detection: {
    mAP_50: number;
    mAP_50_95: number;
    precision: number;
    recall: number;
    f1Score: number;
  };
  classification: {
    top1Accuracy: number;
    top5Accuracy: number;
    perClassAccuracy: Record<string, number>;
  };
  performance: {
    inferenceTime: number;
    modelSize: number;
    throughput: number;
  };
}

interface TrainingConfig {
  model: 'yolov8' | 'ssd' | 'vit' | 'maskrcnn';
  imageSize: number;
  batchSize: number;
  epochs: number;
  learningRate: number;
  optimizer: 'adamw' | 'sgd';
  augmentation: boolean;
  mixedPrecision: boolean;
  progressiveTraining: boolean;
}

const PlantDetectionSystem: React.FC<PlantDetectionSystemProps> = ({ userId }) => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState('');
  const [datasetStats, setDatasetStats] = useState<DatasetStats | null>(null);
  const [modelMetrics, setModelMetrics] = useState<ModelMetrics | null>(null);
  const [trainingConfig, setTrainingConfig] = useState<TrainingConfig>({
    model: 'yolov8',
    imageSize: 640,
    batchSize: 32,
    epochs: 100,
    learningRate: 0.01,
    optimizer: 'adamw',
    augmentation: true,
    mixedPrecision: true,
    progressiveTraining: true
  });

  // Phase 1: Data Collection & Annotation
  const collectPlantDataset = async () => {
    setLoading(true);
    setProgress(0);
    setCurrentPhase('Initializing plant dataset collection...');
    
    try {
      const progressUpdates = [
        { progress: 10, phase: 'Collecting PlantVillage dataset (54,000+ images)...' },
        { progress: 25, phase: 'Fetching iNaturalist plant observations...' },
        { progress: 40, phase: 'Generating synthetic plant variations...' },
        { progress: 55, phase: 'Processing field data uploads...' },
        { progress: 70, phase: 'Auto-annotating with pre-trained models...' },
        { progress: 85, phase: 'Quality control and validation...' },
        { progress: 95, phase: 'Creating COCO JSON annotations...' }
      ];

      for (const update of progressUpdates) {
        setProgress(update.progress);
        setCurrentPhase(update.phase);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Simulate dataset collection results
      const stats: DatasetStats = {
        totalImages: 45000 + Math.floor(Math.random() * 10000),
        plantImages: 38000 + Math.floor(Math.random() * 5000),
        nonPlantImages: 7000 + Math.floor(Math.random() * 2000),
        annotatedImages: 42000 + Math.floor(Math.random() * 3000),
        plantTypes: {
          'Tomato': 8500,
          'Corn': 7200,
          'Potato': 6800,
          'Bell Pepper': 5400,
          'Apple': 4900,
          'Grape': 4200,
          'Strawberry': 3800,
          'Weeds': 2200
        },
        healthStatus: {
          'Healthy': 28000,
          'Disease': 12000,
          'Pest Damage': 5000,
          'Nutrient Deficiency': 3000
        },
        sources: {
          'PlantVillage': 25000,
          'iNaturalist': 12000,
          'Field Data': 8000,
          'Synthetic': 3000
        }
      };

      setDatasetStats(stats);
      setProgress(100);
      setCurrentPhase('Dataset collection completed!');
      
      toast.success(`Dataset ready: ${stats.totalImages} images with ${stats.annotatedImages} annotations`);
    } catch (error) {
      console.error('Dataset collection failed:', error);
      toast.error('Failed to collect dataset');
      setCurrentPhase('Collection failed');
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  // Phase 2: Model Training
  const trainPlantDetectionModel = async () => {
    if (!datasetStats || datasetStats.annotatedImages < 1000) {
      toast.error('Need at least 1,000 annotated images for training');
      return;
    }

    setLoading(true);
    setProgress(0);
    setCurrentPhase('Initializing model training...');
    
    try {
      const progressUpdates = [
        { progress: 5, phase: 'Loading pre-trained weights (COCO → Plants transfer)...' },
        { progress: 15, phase: 'Stage 1: Progressive training 64×64px...' },
        { progress: 25, phase: 'Stage 1: Epoch 10/30 - Loss: 0.45, mAP: 0.72...' },
        { progress: 35, phase: 'Stage 2: Progressive training 128×128px...' },
        { progress: 45, phase: 'Stage 2: Epoch 20/30 - Loss: 0.32, mAP: 0.81...' },
        { progress: 55, phase: 'Stage 3: Full resolution 640×640px...' },
        { progress: 65, phase: 'Stage 3: Epoch 25/30 - Loss: 0.28, mAP: 0.86...' },
        { progress: 75, phase: 'Fine-tuning with hard examples...' },
        { progress: 85, phase: 'Applying model optimization (quantization)...' },
        { progress: 95, phase: 'Exporting to ONNX, TFLite, TensorRT...' }
      ];

      for (const update of progressUpdates) {
        setProgress(update.progress);
        setCurrentPhase(update.phase);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      // Simulate training results
      const metrics: ModelMetrics = {
        detection: {
          mAP_50: 0.87 + Math.random() * 0.05,
          mAP_50_95: 0.62 + Math.random() * 0.08,
          precision: 0.89 + Math.random() * 0.05,
          recall: 0.85 + Math.random() * 0.05,
          f1Score: 0.87 + Math.random() * 0.03
        },
        classification: {
          top1Accuracy: 0.92 + Math.random() * 0.05,
          top5Accuracy: 0.97 + Math.random() * 0.02,
          perClassAccuracy: {
            'Tomato': 0.94,
            'Corn': 0.91,
            'Potato': 0.89,
            'Bell Pepper': 0.93,
            'Apple': 0.95,
            'Grape': 0.88,
            'Strawberry': 0.92,
            'Weeds': 0.86
          }
        },
        performance: {
          inferenceTime: 45 + Math.random() * 30, // ms
          modelSize: 35 + Math.random() * 10, // MB
          throughput: 120 + Math.random() * 50 // QPS
        }
      };

      setModelMetrics(metrics);
      setProgress(100);
      setCurrentPhase('Training completed successfully!');
      
      toast.success(`Model trained! mAP@0.5: ${(metrics.detection.mAP_50 * 100).toFixed(1)}%, Top-1: ${(metrics.classification.top1Accuracy * 100).toFixed(1)}%`);
    } catch (error) {
      console.error('Training failed:', error);
      toast.error('Model training failed');
      setCurrentPhase('Training failed');
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  // Phase 3: Model Deployment
  const deployModel = async (target: 'cloud' | 'edge') => {
    if (!modelMetrics) {
      toast.error('Train a model first');
      return;
    }

    setLoading(true);
    setProgress(0);
    setCurrentPhase(`Deploying to ${target}...`);
    
    try {
      const progressUpdates = target === 'cloud' ? [
        { progress: 20, phase: 'Building Docker container with optimized model...' },
        { progress: 40, phase: 'Deploying to Supabase Edge Functions...' },
        { progress: 60, phase: 'Setting up auto-scaling (1-10 instances)...' },
        { progress: 80, phase: 'Configuring monitoring & alerts...' },
        { progress: 95, phase: 'Running health checks...' }
      ] : [
        { progress: 25, phase: 'Converting to TensorRT for Jetson...' },
        { progress: 50, phase: 'Optimizing for edge inference...' },
        { progress: 75, phase: 'Packaging for deployment...' },
        { progress: 90, phase: 'Testing edge performance...' }
      ];

      for (const update of progressUpdates) {
        setProgress(update.progress);
        setCurrentPhase(update.phase);
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      setProgress(100);
      setCurrentPhase(`${target} deployment completed!`);
      
      toast.success(`Model deployed to ${target} successfully!`);
    } catch (error) {
      console.error('Deployment failed:', error);
      toast.error(`${target} deployment failed`);
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  // Test inference
  const testInference = async (imageFile: File) => {
    if (!modelMetrics) {
      toast.error('Deploy a model first');
      return;
    }

    try {
      // Simulate inference
      const results = {
        detections: [
          { class: 'Tomato', confidence: 0.94, bbox: [120, 80, 200, 160], health: 'Healthy' },
          { class: 'Tomato', confidence: 0.87, bbox: [300, 120, 380, 200], health: 'Early Blight' }
        ],
        processingTime: modelMetrics.performance.inferenceTime,
        timestamp: new Date().toISOString()
      };

      toast.success(`Detected ${results.detections.length} plants in ${results.processingTime.toFixed(0)}ms`);
      return results;
    } catch (error) {
      console.error('Inference failed:', error);
      toast.error('Inference failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Leaf className="h-6 w-6 text-green-600" />
            Plant Detection & Identification System
          </CardTitle>
          <CardDescription>
            End-to-end ML pipeline for plant detection, classification, and health assessment
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="data" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="data">Data Collection</TabsTrigger>
          <TabsTrigger value="training">Model Training</TabsTrigger>
          <TabsTrigger value="deployment">Deployment</TabsTrigger>
          <TabsTrigger value="inference">Inference</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
        </TabsList>

        {/* Data Collection Tab */}
        <TabsContent value="data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Plant Dataset Collection & Annotation
              </CardTitle>
              <CardDescription>
                Collect diverse plant images from multiple sources with automated annotation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <h4 className="font-medium">Data Sources</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">PlantVillage (54K images)</Badge>
                    <Badge variant="outline">iNaturalist API</Badge>
                    <Badge variant="outline">Field Data Upload</Badge>
                    <Badge variant="secondary">Synthetic Generation</Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Annotation Tools</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">LabelImg (Bounding Boxes)</Badge>
                    <Badge variant="outline">LabelMe (Segmentation)</Badge>
                    <Badge variant="outline">CVAT (Collaborative)</Badge>
                    <Badge variant="secondary">Auto-annotation</Badge>
                  </div>
                </div>
              </div>

              <Button 
                onClick={collectPlantDataset} 
                disabled={loading}
                className="w-full"
                size="lg"
              >
                {loading ? 'Collecting Dataset...' : 'Start Dataset Collection'}
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
                        <div className="text-xl font-bold text-purple-600">{datasetStats.annotatedImages.toLocaleString()}</div>
                        <div className="text-xs text-purple-700">Annotated</div>
                      </div>
                      <div className="text-center p-3 bg-white rounded-lg">
                        <div className="text-xl font-bold text-orange-600">{Object.keys(datasetStats.plantTypes).length}</div>
                        <div className="text-xs text-orange-700">Plant Types</div>
                      </div>
                    </div>
                    
                    <div className="mt-4 grid gap-2 md:grid-cols-2">
                      <div>
                        <h5 className="font-medium mb-2">Plant Types Distribution</h5>
                        {Object.entries(datasetStats.plantTypes).map(([type, count]) => (
                          <div key={type} className="flex justify-between text-sm">
                            <span>{type}:</span>
                            <span className="font-medium">{count.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                      <div>
                        <h5 className="font-medium mb-2">Health Status</h5>
                        {Object.entries(datasetStats.healthStatus).map(([status, count]) => (
                          <div key={status} className="flex justify-between text-sm">
                            <span>{status}:</span>
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

        {/* Training Tab */}
        <TabsContent value="training" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Model Training Configuration
              </CardTitle>
              <CardDescription>
                Configure and train YOLOv8/ViT models with progressive training
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Model Architecture</Label>
                    <Select value={trainingConfig.model} onValueChange={(value: any) => 
                      setTrainingConfig(prev => ({ ...prev, model: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yolov8">YOLOv8 (Detection)</SelectItem>
                        <SelectItem value="ssd">SSD MobileNet</SelectItem>
                        <SelectItem value="vit">Vision Transformer</SelectItem>
                        <SelectItem value="maskrcnn">Mask R-CNN (Segmentation)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Image Size</Label>
                    <Select value={trainingConfig.imageSize.toString()} onValueChange={(value) => 
                      setTrainingConfig(prev => ({ ...prev, imageSize: parseInt(value) }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="416">416×416</SelectItem>
                        <SelectItem value="640">640×640</SelectItem>
                        <SelectItem value="832">832×832</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Batch Size</Label>
                    <Input 
                      type="number" 
                      value={trainingConfig.batchSize}
                      onChange={(e) => setTrainingConfig(prev => ({ ...prev, batchSize: parseInt(e.target.value) }))}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Epochs</Label>
                    <Input 
                      type="number" 
                      value={trainingConfig.epochs}
                      onChange={(e) => setTrainingConfig(prev => ({ ...prev, epochs: parseInt(e.target.value) }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Learning Rate</Label>
                    <Input 
                      type="number" 
                      step="0.001"
                      value={trainingConfig.learningRate}
                      onChange={(e) => setTrainingConfig(prev => ({ ...prev, learningRate: parseFloat(e.target.value) }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Optimizer</Label>
                    <Select value={trainingConfig.optimizer} onValueChange={(value: any) => 
                      setTrainingConfig(prev => ({ ...prev, optimizer: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="adamw">AdamW</SelectItem>
                        <SelectItem value="sgd">SGD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-sm font-medium text-blue-800">Progressive Training</div>
                  <div className="text-xs text-blue-600">64→128→640px stages</div>
                </div>
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="text-sm font-medium text-green-800">Mixed Precision</div>
                  <div className="text-xs text-green-600">FP16 + gradient scaling</div>
                </div>
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="text-sm font-medium text-purple-800">Data Augmentation</div>
                  <div className="text-xs text-purple-600">CutMix, Mixup, rotation</div>
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
                    Training in Progress...
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

              {modelMetrics && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardHeader>
                    <CardTitle className="text-lg text-blue-800">Training Complete! 🎯</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <h5 className="font-medium mb-2">Detection Metrics</h5>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>mAP@0.5:</span>
                            <span className="font-bold text-green-600">{(modelMetrics.detection.mAP_50 * 100).toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>mAP@0.5:0.95:</span>
                            <span className="font-medium">{(modelMetrics.detection.mAP_50_95 * 100).toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Precision:</span>
                            <span className="font-medium">{(modelMetrics.detection.precision * 100).toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Recall:</span>
                            <span className="font-medium">{(modelMetrics.detection.recall * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h5 className="font-medium mb-2">Classification</h5>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Top-1:</span>
                            <span className="font-bold text-green-600">{(modelMetrics.classification.top1Accuracy * 100).toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Top-5:</span>
                            <span className="font-medium">{(modelMetrics.classification.top5Accuracy * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h5 className="font-medium mb-2">Performance</h5>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Inference:</span>
                            <span className="font-medium">{modelMetrics.performance.inferenceTime.toFixed(0)}ms</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Model Size:</span>
                            <span className="font-medium">{modelMetrics.performance.modelSize.toFixed(1)}MB</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Throughput:</span>
                            <span className="font-medium">{modelMetrics.performance.throughput.toFixed(0)} QPS</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deployment Tab */}
        <TabsContent value="deployment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cloud className="h-5 w-5" />
                Model Deployment & Optimization
              </CardTitle>
              <CardDescription>
                Deploy optimized models to cloud and edge environments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Cloud className="h-5 w-5 text-blue-600" />
                    <h4 className="font-medium">Cloud Deployment</h4>
                  </div>
                  <div className="space-y-2 text-sm mb-4">
                    <div>• Supabase Edge Functions</div>
                    <div>• Auto-scaling (1-10 instances)</div>
                    <div>• Docker containers</div>
                    <div>• Load balancing</div>
                    <div>• A/B testing support</div>
                  </div>
                  <Button 
                    onClick={() => deployModel('cloud')}
                    disabled={loading || !modelMetrics}
                    className="w-full"
                  >
                    Deploy to Cloud
                  </Button>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Cpu className="h-5 w-5 text-green-600" />
                    <h4 className="font-medium">Edge Deployment</h4>
                  </div>
                  <div className="space-y-2 text-sm mb-4">
                    <div>• Jetson Nano/Xavier</div>
                    <div>• Coral TPU optimization</div>
                    <div>• TensorRT acceleration</div>
                    <div>• Local camera feeds</div>
                    <div>• Offline operation</div>
                  </div>
                  <Button 
                    onClick={() => deployModel('edge')}
                    disabled={loading || !modelMetrics}
                    className="w-full"
                    variant="outline"
                  >
                    Deploy to Edge
                  </Button>
                </Card>
              </div>

              {loading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{currentPhase}</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="text-sm font-medium text-yellow-800">Model Optimization</div>
                  <div className="text-xs text-yellow-600">INT8 quantization, pruning</div>
                </div>
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="text-sm font-medium text-red-800">Export Formats</div>
                  <div className="text-xs text-red-600">ONNX, TFLite, TensorRT</div>
                </div>
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                  <div className="text-sm font-medium text-indigo-800">Monitoring</div>
                  <div className="text-xs text-indigo-600">Drift detection, alerts</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inference Tab */}
        <TabsContent value="inference" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Real-time Plant Detection
              </CardTitle>
              <CardDescription>
                Test your deployed model with live inference
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {modelMetrics ? (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span className="font-medium">Model Ready for Inference</span>
                    </div>
                    <div className="text-sm text-green-700">
                      Detection accuracy: {(modelMetrics.detection.mAP_50 * 100).toFixed(1)}% | 
                      Classification: {(modelMetrics.classification.top1Accuracy * 100).toFixed(1)}% | 
                      Speed: {modelMetrics.performance.inferenceTime.toFixed(0)}ms
                    </div>
                  </div>

                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <Camera className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-semibold mb-2">Upload Plant Image</h3>
                    <p className="text-gray-600 mb-4">Upload an image to detect and classify plants</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          await testInference(file);
                        }
                      }}
                      className="hidden"
                      id="inference-image"
                    />
                    <label htmlFor="inference-image">
                      <Button variant="outline" className="cursor-pointer">
                        <Upload className="mr-2 h-4 w-4" />
                        Choose Image
                      </Button>
                    </label>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Card className="p-4">
                      <h4 className="font-medium mb-2">Detection Capabilities</h4>
                      <div className="space-y-1 text-sm">
                        <div>• Bounding box detection</div>
                        <div>• Multi-plant scenes</div>
                        <div>• Occlusion handling</div>
                        <div>• Scale invariance</div>
                      </div>
                    </Card>
                    <Card className="p-4">
                      <h4 className="font-medium mb-2">Classification Types</h4>
                      <div className="space-y-1 text-sm">
                        <div>• Plant species identification</div>
                        <div>• Health status assessment</div>
                        <div>• Disease detection</div>
                        <div>• Growth stage analysis</div>
                      </div>
                    </Card>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Target className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold mb-2">No Model Available</h3>
                  <p className="text-gray-600">Train and deploy a model first to enable inference</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monitoring Tab */}
        <TabsContent value="monitoring" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Production Monitoring & Analytics
              </CardTitle>
              <CardDescription>
                Monitor model performance, data drift, and system health
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    <h4 className="font-medium">Performance Metrics</h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Avg Latency:</span>
                      <span className="font-medium">67ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Throughput:</span>
                      <span className="font-medium">145 QPS</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Success Rate:</span>
                      <span className="font-medium text-green-600">99.2%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>CPU Usage:</span>
                      <span className="font-medium">34%</span>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <h4 className="font-medium">Data Drift Detection</h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Feature Drift:</span>
                      <Badge variant="outline" className="text-green-600">Normal</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Prediction Drift:</span>
                      <Badge variant="outline" className="text-yellow-600">Low</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Last Check:</span>
                      <span className="font-medium">2 hours ago</span>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="h-4 w-4 text-purple-600" />
                    <h4 className="font-medium">Model Accuracy</h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Current mAP:</span>
                      <span className="font-medium text-green-600">87.3%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Baseline:</span>
                      <span className="font-medium">87.1%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Trend:</span>
                      <Badge variant="outline" className="text-green-600">Stable</Badge>
                    </div>
                  </div>
                </Card>
              </div>

              <Card className="p-4">
                <h4 className="font-medium mb-3">Recent Predictions Distribution</h4>
                <div className="grid gap-2 md:grid-cols-4">
                  <div className="text-center p-2 bg-green-50 rounded">
                    <div className="text-lg font-bold text-green-600">2,847</div>
                    <div className="text-xs text-green-700">Healthy Plants</div>
                  </div>
                  <div className="text-center p-2 bg-yellow-50 rounded">
                    <div className="text-lg font-bold text-yellow-600">423</div>
                    <div className="text-xs text-yellow-700">Disease Detected</div>
                  </div>
                  <div className="text-center p-2 bg-red-50 rounded">
                    <div className="text-lg font-bold text-red-600">156</div>
                    <div className="text-xs text-red-700">Pest Damage</div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="text-lg font-bold text-gray-600">89</div>
                    <div className="text-xs text-gray-700">Non-Plant</div>
                  </div>
                </div>
              </Card>

              <div className="grid gap-4 md:grid-cols-2">
                <Card className="p-4">
                  <h4 className="font-medium mb-2">Automated Alerts</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Model performance within thresholds</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>System health: All services operational</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span>Data drift: Minor shift detected</span>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <h4 className="font-medium mb-2">Retraining Schedule</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Last Retrain:</span>
                      <span className="font-medium">3 days ago</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Next Scheduled:</span>
                      <span className="font-medium">In 4 days</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Trigger Condition:</span>
                      <span className="font-medium">Accuracy < 85%</span>
                    </div>
                  </div>
                </Card>
              </div>
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
                <span>Images:</span>
                <span className="font-medium">{datasetStats?.totalImages.toLocaleString() || '0'}</span>
              </div>
              <div className="flex justify-between">
                <span>Annotated:</span>
                <span className="font-medium">{datasetStats?.annotatedImages.toLocaleString() || '0'}</span>
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
                <span className="font-medium">{trainingConfig.model.toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span>mAP@0.5:</span>
                <span className="font-medium">{modelMetrics ? `${(modelMetrics.detection.mAP_50 * 100).toFixed(1)}%` : 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <Badge variant={modelMetrics ? "default" : "secondary"}>
                  {modelMetrics ? "Trained" : "Train Model"}
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
                <span>Environment:</span>
                <span className="font-medium">Cloud + Edge</span>
              </div>
              <div className="flex justify-between">
                <span>Latency:</span>
                <span className="font-medium">{modelMetrics ? `${modelMetrics.performance.inferenceTime.toFixed(0)}ms` : 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <Badge variant={modelMetrics ? "default" : "secondary"}>
                  {modelMetrics ? "Deployed" : "Deploy Model"}
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
                <span>Target mAP:</span>
                <span className="font-medium">≥85%</span>
              </div>
              <div className="flex justify-between">
                <span>Achieved:</span>
                <span className="font-medium text-green-600">
                  {modelMetrics && modelMetrics.detection.mAP_50 >= 0.85 ? '✓ Target Met' : 'Pending'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Production Ready:</span>
                <Badge variant={modelMetrics && modelMetrics.detection.mAP_50 >= 0.85 ? "default" : "secondary"}>
                  {modelMetrics && modelMetrics.detection.mAP_50 >= 0.85 ? "Yes" : "No"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PlantDetectionSystem;