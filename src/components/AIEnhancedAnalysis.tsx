import React, { useState } from "react";
import Dropzone from "react-dropzone";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink, Leaf } from "lucide-react";

const SUPABASE_URL = "https://yjpuugbijzkrzahfamqn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqcHV1Z2JpanprcnphaGZhbXFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NTE1NDcsImV4cCI6MjA3NDIyNzU0N30.fJk8XEE35KCKkkPbuoYBzMegcluXYC2FjeCHUiKYzt4";

interface FileListState {
  plant: File[];
  nonPlant: File[];
}

const UploadZone = ({
  label,
  category,
  files,
  setFiles,
  exampleLink,
}: {
  label: string;
  category: 'plant' | 'non_plant';
  files: File[];
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
  exampleLink?: string;
}) => {
  const handleDrop = async (acceptedFiles: File[]) => {
    setFiles((prev) => [...prev, ...acceptedFiles]);

    try {
      for (const file of acceptedFiles) {
        const path = `${category}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('plant-datasets')
          .upload(path, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast.error(`Failed to upload ${file.name}`);
        }
      }
      toast.success(`${label} files uploaded successfully!`);
    } catch (err) {
      console.error(err);
      toast.error(`Failed to upload ${label} files`);
    }
  };

  return (
    <div className="space-y-3">
      {exampleLink && (
        <a
          href={exampleLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
        >
          <Leaf className="h-4 w-4" />
          {category === 'plant' ? 'Plant Images Generator' : 'Non-Plant Images Generator'}
        </a>
      )}
      <Dropzone onDrop={handleDrop} multiple accept={{'image/*': [], 'application/zip': []}}>
        {({ getRootProps, getInputProps }) => (
          <div
            {...getRootProps()}
            className="border-2 border-dashed p-6 rounded-lg text-center cursor-pointer hover:bg-accent/50 transition"
          >
            <input {...getInputProps()} />
            <p className="font-medium">
              Drop {label} images or ZIPs here, or click to select
            </p>
            <ul className="mt-2 text-sm text-muted-foreground max-h-24 overflow-y-auto">
              {files.map((f, i) => (
                <li key={i}>{f.name}</li>
              ))}
            </ul>
          </div>
        )}
      </Dropzone>
    </div>
  );
};

const AIEnhancedAnalysis: React.FC = () => {
  const [plantFiles, setPlantFiles] = useState<File[]>([]);
  const [nonPlantFiles, setNonPlantFiles] = useState<File[]>([]);
  const [training, setTraining] = useState(false);
  const [metrics, setMetrics] = useState<any>(null);

  const handleTrain = async () => {
    setTraining(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Please sign in to train models");
        return;
      }

      const response = await fetch(`${SUPABASE_URL}/functions/v1/plant-ml-pipeline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'train-model',
          userId: user.id,
          config: {
            model: 'yolov8',
            imageSize: 640,
            batchSize: 16,
            epochs: 50,
            learningRate: 0.001,
            optimizer: 'adamw'
          }
        })
      });

      const data = await response.json();

      if (data.success) {
        setMetrics(data.metrics);
        toast.success(`Training complete! mAP@0.5: ${(data.metrics.detection.mAP_50 * 100).toFixed(1)}%`);
      } else {
        throw new Error(data.error || 'Training failed');
      }
    } catch (err) {
      console.error(err);
      toast.error(`Training failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setTraining(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Plant Detection AI System</h2>
      <p className="text-muted-foreground">
        Upload your dataset, train the model, and run predictions
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <UploadZone
          label="Plant Images"
          category="plant"
          files={plantFiles}
          setFiles={setPlantFiles}
          exampleLink="https://g.co/gemini/share/28a947d1c9b4"
        />
        <UploadZone
          label="Non-Plant Images"
          category="non_plant"
          files={nonPlantFiles}
          setFiles={setNonPlantFiles}
          exampleLink="https://g.co/gemini/share/f8aad9452f8c"
        />
      </div>

      <div className="text-center space-y-4">
        <Button
          onClick={handleTrain}
          disabled={training}
          className="px-8 py-2 text-lg"
        >
          {training ? "Training Model..." : "Start Training"}
        </Button>

        {metrics && (
          <div className="text-left bg-accent/50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Training Results</h3>
            <ul className="space-y-1 text-sm">
              <li>mAP@0.5: {(metrics.detection.mAP_50 * 100).toFixed(1)}%</li>
              <li>Precision: {(metrics.detection.precision * 100).toFixed(1)}%</li>
              <li>Recall: {(metrics.detection.recall * 100).toFixed(1)}%</li>
              <li>Inference Time: {metrics.performance.inferenceTime.toFixed(0)}ms</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIEnhancedAnalysis;
