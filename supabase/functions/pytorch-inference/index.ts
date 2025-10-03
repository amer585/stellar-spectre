import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PYTORCH_BACKEND_URL = 'http://localhost:8000';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, imageBase64, modelPath } = await req.json();

    console.log(`PyTorch inference request: ${action}`);

    if (action === 'predict') {
      // Call PyTorch backend for real inference
      const response = await fetch(`${PYTORCH_BACKEND_URL}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageBase64,
          model_path: modelPath
        })
      });

      if (!response.ok) {
        throw new Error(`PyTorch backend error: ${response.status}`);
      }

      const result = await response.json();
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          prediction: result.prediction,
          confidence: result.confidence,
          class_probabilities: result.class_probabilities,
          inference_time: result.inference_time
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Unknown action' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );

  } catch (error) {
    console.error('Error in pytorch-inference:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Inference failed'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
