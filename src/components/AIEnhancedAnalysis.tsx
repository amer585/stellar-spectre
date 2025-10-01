import { useState } from "react";
import Dropzone from "react-dropzone";

const UploadZone = ({ label, uploadUrl }: { label: string; uploadUrl: string }) => {
  const [files, setFiles] = useState<File[]>([]);

  const handleDrop = async (acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles]);

    const formData = new FormData();
    acceptedFiles.forEach(file => formData.append("files", file));

    await fetch(uploadUrl, {
      method: "POST",
      body: formData,
    });
    alert(`${label} files uploaded!`);
  };

  return (
    <Dropzone onDrop={handleDrop} multiple>
      {({ getRootProps, getInputProps }) => (
        <div
          {...getRootProps()}
          className="border-2 border-dashed p-6 text-center cursor-pointer rounded-md hover:bg-gray-50"
        >
          <input {...getInputProps()} />
          <p>Drop {label} images or ZIPs here</p>
          <ul>
            {files.map(f => (
              <li key={f.name}>{f.name}</li>
            ))}
          </ul>
        </div>
      )}
    </Dropzone>
  );
};

export default function DatasetUploader() {
  return (
    <div className="grid grid-cols-2 gap-4">
      <UploadZone label="🌱 Plant" uploadUrl="http://localhost:8000/upload/plant" />
      <UploadZone label="🪨 Non-Plant" uploadUrl="http://localhost:8000/upload/non_plant" />
    </div>
  );
}
