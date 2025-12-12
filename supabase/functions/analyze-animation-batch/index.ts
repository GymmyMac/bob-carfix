import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImageData {
  filename: string;
  base64: string; // base64 encoded image data
}

interface AnalyzedImage {
  filename: string;
  state_key: string;
  state_title: string;
  sequence_order: number;
  suggested_speed: number;
  suggested_scale: number;
  description: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { images } = await req.json() as { images: ImageData[] };
    
    if (!images || !Array.isArray(images) || images.length === 0) {
      return new Response(
        JSON.stringify({ error: "No images provided" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Analyzing ${images.length} images with vision AI`);

    // Build multimodal content with all images for AI to analyze together
    const content: any[] = [
      {
        type: "text",
        text: `You are an AI assistant that analyzes animation frames for a character named "Bob" who appears in these images.

TASK 1: Analyze the filenames to organize images into animation states and sequences.
TASK 2: CRITICAL - Analyze the VISUAL SIZE of the Bob character in EACH image. Some frames may have Bob drawn slightly larger or smaller. Calculate scale factors to normalize Bob's visual size across all frames.

FILENAME LIST:
${images.map((img, i) => `${i + 1}. ${img.filename}`).join('\n')}

RULES FOR STATE ORGANIZATION:
1. Group images by detected animation state (e.g., "idle", "talk", "wave", "thinking", "happy")
2. Look for naming patterns to infer state and sequence:
   - Common patterns: "idle_1.png", "talk-frame-2.png", "bob_wave_03.png", "talking_a.png"
   - Numbers or letters often indicate sequence order within a state
3. Generate friendly state titles (e.g., "talk" → "Talk Animation", "idle" → "Idle State")
4. Suggest appropriate animation speeds:
   - Talking/mouth movements: 200ms (fast)
   - Idle/breathing: 400-600ms (slow)
   - Waving/actions: 300ms (medium)
   - Default: 400ms
5. If you can't determine a pattern, use "misc" as state_key

RULES FOR SCALE NORMALIZATION (CRITICAL):
1. Look at EACH image and estimate how large Bob's character appears visually
2. Pick a REFERENCE size (the median/most common character size across all images)
3. For each image, calculate what scale percentage (50-200) would make Bob match the reference size
4. If Bob looks LARGER than reference → scale < 100 (shrink it)
5. If Bob looks SMALLER than reference → scale > 100 (enlarge it)
6. If Bob is the right size → scale = 100
7. Example: If image 3 has Bob drawn 20% larger than others, suggested_scale should be ~83 (to shrink him to match)

Return ONLY a valid JSON array with this structure (no markdown, no explanation):
[
  {
    "filename": "original_filename.png",
    "state_key": "talk",
    "state_title": "Talk Animation",
    "sequence_order": 1,
    "suggested_speed": 200,
    "suggested_scale": 100,
    "description": "Talking frame 1"
  }
]`
      }
    ];

    // Add all images for vision analysis
    for (const img of images) {
      content.push({
        type: "image_url",
        image_url: {
          url: img.base64 // Already includes data:image/... prefix
        }
      });
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: 'You are a helpful assistant that analyzes animation frames using computer vision. Always respond with valid JSON only, no markdown formatting.' 
          },
          { 
            role: 'user', 
            content: content 
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your Lovable AI workspace." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const responseContent = data.choices?.[0]?.message?.content;
    
    if (!responseContent) {
      throw new Error("No content returned from AI");
    }

    console.log('AI raw response:', responseContent);

    // Parse the JSON response - handle markdown code blocks if present
    let analyzed: AnalyzedImage[];
    try {
      let jsonStr = responseContent.trim();
      // Remove markdown code blocks if present
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      analyzed = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response:', responseContent);
      throw new Error(`Failed to parse AI response: ${parseError}`);
    }

    // Validate the response structure
    if (!Array.isArray(analyzed)) {
      throw new Error("AI response is not an array");
    }

    // Ensure all required fields are present and validate scale range
    const validated = analyzed.map((item, index) => ({
      filename: item.filename || images[index].filename,
      state_key: (item.state_key || 'misc').toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      state_title: item.state_title || item.state_key || 'Misc',
      sequence_order: item.sequence_order || index + 1,
      suggested_speed: item.suggested_speed || 400,
      suggested_scale: Math.min(200, Math.max(50, item.suggested_scale || 100)), // Clamp 50-200
      description: item.description || '',
    }));

    console.log('Analyzed results:', validated);

    return new Response(
      JSON.stringify({ analyzed: validated }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-animation-batch:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
