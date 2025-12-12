import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImageData {
  filename: string;
  base64: string;
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

    // Build the content array with images
    const content: any[] = [];
    
    // Add the text prompt first
    content.push({
      type: "text",
      text: `You are analyzing ${images.length} animation frames for a character named "Bob".

FILENAMES: ${images.map((img, i) => `${i + 1}. ${img.filename}`).join(', ')}

INSTRUCTIONS:
1. Look at each image and identify what animation state it belongs to (idle, talk, wave, thinking, happy, etc.)
2. For each image, estimate Bob's visual CHARACTER SIZE relative to the others
3. Pick the MEDIAN size as reference (scale=100)
4. Calculate scale factors: if Bob looks BIGGER than median, scale<100; if SMALLER, scale>100

OUTPUT FORMAT - Return ONLY a JSON array, no markdown:
[{"filename":"name.png","state_key":"idle","state_title":"Idle Animation","sequence_order":1,"suggested_speed":400,"suggested_scale":100,"description":"Frame description"}]

Speed guidelines: talking=200ms, idle=400-600ms, actions=300ms
Scale range: 50-200 (100=no change)`
    });

    // Add each image
    for (const img of images) {
      content.push({
        type: "image_url",
        image_url: {
          url: img.base64
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
      
      throw new Error(`AI gateway error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const responseContent = data.choices?.[0]?.message?.content;
    
    console.log('AI raw response length:', responseContent?.length || 0);
    console.log('AI raw response:', responseContent?.substring(0, 500));

    if (!responseContent || responseContent.trim().length < 10) {
      console.error('AI returned empty or too short response:', responseContent);
      // Fallback: generate basic analysis from filenames only
      const fallbackAnalyzed = images.map((img, index) => {
        const filename = img.filename.toLowerCase();
        let state_key = 'misc';
        let state_title = 'Misc';
        let suggested_speed = 400;
        
        if (filename.includes('idle')) { state_key = 'idle'; state_title = 'Idle Animation'; suggested_speed = 500; }
        else if (filename.includes('talk')) { state_key = 'talk'; state_title = 'Talk Animation'; suggested_speed = 200; }
        else if (filename.includes('wave')) { state_key = 'wave'; state_title = 'Wave Animation'; suggested_speed = 300; }
        else if (filename.includes('think')) { state_key = 'thinking'; state_title = 'Thinking Animation'; suggested_speed = 400; }
        else if (filename.includes('happy')) { state_key = 'happy'; state_title = 'Happy Animation'; suggested_speed = 300; }
        
        return {
          filename: img.filename,
          state_key,
          state_title,
          sequence_order: index + 1,
          suggested_speed,
          suggested_scale: 100, // Default to no scaling when AI fails
          description: `Frame ${index + 1}`,
        };
      });
      
      console.log('Using fallback analysis:', fallbackAnalyzed);
      return new Response(
        JSON.stringify({ analyzed: fallbackAnalyzed, fallback: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the JSON response - handle markdown code blocks if present
    let analyzed: AnalyzedImage[];
    try {
      let jsonStr = responseContent.trim();
      // Remove markdown code blocks if present
      if (jsonStr.startsWith('```')) {
        const startIndex = jsonStr.indexOf('[');
        const endIndex = jsonStr.lastIndexOf(']');
        if (startIndex !== -1 && endIndex !== -1) {
          jsonStr = jsonStr.substring(startIndex, endIndex + 1);
        } else {
          throw new Error('Could not find JSON array in response');
        }
      }
      // Also try removing just json marker
      jsonStr = jsonStr.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      
      analyzed = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response:', responseContent);
      // Use fallback
      const fallbackAnalyzed = images.map((img, index) => ({
        filename: img.filename,
        state_key: 'misc',
        state_title: 'Animation',
        sequence_order: index + 1,
        suggested_speed: 400,
        suggested_scale: 100,
        description: `Frame ${index + 1}`,
      }));
      
      return new Response(
        JSON.stringify({ analyzed: fallbackAnalyzed, fallback: true, parseError: String(parseError) }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!Array.isArray(analyzed)) {
      throw new Error("AI response is not an array");
    }

    // Validate and ensure all required fields
    const validated = analyzed.map((item, index) => ({
      filename: item.filename || images[index]?.filename || `image_${index}.png`,
      state_key: (item.state_key || 'misc').toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      state_title: item.state_title || item.state_key || 'Misc',
      sequence_order: item.sequence_order || index + 1,
      suggested_speed: item.suggested_speed || 400,
      suggested_scale: Math.min(200, Math.max(50, item.suggested_scale || 100)),
      description: item.description || '',
    }));

    console.log('Analyzed results:', validated.length, 'images');

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
