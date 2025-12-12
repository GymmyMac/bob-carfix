import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FileInfo {
  filename: string;
  index: number;
}

interface AnalyzedImage {
  filename: string;
  state_key: string;
  state_title: string;
  sequence_order: number;
  suggested_speed: number;
  description: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { filenames } = await req.json() as { filenames: string[] };
    
    if (!filenames || !Array.isArray(filenames) || filenames.length === 0) {
      return new Response(
        JSON.stringify({ error: "No filenames provided" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Analyzing ${filenames.length} files:`, filenames);

    const prompt = `You are an AI assistant that analyzes animation image filenames to organize them into animation states and sequences.

Given this list of image filenames for an animated character named "Bob", analyze them and return a JSON array organizing them into animation states with proper sequence ordering.

FILENAMES:
${filenames.map((f, i) => `${i + 1}. ${f}`).join('\n')}

RULES:
1. Group images by detected animation state (e.g., "idle", "talk", "wave", "thinking", "happy")
2. Look for naming patterns to infer state and sequence:
   - Common patterns: "idle_1.png", "talk-frame-2.png", "bob_wave_03.png", "talking_a.png"
   - Numbers or letters often indicate sequence order within a state
   - Words like "idle", "talk", "wave", "think", "happy", "complete", "hello", "greeting" indicate states
3. Generate friendly state titles (e.g., "talk" → "Talk Animation", "idle" → "Idle State")
4. Suggest appropriate animation speeds:
   - Talking/mouth movements: 200ms (fast)
   - Idle/breathing: 400-600ms (slow)
   - Waving/actions: 300ms (medium)
   - Default: 400ms
5. If you can't determine a pattern, use "misc" as state_key with sequence based on filename order
6. state_key should be lowercase with underscores (e.g., "talk", "idle", "wave_hello")

Return ONLY a valid JSON array with this structure (no markdown, no explanation):
[
  {
    "filename": "original_filename.png",
    "state_key": "talk",
    "state_title": "Talk Animation",
    "sequence_order": 1,
    "suggested_speed": 200,
    "description": "Talking frame 1"
  }
]`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a helpful assistant that analyzes animation filenames. Always respond with valid JSON only, no markdown formatting.' },
          { role: 'user', content: prompt }
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
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error("No content returned from AI");
    }

    console.log('AI raw response:', content);

    // Parse the JSON response - handle markdown code blocks if present
    let analyzed: AnalyzedImage[];
    try {
      let jsonStr = content.trim();
      // Remove markdown code blocks if present
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      analyzed = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      throw new Error(`Failed to parse AI response: ${parseError}`);
    }

    // Validate the response structure
    if (!Array.isArray(analyzed)) {
      throw new Error("AI response is not an array");
    }

    // Ensure all required fields are present
    const validated = analyzed.map((item, index) => ({
      filename: item.filename || filenames[index],
      state_key: (item.state_key || 'misc').toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      state_title: item.state_title || item.state_key || 'Misc',
      sequence_order: item.sequence_order || index + 1,
      suggested_speed: item.suggested_speed || 400,
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
