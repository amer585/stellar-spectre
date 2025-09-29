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
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Brain, Database, Target, ChartBar as BarChart3, Zap, Camera, Leaf, Bug, Activity, Cloud, Cpu, Download, Play, Settings, CircleCheck as CheckCircle2, CircleAlert as AlertCircle, TrendingUp, FolderOpen, ImagePlus, Trash2, Wand as Wand2, Sparkles, Image } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

interface UploadedFile {
  file: File;
  id: string;
  preview?: string;
  category: 'plant' | 'non_plant';
}

interface GeneratedImage {
  base64: string;
  prompt: string;
  id: string;
  category: 'plant' | 'non_plant';
}

interface AIEnhancedAnalysisProps {
  userId: string;
}

const AIEnhancedAnalysis: React.FC<AIEnhancedAnalysisProps> = ({ userId }) => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState('');
  const [datasetStats, setDatasetStats] = useState<PlantDatasetStats | null>(null);
  const [trainingResult, setTrainingResult] = useState<TrainingResult | null>(null);
  const [currentTab, setCurrentTab] = useState<string>('mode-selection');
  const [dataMode, setDataMode] = useState<'generator' | 'manual' | null>(null);

  // Manual data gathering state
  const [plantImages, setPlantImages] = useState<UploadedFile[]>([]);
  const [nonPlantImages, setNonPlantImages] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);

  // Generated images state
  const [generatedPlantImages, setGeneratedPlantImages] = useState<GeneratedImage[]>([]);
  const [generatedNonPlantImages, setGeneratedNonPlantImages] = useState<GeneratedImage[]>([]);

  // Image generator settings
  const [plantGeneratorSettings, setPlantGeneratorSettings] = useState({
    prompt: '',
    template: '',
    style: 'Photorealistic',
    aspectRatio: '1:1',
    count: 10
  });

  const [nonPlantGeneratorSettings, setNonPlantGeneratorSettings] = useState({
    prompt: '',
    template: '',
    style: 'AI Training Data',
    aspectRatio: '1:1',
    count: 10
  });

  // Training configuration
  const [targetImageCount, setTargetImageCount] = useState(35000);
  const [modelArchitecture, setModelArchitecture] = useState('efficientnet');
  const [imageSize, setImageSize] = useState(224);
  const [batchSize, setBatchSize] = useState(32);
  const [epochs, setEpochs] = useState(50);
  const [learningRate, setLearningRate] = useState(0.001);

  // Plant generator templates and styles
  const PLANT_TEMPLATES = {
    'Random': 'Random',
    'exoplanet': 'Terrestrial Exoplanet',
    'gasgiant': 'Massive Gas Giant',
    'nebula': 'Star-Forming Nebula',
    'galaxy': 'Spiral Galaxy'
  };

  const PLANT_STYLES = {
    'Photorealistic': 'Photorealistic (Default)',
    'Random': 'Random',
    'Cinematic': 'Cinematic Drama',
    'JWST Style': 'JWST Deep Field',
    'Classic Science': 'Classic Science Illustration'
  };

  // Non-plant generator templates and styles
  const NON_PLANT_TEMPLATES = {
    'Random': 'Random',
    'abstract_data_texture': 'Synthetic Abstract Data',
    'fantasy_forest': 'Ancient Fantasy Forest',
    'cyberpunk_city': 'Neo-Tokyo Cyberpunk City',
    'abstract_sculpture': 'Abstract Art Sculpture',
    'historical_ship': '17th Century Galleon'
  };

  const NON_PLANT_STYLES = {
    'AI Training Data': 'AI Training Data (Recommended)',
    'High-Contrast Abstract': 'High-Contrast Abstract',
    'Random': 'Random',
    'Photorealistic': 'Photorealistic',
    'Cinematic': 'Cinematic Film Still',
    'Oil Painting': 'Detailed Oil Painting',
    'Digital Art': 'Vibrant Digital Art',
    'Ink Sketch': 'Monochromatic Ink Sketch'
  };

  const ASPECT_RATIOS = {
    '1:1': '1:1 (Square - Best for Training)',
    'Random': 'Random',
    '16:9': '16:9 (Widescreen)',
    '9:16': '9:16 (Vertical/Mobile)',
    '4:3': '4:3 (Classic)'
  };

  // Conditions to move between tabs
  const getTotalImages = () => {
    return plantImages.length + nonPlantImages.length + generatedPlantImages.length + generatedNonPlantImages.length;
  };

  const getPlantCount = () => {
    return plantImages.length + generatedPlantImages.length;
  };

  const getNonPlantCount = () => {
    return nonPlantImages.length + generatedNonPlantImages.length;
  };

  const canProceedToTraining = getTotalImages() >= 150 && getPlantCount() >= 100 && getNonPlantCount() >= 50;
  const canProceedToTesting = trainingResult !== null;
  const canProceedToExport = trainingResult !== null;

  // Helper function to select a random element from an array
  const selectRandom = (array: string[]) => array[Math.floor(Math.random() * array.length)];

  // Plant prompt engineering arrays (from Cosmic Vision AI)
  const PLANT_STYLE_PRESETS = {
    'Photorealistic': 'hyper-realistic, photorealistic, cinematic lighting, 16K, IMAX quality, extreme detail',
    'Cinematic': 'epic, monumental, wide-angle film shot, high contrast, deep shadows, Hollywood style',
    'JWST Style': 'James Webb Space Telescope style, deep field, high-fidelity, infrared color palette',
    'Classic Science': 'educational astronomy textbook style, clear surface detail, simple orbital perspective, natural colors'
  };

  const PLANT_AVAILABLE_STYLES = Object.keys(PLANT_STYLE_PRESETS);
  const PLANT_AVAILABLE_ASPECT_RATIOS = ['16:9', '1:1', '9:16', '4:3'];

  const PLANT_ATMOSPHERE_EFFECTS = [
    'volumetric blue atmospheric effects', 'thick, swirling red dust clouds', 'thin, ethereal layer of nitrogen haze', 
    'dense, metallic methane fog', 'bioluminescent atmosphere glowing green and purple', 'intense global lightning storms'
  ];
  const PLANT_LIGHTING_SCENARIOS = [
    'dramatic rim lighting from a hidden primary star', 'intense backlighting creating a sharp crescent',
    'soft twilight illumination revealing surface contours', 'a planet-wide eclipse casting deep shadows',
    'reflected light from a nearby moon'
  ];
  const PLANT_SURFACE_DETAILS = [
    'vast, deep canyons and mountain ranges', 'frozen nitrogen plains with jagged ice flows', 
    'active volcanic vents and magma rivers', 'giant impact craters and metallic deserts',
    'global ocean world covered in thick pack ice', 'alien flora covering one hemisphere'
  ];
  const PLANT_RING_DETAILS = [
    'complex, multi-layered ring system with shepherds moons', 'thin, dusty, barely visible rings of ice debris',
    'broad, dark rings composed of carbonaceous material', 'no rings'
  ];
  const PLANT_CAMERA_VIEWPOINTS = [
    'extreme low orbit perspective, telephoto lens, close focus on surface', 'shot from behind a nebula cloud, wide shot', 
    'high-angle orbital view, showing the polar vortex', 'close-up on the terminator line, ultra-detailed',
    'wide-angle view with a massive shadow cast by an unseen object', 'telecopic view from Earth orbit'
  ];
  const PLANT_TECHNICAL_ENHANCEMENTS = [
    'HDR imaging, stacked exposures, high dynamic range', 'f/1.4 aperture, perfect focus',
    'astrometry calibration, minimal noise reduction, deep black void', 'star-stacked background, ultra-sharp'
  ];

  const PLANT_QUICK_TEMPLATES = {
    'exoplanet': 'A massive terrestrial exoplanet in the habitable zone, with liquid water oceans and clouds over vast continents.',
    'gasgiant': 'A colorful gas giant with powerful banded jet streams and a massive Great Red Spot-style storm.',
    'nebula': 'A vibrant star-forming nebula with dramatic pillars of gas and dust illuminated by young, hot stars.',
    'galaxy': 'A majestic barred spiral galaxy seen edge-on with dark dust lanes and a glowing central core.'
  };
  const PLANT_TEMPLATE_PROMPTS = Object.values(PLANT_QUICK_TEMPLATES);

  // Non-plant prompt engineering arrays (from Dream Weaver AI)
  const NON_PLANT_STYLE_PRESETS = {
    'Photorealistic': 'hyper-realistic, studio lighting, highly detailed, 16K, photoreal',
    'Cinematic': 'epic, wide-angle film shot, bokeh, deep shadows, Hollywood style, high-contrast',
    'Oil Painting': 'detailed Renaissance oil painting, fine brushstrokes, rich textures, chiaroscuro lighting',
    'Digital Art': 'vibrant colors, stylized rendering, sharp lines, detailed digital painting',
    'Ink Sketch': 'monochromatic ink on paper, fine line work, intricate detail, traditional sketch',
    'AI Training Data': 'neutral background, sharp focus on subject, varied angles and lighting, clear object segmentation, minimal artistic effects, high dynamic range, no artifacts, clean edges, lossless detail',
    'High-Contrast Abstract': 'sharp geometric forms, bold color block, non-photorealistic, vector graphic look, clear lines, synthetic data aesthetic',
  };

  const NON_PLANT_AVAILABLE_STYLES = Object.keys(NON_PLANT_STYLE_PRESETS);
  const NON_PLANT_AVAILABLE_ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3'];

  const NON_PLANT_ENVIRONMENT_DETAILS = [
    'white seamless studio background', 'pure black background, single light source', 
    'concrete industrial warehouse, even bright lighting', 'pure white background, flat even lighting (for silhouette training)', 
    'busy marketplace in midday sun', 'cluttered kitchen countertop, top-down view',
    'soft golden hour light filtering through trees', 'thick, swirling steam and fog on cobblestones', 
    'intense, deep blue underwater environment', 'dry, cracked earth and desolate desert landscape', 
    'rainy night with city lights reflecting on wet pavement', 'misty morning in a blooming meadow',
    'procedural grid pattern texture', 'seamless metallic surface with fine scratches',
  ];
  const NON_PLANT_SUBJECT_DETAILS = [
    'common household object like a ceramic mug or wooden chair', 'detailed portrait of an elderly person, clearly defined facial features',
    'a specific breed of dog (e.g., golden retriever), clearly defined form', 'industrial robot arm performing a task',
    'intricate mechanical clockwork mechanisms', 'a tapestry of blooming flowers and moss', 
    'weathered stone architecture with overgrown ivy', 'smooth reflective surface of a highly polished diamond',
    'glowing magical runes and energy effects', 'complex geometric patterns in gold and marble',
    'complex interlocking geometric shapes (cubes, spheres, pyramids)', 'abstract knot or loop made of polished chrome', 
    'a data visualization graph rendered in 3D space', 'glowing transparent fluid moving inside a glass pipe',
  ];
  const NON_PLANT_CAMERA_VIEWPOINTS = [
    'standard frontal view, eye-level perspective', 'high-angle shot looking down onto the subject',
    'silhouetted against a bright window', 'backlit with rim lighting',
    'extreme close-up macro shot, shallow depth of field', 'wide cinematic panorama, low-angle perspective',
  ];

  const NON_PLANT_QUICK_TEMPLATES = {
    'abstract_data_texture': 'Synthetic abstract data texture with geometric patterns.',
    'fantasy_forest': 'Ancient fantasy forest with glowing trees and mystical creatures.',
    'cyberpunk_city': 'Neo-Tokyo cyberpunk city with neon lights and flying cars.',
    'abstract_sculpture': 'Abstract art sculpture in a modern gallery.',
    'historical_ship': '17th century galleon sailing on stormy seas.'
  };
  const NON_PLANT_TEMPLATE_PROMPTS = Object.values(NON_PLANT_QUICK_TEMPLATES);

  // Helper for exponential backoff retry
  const fetchWithRetry = async (url: string, options: RequestInit, maxRetries = 5) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(url, options);
        
        if (response.status === 429) {
          const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        if (response.ok) {
          return response;
        }

        const contentLength = response.headers.get('content-length');
        if (contentLength && parseInt(contentLength, 10) > 0) {
          return response;
        }

        if (i < maxRetries - 1) {
          const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        throw new Error(`API returned status ${response.status} ${response.statusText} and an empty response body.`);
      } catch (error) {
        if (i < maxRetries - 1) {
          const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw error;
        }
      }
    }
    throw new Error("API request failed after multiple retries.");
  };

  // Generate plant images using Google Imagen API (adapted from Cosmic Vision AI)
  const generatePlantImages = async () => {
    if (!plantGeneratorSettings.prompt && plantGeneratorSettings.template !== 'Random') {
      toast.error('Please enter a prompt or select Random template');
      return;
    }

    setLoading(true);
    setCurrentPhase('Generating plant images...');
    setProgress(0);

    try {
      const images: GeneratedImage[] = [];
      const apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict";
      const apiKey = "YOUR_KEY";  // Replace with your actual Google API key
      const fullApiUrl = `${apiUrl}?key=${apiKey}`;
      const maxSamplesPerRequest = 4;
      const total = plantGeneratorSettings.count;
      const totalRequests = Math.ceil(total / maxSamplesPerRequest);
      let generatedCount = 0;

      for (let req = 0; req < totalRequests; req++) {
        const samplesToRequest = Math.min(maxSamplesPerRequest, total - generatedCount);
        setCurrentPhase(`Generating plant batch ${req + 1} of ${totalRequests}...`);

        // Randomization per batch
        let currentBasePrompt = plantGeneratorSettings.prompt;
        if (plantGeneratorSettings.template === 'Random') {
          currentBasePrompt = selectRandom(PLANT_TEMPLATE_PROMPTS);
        } else if (plantGeneratorSettings.template) {
          currentBasePrompt = PLANT_QUICK_TEMPLATES[plantGeneratorSettings.template as keyof typeof PLANT_QUICK_TEMPLATES] || currentBasePrompt;
        }

        const currentStyle = plantGeneratorSettings.style === 'Random' 
          ? selectRandom(PLANT_AVAILABLE_STYLES) 
          : plantGeneratorSettings.style;

        const currentRatio = plantGeneratorSettings.aspectRatio === 'Random' 
          ? selectRandom(PLANT_AVAILABLE_ASPECT_RATIOS) 
          : plantGeneratorSettings.aspectRatio;

        // Generate complex prompt
        const presetKeywords = PLANT_STYLE_PRESETS[currentStyle as keyof typeof PLANT_STYLE_PRESETS] || PLANT_STYLE_PRESETS['Photorealistic'];
        const randomComponents = [
          selectRandom(PLANT_ATMOSPHERE_EFFECTS),
          selectRandom(PLANT_LIGHTING_SCENARIOS),
          selectRandom(PLANT_SURFACE_DETAILS),
          selectRandom(PLANT_RING_DETAILS),
          selectRandom(PLANT_CAMERA_VIEWPOINTS),
          selectRandom(PLANT_TECHNICAL_ENHANCEMENTS)
        ];
        const realismInstruction = 'scientifically accurate, high detail, deep space void background, no text, no watermark';
        const finalPrompt = [currentBasePrompt, presetKeywords, ...randomComponents, realismInstruction].filter(part => part).join(', ') + '. Ensure this specific image is highly unique and visually diverse from all others generated in this batch. Vary lighting, composition, and detail.';

        const payload = {
          instances: [{ prompt: finalPrompt }],
          parameters: {
            sampleCount: samplesToRequest,
            aspectRatio: currentRatio,
            outputMimeType: "image/png"
          }
        };

        const response = await fetchWithRetry(fullApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (!result.predictions || result.predictions.length === 0) {
          throw new Error(`No predictions returned for batch ${req + 1}`);
        }

        result.predictions.forEach((prediction: { bytesBase64Encoded: string }, index: number) => {
          const base64 = prediction.bytesBase64Encoded;
          if (base64) {
            images.push({
              base64,
              prompt: finalPrompt,
              id: `generated_plant_${Date.now()}_${generatedCount + index}`,
              category: 'plant'
            });
          }
        });

        generatedCount += samplesToRequest;
        setProgress((generatedCount / total) * 100);

        // Delay between requests
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      setGeneratedPlantImages(prev => [...prev, ...images]);
      toast.success(`Generated ${images.length} plant images successfully!`);
      
    } catch (error) {
      console.error('Error generating plant images:', error);
      toast.error('Failed to generate plant images');
    } finally {
      setLoading(false);
      setProgress(0);
      setCurrentPhase('');
    }
  };

  // Generate non-plant images using Google Imagen API (adapted from Dream Weaver AI)
  const generateNonPlantImages = async () => {
    if (!nonPlantGeneratorSettings.prompt && nonPlantGeneratorSettings.template !== 'Random') {
      toast.error('Please enter a prompt or select Random template');
      return;
    }

    setLoading(true);
    setCurrentPhase('Generating non-plant images...');
    setProgress(0);

    try {
      const images: GeneratedImage[] = [];
      const apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict";
      const apiKey = "YOUR_KEY";  // Replace with your actual Google API key
      const fullApiUrl = `${apiUrl}?key=${apiKey}`;
      const maxSamplesPerRequest = 1;  // Set to 1 for maximum uniqueness per prompt
      const total = nonPlantGeneratorSettings.count;
      const totalRequests = total;  // One per image
      let generatedCount = 0;

      for (let req = 0; req < totalRequests; req++) {
        const samplesToRequest = 1;
        setCurrentPhase(`Generating non-plant image ${req + 1} of ${total}...`);

        // Randomization per image
        let currentBasePrompt = nonPlantGeneratorSettings.prompt;
        if (nonPlantGeneratorSettings.template === 'Random') {
          currentBasePrompt = selectRandom(NON_PLANT_TEMPLATE_PROMPTS);
        } else if (nonPlantGeneratorSettings.template) {
          currentBasePrompt = NON_PLANT_QUICK_TEMPLATES[nonPlantGeneratorSettings.template as keyof typeof NON_PLANT_QUICK_TEMPLATES] || currentBasePrompt;
        }

        const currentStyle = nonPlantGeneratorSettings.style === 'Random' 
          ? selectRandom(NON_PLANT_AVAILABLE_STYLES) 
          : nonPlantGeneratorSettings.style;

        const currentRatio = nonPlantGeneratorSettings.aspectRatio === 'Random' 
          ? selectRandom(NON_PLANT_AVAILABLE_ASPECT_RATIOS) 
          : nonPlantGeneratorSettings.aspectRatio;

        // Generate complex prompt
        const presetKeywords = NON_PLANT_STYLE_PRESETS[currentStyle as keyof typeof NON_PLANT_STYLE_PRESETS] || NON_PLANT_STYLE_PRESETS['AI Training Data'];
        const randomComponents = [
          selectRandom(NON_PLANT_ENVIRONMENT_DETAILS),
          selectRandom(NON_PLANT_SUBJECT_DETAILS),
          selectRandom(NON_PLANT_CAMERA_VIEWPOINTS),
        ];
        const realismInstruction = 'high detail, no celestial objects, no text, no watermark';
        const finalPrompt = [currentBasePrompt, presetKeywords, ...randomComponents, realismInstruction].filter(part => part).join(', ') + '. Ensure this specific image is highly unique and visually diverse from all others generated in this batch. Vary the composition, color, angle, and focal point.';

        const payload = {
          instances: [{ prompt: finalPrompt }],
          parameters: {
            sampleCount: samplesToRequest,
            aspectRatio: currentRatio,
            outputMimeType: "image/png"
          }
        };

        const response = await fetchWithRetry(fullApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (!result.predictions || result.predictions.length === 0) {
          throw new Error(`No predictions returned for image ${req + 1}`);
        }

        const base64 = result.predictions[0].bytesBase64Encoded;
        if (base64) {
          images.push({
            base64,
            prompt: finalPrompt,
            id: `generated_non_plant_${Date.now()}_${generatedCount}`,
            category: 'non_plant'
          });
        }

        generatedCount += samplesToRequest;
        setProgress((generatedCount / total) * 100);

        // Delay between requests
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      setGeneratedNonPlantImages(prev => [...prev, ...images]);
      toast.success(`Generated ${images.length} non-plant images successfully!`);
      
    } catch (error) {
      console.error('Error generating non-plant images:', error);
      toast.error('Failed to generate non-plant images');
    } finally {
      setLoading(false);
      setProgress(0);
      setCurrentPhase('');
    }
  };

  // Base64 to Blob for upload
  const base64ToBlob = (base64: string) => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: 'image/png' });
  };

  // Handle file selection for manual mode
  const handleFileSelection = useCallback(
    async (files: FileList, category: 'plant' | 'non_plant') => {
      const newFiles: UploadedFile[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} is not an image file`);
          continue;
        }
        // Validate file size (max 10MB per image)
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} is larger than 10MB`);
          continue;
        }
        const fileId = `${category}_${Date.now()}_${i}`;
        let preview: string | undefined;
        try {
          preview = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.onerror = (e) => reject(e);
            reader.readAsDataURL(file);
          });
        } catch (e) {
          console.error('Error reading file preview', e);
        }
        newFiles.push({ file, id: fileId, preview, category });
      }
      if (category === 'plant') {
        setPlantImages((prev) => [...prev, ...newFiles]);
      } else {
        setNonPlantImages((prev) => [...prev, ...newFiles]);
      }
      toast.success(`Added ${newFiles.length} ${category.replace('_', '-')} images`);
    },
    []
  );

  // Remove uploaded file
  const removeFile = useCallback(
    (fileId: string, category: 'plant' | 'non_plant') => {
      if (category === 'plant') {
        setPlantImages((prev) => prev.filter((f) => f.id !== fileId));
      } else {
        setNonPlantImages((prev) => prev.filter((f) => f.id !== fileId));
      }
    },
    []
  );

  // Remove generated image
  const removeGeneratedImage = useCallback(
    (imageId: string, category: 'plant' | 'non_plant') => {
      if (category === 'plant') {
        setGeneratedPlantImages((prev) => prev.filter((img) => img.id !== imageId));
      } else {
        setGeneratedNonPlantImages((prev) => prev.filter((img) => img.id !== imageId));
      }
    },
    []
  );

  // Upload manual dataset to storage
  const uploadDataset = async () => {
    const totalImages = getTotalImages();
    const plantCount = getPlantCount();
    const nonPlantCount = getNonPlantCount();

    if (totalImages < 150) {
      toast.error('Need at least 150 total images');
      return;
    }

    if (plantCount < 100) {
      toast.error('Need at least 100 plant images');
      return;
    }

    if (nonPlantCount < 50) {
      toast.error('Need at least 50 non-plant images');
      return;
    }

    setUploading(true);
    setProgress(0);
    setCurrentPhase('Uploading dataset to storage...');

    try {
      let uploadedCount = 0;
      const totalFiles = plantImages.length + nonPlantImages.length + generatedPlantImages.length + generatedNonPlantImages.length;

      // Upload manual files
      for (const uploadFile of plantImages) {
        const fileName = `manual_dataset/plant/${uploadFile.id}_${uploadFile.file.name}`;
        const { error } = await supabase.storage
          .from('training-datasets')
          .upload(fileName, uploadFile.file);
        
        if (error) throw error;
        
        await supabase.from('image_metadata').insert({
          id: uploadFile.id,
          user_id: userId,
          title: uploadFile.file.name,
          source: 'Manual_Upload',
          category: 'plant',
          file_path: fileName,
          metadata: {
            originalName: uploadFile.file.name,
            fileSize: uploadFile.file.size,
            uploadDate: new Date().toISOString(),
            dataType: 'manual',
          },
        });
        
        uploadedCount++;
        setProgress((uploadedCount / totalFiles) * 100);
      }

      for (const uploadFile of nonPlantImages) {
        const fileName = `manual_dataset/non_plant/${uploadFile.id}_${uploadFile.file.name}`;
        const { error } = await supabase.storage
          .from('training-datasets')
          .upload(fileName, uploadFile.file);
        
        if (error) throw error;
        
        await supabase.from('image_metadata').insert({
          id: uploadFile.id,
          user_id: userId,
          title: uploadFile.file.name,
          source: 'Manual_Upload',
          category: 'non_plant',
          file_path: fileName,
          metadata: {
            originalName: uploadFile.file.name,
            fileSize: uploadFile.file.size,
            uploadDate: new Date().toISOString(),
            dataType: 'manual',
          },
        });
        
        uploadedCount++;
        setProgress((uploadedCount / totalFiles) * 100);
      }

      // Upload generated images
      for (const genImage of generatedPlantImages) {
        const fileName = `generated_dataset/plant/${genImage.id}.png`;
        const blob = base64ToBlob(genImage.base64);
        
        const { error } = await supabase.storage
          .from('training-datasets')
          .upload(fileName, blob);
        
        if (error) throw error;
        
        await supabase.from('image_metadata').insert({
          id: genImage.id,
          user_id: userId,
          title: `Generated Plant Image`,
          source: 'Cosmic_Vision_AI',
          category: 'plant',
          file_path: fileName,
          metadata: {
            prompt: genImage.prompt,
            generationDate: new Date().toISOString(),
            dataType: 'generated',
          },
        });
        
        uploadedCount++;
        setProgress((uploadedCount / totalFiles) * 100);
      }

      for (const genImage of generatedNonPlantImages) {
        const fileName = `generated_dataset/non_plant/${genImage.id}.png`;
        const blob = base64ToBlob(genImage.base64);
        
        const { error } = await supabase.storage
          .from('training-datasets')
          .upload(fileName, blob);
        
        if (error) throw error;
        
        await supabase.from('image_metadata').insert({
          id: genImage.id,
          user_id: userId,
          title: `Generated Non-Plant Image`,
          source: 'Dream_Weaver_AI',
          category: 'non_plant',
          file_path: fileName,
          metadata: {
            prompt: genImage.prompt,
            generationDate: new Date().toISOString(),
            dataType: 'generated',
          },
        });
        
        uploadedCount++;
        setProgress((uploadedCount / totalFiles) * 100);
      }

      toast.success('Dataset uploaded successfully!');
      setCurrentTab('training');

    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload dataset');
    } finally {
      setUploading(false);
      setProgress(0);
      setCurrentPhase('');
    }
  };

  // Mock training for now (replace with real if needed)
  const trainPlantDetectionModel = async () => {
    setLoading(true);
    setProgress(0);
    setCurrentPhase('Training model...');

    // Simulate training
    await new Promise(resolve => setTimeout(resolve, 5000));

    setTrainingResult({
      modelId: 'mock-model-123',
      endpointUrl: 'https://mock-endpoint.com',
      evaluation: {
        accuracy: 0.95,
        precision: 0.94,
        recall: 0.96,
        f1Score: 0.95,
        confusionMatrix: [[100, 5], [4, 100]],
        testAccuracy: 0.93,
        validationAccuracy: 0.94,
        trainingAccuracy: 0.97,
        auc: 0.98
      },
      trainingHistory: [],
      config: {},
      modelFormats: {
        onnx: 'mock-onnx',
        tensorflow: 'mock-tf'
      }
    });

    setLoading(false);
    setProgress(100);
    setCurrentPhase('');
  };

  // Mock testing for now
  const testPlantModel = async (file: File) => {
    setLoading(true);
    setCurrentPhase('Testing image...');

    // Simulate
    await new Promise(resolve => setTimeout(resolve, 2000));

    toast.success('Test complete: Plant detected with 95% confidence');

    setLoading(false);
    setCurrentPhase('');
  };

  // Mock download
  const downloadModel = (format: 'onnx' | 'tensorflow') => {
    toast.info(`Downloading ${format} model...`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI-Enhanced Plant Detection Analysis</CardTitle>
        <CardDescription>Build and train your custom model</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={currentTab} onValueChange={setCurrentTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="mode-selection">Mode</TabsTrigger>
            <TabsTrigger value="data-collection">Data Collection</TabsTrigger>
            <TabsTrigger value="training" disabled={!canProceedToTraining}>Training</TabsTrigger>
            <TabsTrigger value="testing" disabled={!canProceedToTesting}>Testing</TabsTrigger>
            <TabsTrigger value="export" disabled={!canProceedToExport}>Export</TabsTrigger>
          </TabsList>

          <TabsContent value="mode-selection" className="space-y-6">
            {/* Mode selection UI */}
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button onClick={() => { setDataMode('generator'); setCurrentTab('data-collection'); }}>
                    AI Image Generator Mode
                  </Button>
                  <Button onClick={() => { setDataMode('manual'); setCurrentTab('data-collection'); }}>
                    Manual Upload Mode
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="data-collection" className="space-y-6">
            {dataMode === 'generator' && (
              <div className="space-y-8">
                {/* Plant Generator */}
                <Card>
                  <CardHeader>
                    <CardTitle>Plant Image Generator (Cosmic Vision AI)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label>Template</Label>
                        <Select value={plantGeneratorSettings.template} onValueChange={(v) => setPlantGeneratorSettings(prev => ({ ...prev, template: v }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(PLANT_TEMPLATES).map(([key, value]) => (
                              <SelectItem key={key} value={key}>{value}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Style</Label>
                        <Select value={plantGeneratorSettings.style} onValueChange={(v) => setPlantGeneratorSettings(prev => ({ ...prev, style: v }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(PLANT_STYLES).map(([key, value]) => (
                              <SelectItem key={key} value={key}>{value}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Aspect Ratio</Label>
                        <Select value={plantGeneratorSettings.aspectRatio} onValueChange={(v) => setPlantGeneratorSettings(prev => ({ ...prev, aspectRatio: v }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(ASPECT_RATIOS).map(([key, value]) => (
                              <SelectItem key={key} value={key}>{value}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label>Prompt</Label>
                      <Textarea 
                        value={plantGeneratorSettings.prompt} 
                        onChange={(e) => setPlantGeneratorSettings(prev => ({ ...prev, prompt: e.target.value }))}
                        placeholder="Describe your celestial object"
                      />
                    </div>
                    <div>
                      <Label>Count</Label>
                      <Input 
                        type="number" 
                        value={plantGeneratorSettings.count} 
                        onChange={(e) => setPlantGeneratorSettings(prev => ({ ...prev, count: parseInt(e.target.value) || 10 }))}
                      />
                    </div>
                    <Button onClick={generatePlantImages} disabled={loading}>Generate Plant Images</Button>
                  </CardContent>
                </Card>

                {/* Non-Plant Generator */}
                <Card>
                  <CardHeader>
                    <CardTitle>Non-Plant Image Generator (Dream Weaver AI)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label>Template</Label>
                        <Select value={nonPlantGeneratorSettings.template} onValueChange={(v) => setNonPlantGeneratorSettings(prev => ({ ...prev, template: v }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(NON_PLANT_TEMPLATES).map(([key, value]) => (
                              <SelectItem key={key} value={key}>{value}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Style</Label>
                        <Select value={nonPlantGeneratorSettings.style} onValueChange={(v) => setNonPlantGeneratorSettings(prev => ({ ...prev, style: v }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(NON_PLANT_STYLES).map(([key, value]) => (
                              <SelectItem key={key} value={key}>{value}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Aspect Ratio</Label>
                        <Select value={nonPlantGeneratorSettings.aspectRatio} onValueChange={(v) => setNonPlantGeneratorSettings(prev => ({ ...prev, aspectRatio: v }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(ASPECT_RATIOS).map(([key, value]) => (
                              <SelectItem key={key} value={key}>{value}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label>Prompt</Label>
                      <Textarea 
                        value={nonPlantGeneratorSettings.prompt} 
                        onChange={(e) => setNonPlantGeneratorSettings(prev => ({ ...prev, prompt: e.target.value }))}
                        placeholder="Describe your non-celestial object or scene"
                      />
                    </div>
                    <div>
                      <Label>Count</Label>
                      <Input 
                        type="number" 
                        value={nonPlantGeneratorSettings.count} 
                        onChange={(e) => setNonPlantGeneratorSettings(prev => ({ ...prev, count: parseInt(e.target.value) || 10 }))}
                      />
                    </div>
                    <Button onClick={generateNonPlantImages} disabled={loading}>Generate Non-Plant Images</Button>
                  </CardContent>
                </Card>

                {/* Display generated images */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {generatedPlantImages.map(img => (
                    <div key={img.id} className="relative">
                      <img src={`data:image/png;base64,${img.base64}`} alt="Generated Plant" className="w-full h-auto" />
                      <Button variant="destructive" size="sm" className="absolute top-2 right-2" onClick={() => removeGeneratedImage(img.id, 'plant')}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {generatedNonPlantImages.map(img => (
                    <div key={img.id} className="relative">
                      <img src={`data:image/png;base64,${img.base64}`} alt="Generated Non-Plant" className="w-full h-auto" />
                      <Button variant="destructive" size="sm" className="absolute top-2 right-2" onClick={() => removeGeneratedImage(img.id, 'non_plant')}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {dataMode === 'manual' && (
              <div className="space-y-8">
                {/* Manual upload UI */}
                <Card>
                  <CardHeader>
                    <CardTitle>Upload Plant Images</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Input type="file" multiple accept="image/*" onChange={(e) => e.target.files && handleFileSelection(e.target.files, 'plant')} />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      {plantImages.map(file => (
                        <div key={file.id} className="relative">
                          <img src={file.preview} alt="Uploaded Plant" className="w-full h-auto" />
                          <Button variant="destructive" size="sm" className="absolute top-2 right-2" onClick={() => removeFile(file.id, 'plant')}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Upload Non-Plant Images</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Input type="file" multiple accept="image/*" onChange={(e) => e.target.files && handleFileSelection(e.target.files, 'non_plant')} />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      {nonPlantImages.map(file => (
                        <div key={file.id} className="relative">
                          <img src={file.preview} alt="Uploaded Non-Plant" className="w-full h-auto" />
                          <Button variant="destructive" size="sm" className="absolute top-2 right-2" onClick={() => removeFile(file.id, 'non_plant')}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <Button onClick={uploadDataset} disabled={uploading || !canProceedToTraining} className="w-full">
              {uploading ? 'Uploading...' : 'Upload Dataset and Proceed to Training'}
            </Button>

            {loading && (
              <Progress value={progress} />
            )}
          </TabsContent>

          <TabsContent value="training">
            <Card>
              <CardHeader>
                <CardTitle>Model Training Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Architecture</Label>
                    <Select value={modelArchitecture} onValueChange={setModelArchitecture}>
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
                    <Label>Input Image Size</Label>
                    <Input
                      type="number"
                      min={32}
                      max={1024}
                      value={imageSize}
                      onChange={(e) => setImageSize(parseInt(e.target.value) || 224)}
                    />
                  </div>

                  <div>
                    <Label>Batch Size</Label>
                    <Input
                      type="number"
                      min={8}
                      max={128}
                      value={batchSize}
                      onChange={(e) => setBatchSize(parseInt(e.target.value) || 32)}
                    />
                  </div>

                  <div>
                    <Label>Epochs</Label>
                    <Input
                      type="number"
                      min={1}
                      max={500}
                      value={epochs}
                      onChange={(e) => setEpochs(parseInt(e.target.value) || 50)}
                    />
                  </div>

                  <div>
                    <Label>Learning Rate</Label>
                    <Input
                      type="number"
                      step={0.0001}
                      min={0.00001}
                      max={1}
                      value={learningRate}
                      onChange={(e) => setLearningRate(parseFloat(e.target.value) || 0.001)}
                    />
                  </div>
                </div>

                <Button
                  onClick={trainPlantDetectionModel}
                  disabled={loading || !canProceedToTraining}
                  className="w-full"
                  size="lg"
                >
                  {loading ? 'Training Model...' : 'Start Model Training'}
                </Button>

                {!canProceedToTraining && (
                  <p className="text-sm text-muted-foreground text-center">
                    Complete dataset collection first (need 150+ images)
                  </p>
                )}

                {loading && (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{currentPhase}</span>
                          <span className="font-medium">{progress.toFixed(0)}%</span>
                        </div>
                        <Progress value={progress} className="w-full" />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {trainingResult && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        Training Complete!
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div>
                          <div className="text-2xl font-bold text-green-600">
                            {(trainingResult.evaluation.accuracy * 100).toFixed(1)}%
                          </div>
                          <div className="text-sm text-muted-foreground">Accuracy</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-blue-600">
                            {(trainingResult.evaluation.f1Score * 100).toFixed(1)}%
                          </div>
                          <div className="text-sm text-muted-foreground">F1-Score</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-purple-600">
                            {(trainingResult.evaluation.precision * 100).toFixed(1)}%
                          </div>
                          <div className="text-sm text-muted-foreground">Precision</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-yellow-600">
                            {(trainingResult.evaluation.recall * 100).toFixed(1)}%
                          </div>
                          <div className="text-sm text-muted-foreground">Recall</div>
                        </div>
                      </div>

                      <div className="mt-6 text-center">
                        <Button
                          onClick={() => setCurrentTab('testing')}
                          className="px-8"
                          size="lg"
                        >
                          Test Your Model
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="testing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Model Testing & Inference
                </CardTitle>
                <CardDescription>
                  Test your trained model with new images
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {trainingResult ? (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center p-4 bg-muted/20 rounded-lg">
                      <div>
                        <div className="text-lg font-bold text-green-600">
                          {(trainingResult.evaluation.accuracy * 100).toFixed(1)}%
                        </div>
                        <div className="text-sm text-muted-foreground">Test Accuracy</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-blue-600">
                          {(trainingResult.evaluation.f1Score * 100).toFixed(1)}%
                        </div>
                        <div className="text-sm text-muted-foreground">F1-Score</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-purple-600">
                          {trainingResult.modelId.substring(0, 12)}...
                        </div>
                        <div className="text-sm text-muted-foreground">Model ID</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-yellow-600">
                          {(trainingResult.evaluation.auc * 100).toFixed(1)}%
                        </div>
                        <div className="text-sm text-muted-foreground">AUC-ROC</div>
                      </div>
                    </div>

                    <div>
                      <Label>Test Image</Label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            await testPlantModel(file);
                          }
                        }}
                      />
                    </div>

                    {loading && currentPhase && (
                      <div className="text-center">
                        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                        <p className="text-sm text-muted-foreground">{currentPhase}</p>
                      </div>
                    )}

                    <div className="text-center">
                      <Button
                        onClick={() => setCurrentTab('export')}
                        className="px-8"
                        size="lg"
                      >
                        Export Your Model
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No model available. Please train a model first.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="export" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Model Export & Deployment
                </CardTitle>
                <CardDescription>
                  Download your trained model in different formats
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {trainingResult ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Button 
                        onClick={() => downloadModel('onnx')} 
                        variant="outline"
                        className="h-20 flex flex-col items-center justify-center"
                      >
                        <Download className="h-6 w-6 mb-2" />
                        Download ONNX Model
                        <span className="text-xs text-muted-foreground">Cross-platform inference</span>
                      </Button>
                      
                      <Button 
                        onClick={() => downloadModel('tensorflow')} 
                        variant="outline"
                        className="h-20 flex flex-col items-center justify-center"
                      >
                        <Download className="h-6 w-6 mb-2" />
                        Download TensorFlow Model
                        <span className="text-xs text-muted-foreground">Python/TensorFlow deployment</span>
                      </Button>
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Model Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Model ID:</span>
                          <span className="font-mono">{trainingResult.modelId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">API Endpoint:</span>
                          <span className="font-mono text-xs">{trainingResult.endpointUrl}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Test Accuracy:</span>
                          <span className="font-semibold text-green-600">
                            {(trainingResult.evaluation.testAccuracy * 100).toFixed(2)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Validation Accuracy:</span>
                          <span className="font-semibold text-blue-600">
                            {(trainingResult.evaluation.validationAccuracy * 100).toFixed(2)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Training Accuracy:</span>
                          <span className="font-semibold text-purple-600">
                            {(trainingResult.evaluation.trainingAccuracy * 100).toFixed(2)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">AUC-ROC:</span>
                          <span className="font-semibold text-yellow-600">
                            {(trainingResult.evaluation.auc * 100).toFixed(2)}%
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Sample Python Code</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
{`# Plant Detection Model Inference
import onnxruntime as ort
import numpy as np
from PIL import Image

# Load the model
session = ort.InferenceSession('plant_detector.onnx')

# Preprocess image
def preprocess_image(image_path):
    img = Image.open(image_path).convert('RGB')
    img = img.resize((${imageSize}, ${imageSize}))
    img_array = np.array(img) / 255.0
    img_array = np.transpose(img_array, (2, 0, 1))
    return np.expand_dims(img_array, axis=0).astype(np.float32)

# Run inference
input_data = preprocess_image('test_image.jpg')
outputs = session.run(None, {'input': input_data})
prediction = outputs[0][0]

# Get result
is_plant = prediction[1] > prediction[0]
confidence = max(prediction)
print(f"Plant: {is_plant}, Confidence: {confidence:.2f}")
`}
                        </pre>
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No model available. Please train a model first.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AIEnhancedAnalysis;
