import React, { useState } from "react";
import Dropzone from "react-dropzone";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface FileListState {
  plant: File[];
  nonPlant: File[];
}

const UploadZone = ({
  label,
  uploadUrl,
  files,
  setFiles,
}: {
  label: string;
  uploadUrl: string;
  files: File[];
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
}) => {
  const handleDrop = async (acceptedFiles: File[]) => {
    setFiles((prev) => [...prev, ...acceptedFiles]);

    const formData = new FormData();
    acceptedFiles.forEach((file) => formData.append("files", file));

    try {
      const res = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      toast.success(`${label} files uploaded successfully!`);
    } catch (err) {
      console.error(err);
      toast.error(`Failed to upload ${label} files`);
    }
  };

  return (
    <Dropzone onDrop={handleDrop} multiple>
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
  );
};

const AIEnhancedAnalysis: React.FC = () => {
  const [plantFiles, setPlantFiles] = useState<File[]>([]);
  const [nonPlantFiles, setNonPlantFiles] = useState<File[]>([]);
  const [training, setTraining] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);

  const handleTrain = async () => {
    setTraining(true);
    try {
      const res = await fetch("http://localhost:8000/train", { method: "POST" });
      const data = await res.json();
      setAccuracy(data.accuracy);
      toast.success(`Training complete! Accuracy: ${(data.accuracy * 100).toFixed(2)}%`);
    } catch (err) {
      console.error(err);
      toast.error("Training failed.");
    } finally {
      setTraining(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">🌱 Plant Detection AI System</h2>
      <p className="text-muted-foreground">
        Upload your dataset, train the model, and run predictions
      </p>

      {/* Upload Zones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <UploadZone
          label="🌱 Plant"
          uploadUrl="http://localhost:8000/upload/plant"
          files={plantFiles}
          setFiles={setPlantFiles}
        />
        <UploadZone
          label="🪨 Non-Plant"
          uploadUrl="http://localhost:8000/upload/non_plant"
          files={nonPlantFiles}
          setFiles={setNonPlantFiles}
        />
      </div>

      {/* Training Section */}
      <div className="text-center space-y-4">
        <Button
          onClick={handleTrain}
          disabled={training}
          className="px-8 py-2 text-lg"
        >
          {training ? "Training Model..." : "🚀 Start Training"}
        </Button>

        {accuracy !== null && (
          <p className="text-green-600 font-medium">
            ✅ Training complete! Accuracy: {(accuracy * 100).toFixed(2)}%
          </p>
        )}
      </div>
    </div>
  );
};

export default AIEnhancedAnalysis;
