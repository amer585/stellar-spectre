import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, imageUrl } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Prepare image content
    let imageContent;
    if (imageBase64) {
      imageContent = imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`;
    } else if (imageUrl) {
      const imageResponse = await fetch(imageUrl);
      const imageBlob = await imageResponse.blob();
      const arrayBuffer = await imageBlob.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      imageContent = `data:image/jpeg;base64,${base64}`;
    } else {
      throw new Error("No image provided");
    }

    console.log("Classifying image with Gemini...");

    // Call Lovable AI Gateway with strict binary classification prompt
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
            content: "You are a precise binary classifier. Respond ONLY with 'PLANT' or 'NOT A PLANT'. No other text."
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Is the primary subject of this image a plant (e.g., tree, flower, shrub, grass, moss, fern)? Respond ONLY with 'PLANT' or 'NOT A PLANT'."
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
        temperature: 0.1,
        max_tokens: 10,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);
      
      if (response.status === 429) {
        throw new Error("Rate limit exceeded. Please try again later.");
      }
      if (response.status === 402) {
        throw new Error("Payment required. Please add credits to your Lovable workspace.");
      }
      
      throw new Error(`AI classification failed: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content.toUpperCase().trim();
    
    console.log("Classification result:", aiResponse);

    // Parse response strictly
    let classification;
    if (aiResponse.includes('PLANT') && !aiResponse.includes('NOT')) {
      classification = 'PLANT';
    } else if (aiResponse.includes('NOT A PLANT') || aiResponse.includes('NOT PLANT')) {
      classification = 'NOT A PLANT';
    } else {
      classification = 'UNCERTAIN';
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        classification,
        rawResponse: aiResponse 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in simple-plant-classifier:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Classification failed'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
