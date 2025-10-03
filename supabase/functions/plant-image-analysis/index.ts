import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, imageBase64 } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Prepare the image content
    let imageContent;
    if (imageBase64) {
      imageContent = imageBase64;
    } else if (imageUrl) {
      // If URL provided, fetch and convert to base64
      const imageResponse = await fetch(imageUrl);
      const imageBlob = await imageResponse.blob();
      const arrayBuffer = await imageBlob.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      imageContent = `data:image/jpeg;base64,${base64}`;
    } else {
      throw new Error("No image provided");
    }

    console.log("Analyzing plant image with Lovable AI...");

    // Call Lovable AI Gateway with vision model
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are an expert plant pathologist and botanist. Analyze images to determine if they contain plants, identify plant types, assess health status, and detect any diseases or pests. Provide detailed, accurate analysis."
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this image and provide: 1) Is this a plant? (yes/no), 2) Plant type/species if identifiable, 3) Health status (healthy/disease/pest/nutrient_deficiency), 4) Disease or issue name if present, 5) Confidence score (0-1), 6) Key visual features observed. Format as JSON."
              },
              {
                type: "image_url",
                image_url: {
                  url: imageContent
                }
              }
            ]
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);
      throw new Error(`AI analysis failed: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    console.log("AI Analysis result:", aiResponse);

    // Parse AI response (try to extract JSON or return as text)
    let analysis;
    try {
      // Try to find JSON in the response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: parse from text
        analysis = {
          isPlant: aiResponse.toLowerCase().includes("yes") || aiResponse.toLowerCase().includes("plant"),
          plantType: "Unknown",
          healthStatus: aiResponse.toLowerCase().includes("healthy") ? "healthy" : "unknown",
          disease: null,
          confidence: 0.7,
          features: [aiResponse.substring(0, 200)]
        };
      }
    } catch (e) {
      console.error("Failed to parse AI response:", e);
      analysis = {
        isPlant: aiResponse.toLowerCase().includes("plant"),
        plantType: "Unknown",
        healthStatus: "unknown",
        confidence: 0.5,
        rawResponse: aiResponse
      };
    }

    return new Response(
      JSON.stringify({ success: true, analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in plant-image-analysis:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Analysis failed'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
