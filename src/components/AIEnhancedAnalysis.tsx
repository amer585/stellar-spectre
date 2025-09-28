import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Types
interface PlantDatasetStats {
  totalImages: number;
  plantImages: number;
  nonPlantImages: number;
  sources: Record<string, number>;
  plantTypes: Record<string, number>;
}

interface ModelEvaluation {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  confusionMatrix: number[][];
  trainingAccuracy?: number;
  validationAccuracy?: number;
  auc?: number;
}

interface TrainingResult {
  modelId: string;
  endpointUrl?: string;
  evaluation: ModelEvaluation;
  trainingHistory?: any[];
  config?: any;
  modelFormats?: { onnx?: string; tensorflow?: string };
}

interface AIEnhancedAnalysisProps {
  userId: string;
}

const defaultStats: PlantDatasetStats = {
  totalImages: 0,
  plantImages: 0,
  nonPlantImages: 0,
  sources: {},
  plantTypes: {},
};

const AIEnhancedAnalysis: React.FC<AIEnhancedAnalysisProps> = ({ userId }) => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [datasetStats, setDatasetStats] = useState<PlantDatasetStats | null>(null);
  const [trainingResult, setTrainingResult] = useState<TrainingResult | null>(null);
  const [currentPhase, setCurrentPhase] = useState<string>('');

  const [targetImageCount, setTargetImageCount] = useState<number>(35000);
  const [modelArchitecture, setModelArchitecture] = useState<string>('efficientnet');
  const [imageSize, setImageSize] = useState<number>(224);
  const [batchSize, setBatchSize] = useState<number>(32);
  const [epochs, setEpochs] = useState<number>(50);
  const [learningRate, setLearningRate] = useState<number>(0.001);

  const { toast } = useToast();

  // Helper: safe invoke of Supabase Edge function
  const invokeEdgeFunction = useCallback(async (name: string, body: any) => {
    try {
      const res = await supabase.functions.invoke(name, { body });
      // supabase.functions.invoke returns { data, error }
      // typings differ between SDK versions
      // we handle both shapes
      // @ts-ignore
      if (res.error) throw res.error;
      // @ts-ignore
      return res.data;
    } catch (err) {
      throw err;
    }
  }, []);

  // Collect dataset
  const collectPlantDataset = useCallback(async () => {
    setLoading(true);
    setProgress(5);
    setCurrentPhase('Initializing plant dataset collection...');
    try {
      const body = {
        action: 'collect-dataset',
        userId,
        targetCount: targetImageCount,
      };
      const data = await invokeEdgeFunction('plant-dataset-collector', body);
      // assume data.stats exists
      if (data?.stats) {
        setDatasetStats({ ...defaultStats, ...data.stats });
      }
      setProgress(100);
      setCurrentPhase('Plant dataset collection completed!');
      toast({
        title: 'Plant Dataset Collection Complete',
        description: `Collected ${data?.stats?.totalImages ?? 0} images`,
      });
    } catch (err) {
      console.error('collectPlantDataset error', err);
      toast({ title: 'Error', description: 'Failed to collect dataset', variant: 'destructive' });
      setCurrentPhase('Collection failed');
    } finally {
      setLoading(false);
      setProgress(0);
    }
  }, [invokeEdgeFunction, targetImageCount, toast, userId]);

  // Train model
  const trainPlantDetectionModel = useCallback(async () => {
    if (!datasetStats || datasetStats.totalImages < 1000) {
      toast({ title: 'Insufficient Data', description: 'Collect more images before training', variant: 'destructive' });
      return;
    }
    setLoading(true);
    setProgress(0);
    setCurrentPhase('Initializing training...');
    try {
      const config = {
        modelArchitecture,
        imageSize,
        batchSize,
        epochs,
        learningRate,
      };

      // Simulate progress updates (replace with real streaming if available)
      const phases = [
        { p: 10, t: 'Loading & preprocessing...' },
        { p: 30, t: 'Starting training...' },
        { p: 60, t: 'Fine tuning...' },
        { p: 80, t: 'Validating...' },
        { p: 95, t: 'Exporting & deploying...' },
      ];

      for (const s of phases) {
        setProgress(s.p);
        setCurrentPhase(s.t);
        // small delay so UI shows progress
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 800));
      }

      const body = { action: 'train-model', userId, config };
      const data = await invokeEdgeFunction('plant-model-trainer', body);
      if (data) {
        setTrainingResult(data as TrainingResult);
        setProgress(100);
        setCurrentPhase('Training completed');
        toast({ title: 'Training completed', description: `Accuracy: ${(data.evaluation?.accuracy ?? 0) * 100}%` });
      }
    } catch (err) {
      console.error('trainPlantDetectionModel error', err);
      toast({ title: 'Error', description: 'Failed to train model', variant: 'destructive' });
      setCurrentPhase('Training failed');
    } finally {
      setLoading(false);
      setProgress(0);
    }
  }, [datasetStats, invokeEdgeFunction, userId, modelArchitecture, imageSize, batchSize, epochs, learningRate, toast]);

  // Test model
  const testPlantModel = useCallback(async (imageFile: File) => {
    setLoading(true);
    setCurrentPhase('Processing image...');
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(String(reader.result ?? ''));
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(imageFile);
      });
      const base64Image = await base64Promise;
      const body = { action: 'inference', userId, imageData: base64Image };
      const data = await invokeEdgeFunction('plant-model-trainer', body);

      const isPlant = Boolean(data?.isPlant);
      const confidence = Number(data?.confidence ?? 0);

      toast({
        title: 'Inference Result',
        description: `${isPlant ? 'Plant' : 'Non-Plant'} detected — ${ (confidence * 100).toFixed(1) }%`,
      });
      return { isPlant, confidence };
    } catch (err) {
      console.error('testPlantModel error', err);
      toast({ title: 'Error', description: 'Inference failed', variant: 'destructive' });
    } finally {
      setLoading(false);
      setCurrentPhase('');
    }
    return null;
  }, [invokeEdgeFunction, userId, toast]);

  // Download model
  const downloadModel = useCallback(async (format: 'onnx' | 'tensorflow') => {
    if (!trainingResult) {
      toast({ title: 'No Model', description: 'Train a model first', variant: 'destructive' });
      return;
    }
    try {
      const body = { action: 'download-model', userId, format, modelId: trainingResult.modelId };
      const data = await invokeEdgeFunction('plant-model-trainer', body);

      // data.modelData is assumed to be base64 or binary array
      const modelDataBase64 = data?.modelData ?? null;
      if (!modelDataBase64) throw new Error('No model data returned');

      // If base64 string, convert to blob
      const byteCharacters = atob(modelDataBase64);
      const byteNumbers = new Array(byteCharacters.length);
      // eslint-disable-next-line no-plusplus
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `model_${trainingResult.modelId}.${format === 'onnx' ? 'onnx' : 'pb'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: 'Downloaded', description: `Downloaded ${format.toUpperCase()} model` });
    } catch (err) {
      console.error('downloadModel error', err);
      toast({ title: 'Error', description: 'Failed to download model', variant: 'destructive' });
    }
  }, [invokeEdgeFunction, trainingResult, userId, toast]);

  // Small optimization: memoize some computed values
  const plantRatio = useMemo(() => {
    if (!datasetStats || datasetStats.totalImages === 0) return 0;
    return Math.round((datasetStats.plantImages / datasetStats.totalImages) * 100);
  }, [datasetStats]);

  return (
    <div className="ai-enhanced-analysis container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-2">Plant Detection AI System</h1>
      <p className="text-sm text-muted-foreground mb-4">Binary classifier for plant vs non-plant using transfer learning.</p>

      <Tabs value="dataset" className="mb-6">
        <TabsList>
          <TabsTrigger value="dataset">Dataset Collection</TabsTrigger>
          <TabsTrigger value="train">Model Training</TabsTrigger>
          <TabsTrigger value="test">Testing</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
        </TabsList>

        <TabsContent value="dataset">
          <Card>
            <CardHeader>
              <CardTitle>Plant Dataset Collection</CardTitle>
              <CardDescription>Collect images from multiple sources for robust training</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm">Target Dataset Size</label>
                  <Select value={String(targetImageCount)} onValueChange={(v) => setTargetImageCount(parseInt(v, 10))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15000">15,000</SelectItem>
                      <SelectItem value="25000">25,000</SelectItem>
                      <SelectItem value="35000">35,000</SelectItem>
                      <SelectItem value="50000">50,000</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Button onClick={collectPlantDataset} disabled={loading}>{loading ? 'Collecting...' : 'Start Collection'}</Button>
                </div>

                {loading && currentPhase && (
                  <div className="text-sm">{currentPhase} — {progress}%</div>
                )}

                {datasetStats && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div>Total Images: {datasetStats.totalImages.toLocaleString()}</div>
                    <div>Plant Images: {datasetStats.plantImages.toLocaleString()}</div>
                    <div>Non-Plant Images: {datasetStats.nonPlantImages.toLocaleString()}</div>
                    <div>Plant Ratio: {plantRatio}%</div>
                    <div>Sources:</div>
                    <div>
                      {Object.entries(datasetStats.sources).map(([s, c]) => (
                        <div key={s}>{s}: {c.toLocaleString()}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="train">
          <Card>
            <CardHeader>
              <CardTitle>Model Training</CardTitle>
              <CardDescription>Configure and start training</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm">Model Architecture</label>
                  <Select value={modelArchitecture} onValueChange={(v) => setModelArchitecture(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="efficientnet">EfficientNet</SelectItem>
                      <SelectItem value="resnet50">ResNet-50</SelectItem>
                      <SelectItem value="vit">Vision Transformer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm">Input Size</label>
                  <Select value={String(imageSize)} onValueChange={(v) => setImageSize(parseInt(v, 10))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="224">224</SelectItem>
                      <SelectItem value="256">256</SelectItem>
                      <SelectItem value="384">384</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm">Batch Size</label>
                  <Input type="number" value={String(batchSize)} onChange={(e) => setBatchSize(Number(e.target.value))} min={8} max={256} />
                </div>

                <div>
                  <label className="block text-sm">Epochs</label>
                  <Input type="number" value={String(epochs)} onChange={(e) => setEpochs(Number(e.target.value))} min={1} max={500} />
                </div>

                <div>
                  <label className="block text-sm">Learning Rate</label>
                  <Input type="number" value={String(learningRate)} onChange={(e) => setLearningRate(Number(e.target.value))} step={0.0001} />
                </div>

                <div>
                  <Button onClick={trainPlantDetectionModel} disabled={loading}>{loading ? 'Training...' : 'Start Training'}</Button>
                </div>

                {loading && currentPhase && (
                  <div className="text-sm">{currentPhase} — {progress}%</div>
                )}

                {trainingResult && (
                  <div className="mt-4 text-sm">
                    <div>Accuracy: {(trainingResult.evaluation.accuracy * 100).toFixed(2)}%</div>
                    <div>F1-Score: {(trainingResult.evaluation.f1Score * 100).toFixed(2)}%</div>
                    <div>Model ID: {trainingResult.modelId}</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test">
          <Card>
            <CardHeader>
              <CardTitle>Testing & Inference</CardTitle>
              <CardDescription>Run inference on a single image</CardDescription>
            </CardHeader>
            <CardContent>
              {trainingResult ? (
                <div className="space-y-3">
                  <p className="text-sm">Model ready — Accuracy: {(trainingResult.evaluation.accuracy * 100).toFixed(1)}%</p>
                  <input
                    type="file"
                    accept="image/*"
                    id="test-image"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) await testPlantModel(file);
                    }}
                    className="hidden"
                  />
                  <label htmlFor="test-image">
                    <Button>Choose Image</Button>
                  </label>
                </div>
              ) : (
                <p className="text-sm">Train a model first to test</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export">
          <Card>
            <CardHeader>
              <CardTitle>Export</CardTitle>
              <CardDescription>Download trained model files</CardDescription>
            </CardHeader>
            <CardContent>
              {trainingResult ? (
                <div className="space-y-2">
                  <Button onClick={() => downloadModel('onnx')}>Download ONNX</Button>
                  <Button onClick={() => downloadModel('tensorflow')}>Download TF</Button>
                </div>
              ) : (
                <p className="text-sm">Train a model first to export</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Dataset Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div>Total Images: {datasetStats?.totalImages?.toLocaleString() ?? 0}</div>
            <div>Plant Images: {datasetStats?.plantImages?.toLocaleString() ?? 0}</div>
            <div>Non-Plant: {datasetStats?.nonPlantImages?.toLocaleString() ?? 0}</div>
            <div>Plant Ratio: {plantRatio}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Model Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div>Architecture: {modelArchitecture.toUpperCase()}</div>
            <div>Accuracy: {trainingResult ? `${(trainingResult.evaluation.accuracy * 100).toFixed(1)}%` : 'N/A'}</div>
            <div>Status: {trainingResult ? 'Trained' : 'Not trained'}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AIEnhancedAnalysis;
