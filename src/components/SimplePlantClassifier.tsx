import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Loader2 } from "lucide-react";

export const SimplePlantClassifier = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("https://placehold.co/400x250/1e293b/a5b4fc?text=Upload+Data");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const handleFileSelect = (file: File) => {
    if (file.size > 20 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 20MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    setImageUrl("");
    setResult(null);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleFileSelect(file);
    }
  };

  const handleUrlChange = (url: string) => {
    setImageUrl(url);
    if (url) {
      setSelectedFile(null);
      setPreviewUrl(url);
      setResult(null);
    } else {
      setPreviewUrl("https://placehold.co/400x250/1e293b/a5b4fc?text=Upload+Data");
    }
  };

  const analyzeImage = async () => {
    if (!selectedFile && !imageUrl) {
      toast({
        title: "No image provided",
        description: "Please select an image file or paste an image URL",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    setResult(null);

    try {
      let imageData: { imageBase64?: string; imageUrl?: string } = {};

      if (selectedFile) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
          };
          reader.readAsDataURL(selectedFile);
        });
        imageData.imageBase64 = await base64Promise;
      } else {
        imageData.imageUrl = imageUrl;
      }

      const { data, error } = await supabase.functions.invoke('simple-plant-classifier', {
        body: imageData
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Classification failed');
      }

      setResult(data.classification);

    } catch (error: any) {
      console.error('Classification error:', error);
      toast({
        title: "Classification failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
      setResult("ERROR");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getResultClass = () => {
    if (result === 'PLANT') return 'text-green-400';
    if (result === 'NOT A PLANT') return 'text-red-400';
    if (result === 'UNCERTAIN') return 'text-yellow-400';
    if (result === 'ERROR') return 'text-red-500';
    return 'text-muted-foreground';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <header className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-2xl p-6 text-white">
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-2">
            Stellar Spectre Plant Classifier
          </h1>
          <p className="text-indigo-100">
            Upload an image for immediate, focused classification.
          </p>
        </header>

        {/* Main Card */}
        <Card className="bg-slate-800 border-slate-700 shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-slate-100 mb-6 flex items-center gap-3">
            <Upload className="w-7 h-7 text-indigo-400" />
            Data Drop Portal
          </h2>

          <div className="space-y-6">
            {/* File Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                flex flex-col items-center justify-center
                w-full h-40 p-4
                border-3 border-dashed rounded-xl
                cursor-pointer transition-all duration-200
                ${isDragging 
                  ? 'border-indigo-400 bg-slate-700 shadow-xl' 
                  : 'border-slate-600 bg-slate-900 hover:bg-slate-700 hover:border-indigo-500'
                }
              `}
              onClick={() => document.getElementById('fileInput')?.click()}
            >
              <Upload className="w-8 h-8 mb-2 text-indigo-400" />
              <span className="font-bold text-lg text-slate-100">
                Click or Drag Image Data Here
              </span>
              <span className="text-sm text-slate-400">
                PNG, JPG, or WebP. Max 20MB.
              </span>
              <input
                id="fileInput"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">OR</span>
              <hr className="flex-grow border-slate-700" />
            </div>

            {/* URL Input */}
            <Input
              placeholder="Paste Image URL (Optional)"
              value={imageUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              className="bg-slate-900 border-slate-700 text-slate-100 focus:border-indigo-500"
            />

            <p className="text-center text-sm text-slate-400 italic">
              Processing Protocol: Check for <strong>PLANT</strong> classification.
            </p>

            {/* Analyze Button */}
            <Button
              onClick={analyzeImage}
              disabled={isAnalyzing}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg py-6 shadow-lg"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Executing...
                </>
              ) : (
                'Execute Analysis'
              )}
            </Button>
          </div>

          {/* Preview & Results */}
          <div className="mt-8 grid md:grid-cols-2 gap-4 p-4 bg-slate-900 border border-slate-700 rounded-xl">
            {/* Preview */}
            <div className="text-center">
              <h4 className="text-base font-semibold mb-2 text-slate-300">
                Image Preview
              </h4>
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-auto rounded-lg object-cover border border-indigo-500 max-h-64 mx-auto"
              />
            </div>

            {/* Result */}
            <div>
              <h4 className="text-base font-semibold mb-2 text-slate-300">
                Classification Result
              </h4>
              <div className="bg-slate-900 p-4 rounded-lg min-h-[160px] max-h-64 border border-slate-700 flex items-center justify-center">
                <span className={`text-3xl sm:text-4xl font-bold ${getResultClass()}`}>
                  {result || 'Awaiting data upload...'}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Footer */}
        <footer className="text-center text-slate-500 text-sm">
          <p>Powered by Gemini Vision API via Lovable AI Gateway</p>
        </footer>
      </div>
    </div>
  );
};
