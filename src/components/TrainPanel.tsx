import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Upload, Play, Square, Download, Package, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import JSZip from 'jszip';

const BACKEND_URL = 'http://localhost:8000';

interface TrainingStatus {
  status: string;
  epoch?: number;
  last_loss?: number;
  last_val_loss?: number;
  device?: string;
  classes?: string[];
}

interface ModelInfo {
  name: string;
  path: string;
  size: number;
}

export function TrainPanel() {
  const [adminToken, setAdminToken] = useState('changeme');
  const [preparingDataset, setPreparingDataset] = useState(false);
  const [dataDir, setDataDir] = useState('');
  
  const [epochs, setEpochs] = useState(10);
  const [batchSize, setBatchSize] = useState(16);
  const [imgSize, setImgSize] = useState(224);
  
  const [trainingStatus, setTrainingStatus] = useState<TrainingStatus>({ status: 'idle' });
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');

  useEffect(() => {
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/status`);
      const data = await response.json();
      setTrainingStatus(data);
    } catch (error) {
      // Backend not running
    }
  };

  const fetchModels = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/models`);
      const data = await response.json();
      setModels(data.models || []);
    } catch (error) {
      // Backend not running
    }
  };

  const prepareDatasetFromStorage = async () => {
    setPreparingDataset(true);
    toast.info('Downloading images from Supabase Storage...');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in first');
        return;
      }

      // List all files in plant-datasets bucket
      const { data: plantFiles, error: plantError } = await supabase.storage
        .from('plant-datasets')
        .list('plant', { limit: 10000 });

      const { data: nonPlantFiles, error: nonPlantError } = await supabase.storage
        .from('plant-datasets')
        .list('non_plant', { limit: 10000 });

      if (plantError || nonPlantError) {
        throw new Error('Failed to list files from storage');
      }

      const totalFiles = (plantFiles?.length || 0) + (nonPlantFiles?.length || 0);
      if (totalFiles === 0) {
        toast.error('No images found in storage. Please upload images first.');
        return;
      }

      toast.info(`Found ${totalFiles} images. Creating dataset...`);

      // Create ZIP file with proper structure
      const zip = new JSZip();
      const trainFolder = zip.folder('train');
      const valFolder = zip.folder('val');

      // Download and add plant images
      if (plantFiles && plantFiles.length > 0) {
        const plantTrainCount = Math.floor(plantFiles.length * 0.8);
        
        for (let i = 0; i < plantFiles.length; i++) {
          const file = plantFiles[i];
          const { data, error } = await supabase.storage
            .from('plant-datasets')
            .download(`plant/${file.name}`);

          if (!error && data) {
            const folder = i < plantTrainCount ? trainFolder : valFolder;
            folder?.folder('plant')?.file(file.name, data);
          }

          if (i % 10 === 0) {
            toast.info(`Processing plant images: ${i}/${plantFiles.length}`);
          }
        }
      }

      // Download and add non-plant images
      if (nonPlantFiles && nonPlantFiles.length > 0) {
        const nonPlantTrainCount = Math.floor(nonPlantFiles.length * 0.8);
        
        for (let i = 0; i < nonPlantFiles.length; i++) {
          const file = nonPlantFiles[i];
          const { data, error } = await supabase.storage
            .from('plant-datasets')
            .download(`non_plant/${file.name}`);

          if (!error && data) {
            const folder = i < nonPlantTrainCount ? trainFolder : valFolder;
            folder?.folder('non_plant')?.file(file.name, data);
          }

          if (i % 10 === 0) {
            toast.info(`Processing non-plant images: ${i}/${nonPlantFiles.length}`);
          }
        }
      }

      toast.info('Generating ZIP file...');
      const zipBlob = await zip.generateAsync({ type: 'blob' });

      // Upload ZIP to backend
      toast.info('Uploading dataset to training server...');
      const formData = new FormData();
      formData.append('file', zipBlob, 'plant_dataset.zip');

      const response = await fetch(`${BACKEND_URL}/upload-zip`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      setDataDir(result.data_dir);
      toast.success('Dataset prepared successfully!');

    } catch (error) {
      console.error('Dataset preparation error:', error);
      toast.error('Failed to prepare dataset. Make sure the backend is running.');
    } finally {
      setPreparingDataset(false);
    }
  };

  const handleStartTraining = async () => {
    if (!dataDir) {
      toast.error('Please prepare the dataset first');
      return;
    }

    const formData = new FormData();
    formData.append('data_dir', dataDir);
    formData.append('epochs', epochs.toString());
    formData.append('batch_size', batchSize.toString());
    formData.append('img_size', imgSize.toString());

    try {
      const response = await fetch(`${BACKEND_URL}/train`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: formData,
      });
      const data = await response.json();
      if (data.status === 'started') {
        toast.success('Real PyTorch training started!');
      } else if (data.status === 'busy') {
        toast.info('Training already in progress');
      }
    } catch (error) {
      toast.error('Failed to start training. Is the backend running?');
    }
  };

  const handleStopTraining = async () => {
    try {
      await fetch(`${BACKEND_URL}/stop`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      toast.success('Training stopped');
    } catch (error) {
      toast.error('Failed to stop training');
    }
  };

  const handleExport = async (format: 'torchscript' | 'onnx') => {
    const formData = new FormData();
    formData.append('format', format);

    try {
      const response = await fetch(`${BACKEND_URL}/export`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: formData,
      });
      const data = await response.json();
      toast.success(`Model exported: ${format.toUpperCase()}`);
      fetchModels();
    } catch (error) {
      toast.error('Failed to export model');
    }
  };

  const handleDownload = (path: string) => {
    window.open(`${BACKEND_URL}/download/?path=${encodeURIComponent(path)}`, '_blank');
  };

  const progress = trainingStatus.epoch ? (trainingStatus.epoch / epochs) * 100 : 0;
  const isBackendRunning = trainingStatus.status !== 'idle' || trainingStatus.device;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Real PyTorch Training</h1>
          <p className="text-muted-foreground">Train custom plant detection models with real PyTorch backend</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`h-3 w-3 rounded-full ${isBackendRunning ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm">{isBackendRunning ? 'Backend Online' : 'Backend Offline'}</span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Backend Configuration</CardTitle>
          <CardDescription>Connect to your PyTorch training server</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Admin Token</Label>
            <Input
              type="password"
              placeholder="Enter admin token (default: changeme)"
              value={adminToken}
              onChange={(e) => setAdminToken(e.target.value)}
            />
          </div>
          <div className="text-sm text-muted-foreground">
            Backend URL: {BACKEND_URL}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Step 1: Prepare Dataset</CardTitle>
          <CardDescription>Download images from Supabase Storage and prepare training dataset</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={prepareDatasetFromStorage}
            disabled={preparingDataset || !isBackendRunning}
            className="w-full"
          >
            {preparingDataset ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Preparing Dataset...
              </>
            ) : (
              <>
                <Package className="mr-2 h-4 w-4" />
                Prepare Dataset from Storage
              </>
            )}
          </Button>
          {dataDir && (
            <p className="text-sm text-muted-foreground">
              ✓ Dataset ready at: {dataDir}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Step 2: Configure Training</CardTitle>
          <CardDescription>Set hyperparameters for real PyTorch training</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Epochs</Label>
              <Input
                type="number"
                value={epochs}
                onChange={(e) => setEpochs(Number(e.target.value))}
                min={1}
                max={100}
              />
            </div>
            <div className="space-y-2">
              <Label>Batch Size</Label>
              <Input
                type="number"
                value={batchSize}
                onChange={(e) => setBatchSize(Number(e.target.value))}
                min={1}
                max={128}
              />
            </div>
            <div className="space-y-2">
              <Label>Image Size</Label>
              <Input
                type="number"
                value={imgSize}
                onChange={(e) => setImgSize(Number(e.target.value))}
                min={32}
                max={512}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleStartTraining}
              disabled={trainingStatus.status === 'training' || !dataDir || !isBackendRunning}
              className="flex-1"
            >
              <Play className="mr-2 h-4 w-4" />
              Start Real Training
            </Button>
            <Button
              onClick={handleStopTraining}
              variant="destructive"
              disabled={trainingStatus.status !== 'training'}
            >
              <Square className="mr-2 h-4 w-4" />
              Stop
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Training Status</CardTitle>
          <CardDescription>Real-time PyTorch training progress</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Status: {trainingStatus.status}</span>
              <span>Device: {trainingStatus.device || 'N/A'}</span>
            </div>
            {trainingStatus.status === 'training' && (
              <>
                <Progress value={progress} className="h-2" />
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>Epoch: {trainingStatus.epoch}/{epochs}</div>
                  <div>Train Loss: {trainingStatus.last_loss?.toFixed(4) || 'N/A'}</div>
                  <div>Val Loss: {trainingStatus.last_val_loss?.toFixed(4) || 'N/A'}</div>
                  <div>Classes: {trainingStatus.classes?.length || 0}</div>
                </div>
              </>
            )}
            {trainingStatus.status === 'finished' && (
              <div className="text-sm text-green-600 font-medium">
                ✓ Training completed successfully!
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Export Trained Model</CardTitle>
          <CardDescription>Export to TorchScript or ONNX format</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              onClick={() => handleExport('torchscript')}
              disabled={trainingStatus.status === 'idle'}
            >
              <Download className="mr-2 h-4 w-4" />
              Export TorchScript (.pt)
            </Button>
            <Button
              onClick={() => handleExport('onnx')}
              disabled={trainingStatus.status === 'idle'}
            >
              <Download className="mr-2 h-4 w-4" />
              Export ONNX
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Available Models</CardTitle>
          <CardDescription>Download your trained models</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {models.length === 0 ? (
            <p className="text-sm text-muted-foreground">No models available yet. Train a model first.</p>
          ) : (
            <div className="space-y-2">
              {models.map((model) => (
                <div
                  key={model.path}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent"
                >
                  <div className="text-sm">
                    <div className="font-medium">{model.name}</div>
                    <div className="text-muted-foreground">
                      {(model.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownload(model.path)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
