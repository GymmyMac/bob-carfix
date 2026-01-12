import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Default voice: George - warm, friendly (great for Bob's Kiwi character)
const DEFAULT_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb";

// Sanitize text for better TTS pronunciation
const sanitizeForTTS = (text: string): string => {
  return text
    // Fix CARFIX pronunciation
    .replace(/CARFIX/gi, "Car Fix")
    
    // Kiwi automotive terms
    .replace(/\brego\b/gi, "rejo")           // Vehicle registration
    .replace(/\bWOF\b/g, "woff")             // Warrant of Fitness
    .replace(/\bWof\b/g, "woff")
    .replace(/\bCOF\b/g, "coff")             // Certificate of Fitness
    
    // Fix Kiwi slang - "ya" sounds wrong in TTS
    .replace(/\bya\b/gi, "you")
    .replace(/\bon ya\b/gi, "on you")
    .replace(/\bare ya\b/gi, "are you")
    .replace(/\bsee ya\b/gi, "see you")
    .replace(/\bhow are ya\b/gi, "how are you")
    .replace(/\bgood on ya\b/gi, "good on you")
    .replace(/\bfor ya\b/gi, "for you")
    .replace(/\bto ya\b/gi, "to you")
    .replace(/\bwith ya\b/gi, "with you")
    
    // Fix common abbreviations
    .replace(/\bG'day\b/gi, "G'day")
    .replace(/\bmate\b/gi, "mate");
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voiceId } = await req.json();

    if (!text || typeof text !== "string") {
      return new Response(
        JSON.stringify({ error: "Text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      console.error("[bob-tts-elevenlabs] Missing ELEVENLABS_API_KEY");
      return new Response(
        JSON.stringify({ error: "ElevenLabs API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get voice from request, database setting, or use default
    let selectedVoice = voiceId || DEFAULT_VOICE_ID;

    // Try to get voice from database settings if not provided
    if (!voiceId) {
      try {
        const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
        const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
        
        if (SUPABASE_URL && SUPABASE_ANON_KEY) {
          const settingsResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/bob_settings?setting_key=eq.tts_voice&select=setting_value`,
            {
              headers: {
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
              },
            }
          );
          
          if (settingsResponse.ok) {
            const settings = await settingsResponse.json();
            if (settings?.[0]?.setting_value) {
              selectedVoice = settings[0].setting_value;
              console.log(`[bob-tts-elevenlabs] Using voice from settings: ${selectedVoice}`);
            }
          }
        }
      } catch (settingsError) {
        console.warn("[bob-tts-elevenlabs] Could not fetch voice setting:", settingsError);
      }
    }

    const sanitizedText = sanitizeForTTS(text);
    console.log(`[bob-tts-elevenlabs] Generating speech with voice ${selectedVoice}: "${sanitizedText.substring(0, 50)}..."`);

    // Use streaming endpoint for lowest latency
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoice}/stream?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: sanitizedText,
          model_id: "eleven_turbo_v2_5", // Optimized for real-time, lowest latency
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.3, // Slight style for personality
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[bob-tts-elevenlabs] ElevenLabs API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "ElevenLabs TTS failed", details: errorText }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Stream the audio response directly to client
    console.log("[bob-tts-elevenlabs] Streaming audio response");
    
    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("[bob-tts-elevenlabs] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
