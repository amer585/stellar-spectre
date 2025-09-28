import React, { useState } from "react";
import { createClient } from "@supabase/supabase-js";

// --- Setup Supabase client ---
const supabaseUrl = "https://yjpuugbijzkrzahfamqn.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqcHV1Z2JpanprcnphaGZhbXFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NTE1NDcsImV4cCI6MjA3NDIyNzU0N30.fJk8XEE35KCKkkPbuoYBzMegcluXYC2FjeCHUiKYzt4";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const PlantDetectionSystem: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUploadAndAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Upload file to Supabase Storage
      const filePath = `${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("plant-datasets")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Get public URL
      const { data } = supabase.storage
        .from("plant-datasets")
        .getPublicUrl(filePath);

      const imageUrl = data.publicUrl;

      // 3. Call Edge Function
      const response = await fetch(
        "https://yjpuugbijzkrzahfamqn.supabase.co/functions/v1/plant-detect",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl }),
        }
      );

      const analysis = await response.json();
      setResult(analysis);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px", background: "#111", color: "#fff" }}>
      <h2>🌱 Plant Detection System</h2>
      <input type="file" accept="image/*" onChange={handleFileChange} />
      <button
        onClick={handleUploadAndAnalyze}
        disabled={loading || !file}
        style={{
          marginLeft: "10px",
          padding: "8px 16px",
          borderRadius: "8px",
          cursor: "pointer",
        }}
      >
        {loading ? "Analyzing..." : "Upload & Analyze"}
      </button>

      {error && <p style={{ color: "red" }}>❌ {error}</p>}

      {result && (
        <div style={{ marginTop: "20px" }}>
          <p>
            <strong>Species:</strong> {result.species}
          </p>
          <p>
            <strong>Health:</strong> {result.health}
          </p>
          <p>
            <strong>Confidence:</strong> {result.confidence.toFixed(2)}%
          </p>
          <p>
            <strong>Analyzed URL:</strong> {result.analyzedUrl}
          </p>
        </div>
      )}
    </div>
  );
};

export default PlantDetectionSystem;
