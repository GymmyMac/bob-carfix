import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Convert plain text to SSML with pronunciation fixes
function convertToSSML(text: string): string {
  // Escape XML special characters first
  let escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // Replace CARFIX with phoneme pronunciation (case-insensitive)
  // IPA: ˈkɑɹ.fɪks = "CAR-fix" with stress on first syllable
  escaped = escaped.replace(
    /CARFIX/gi,
    '<phoneme alphabet="ipa" ph="ˈkɑɹ.fɪks">CARFIX</phoneme>'
  );
  
  return `<speak>${escaped}</speak>`;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voice: requestVoice } = await req.json();
    const apiKey = Deno.env.get("GOOGLE_CLOUD_TTS_API_KEY");
    
    if (!apiKey) {
      console.error("GOOGLE_CLOUD_TTS_API_KEY not configured");
      throw new Error("GOOGLE_CLOUD_TTS_API_KEY not configured");
    }
    
    if (!text?.trim()) {
      throw new Error("No text provided");
    }

    // Helper to check if voice ID is a Google Cloud TTS voice format (e.g., "en-AU-Neural2-B")
    const isGoogleVoice = (voice: string): boolean => {
      // Google voices follow pattern: language-region-type-variant (e.g., en-AU-Neural2-B, en-US-Wavenet-D)
      return /^[a-z]{2}-[A-Z]{2}-(Neural2|Wavenet|Standard)-[A-Z]$/i.test(voice);
    };

    // Determine voice: use request voice, or fetch from database, or use default
    let voiceName = requestVoice;
    
    if (!voiceName) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY");
        
        if (supabaseUrl && supabaseKey) {
          const settingResponse = await fetch(
            `${supabaseUrl}/rest/v1/bob_settings?setting_key=eq.tts_voice&select=setting_value`,
            {
              headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
              },
            }
          );
          
          if (settingResponse.ok) {
            const settings = await settingResponse.json();
            const storedVoice = settings?.[0]?.setting_value;
            
            // Only use stored voice if it's a valid Google voice format
            // ElevenLabs voice IDs are alphanumeric strings like "JBFqnCBsd6RMkjVDRZzb"
            if (storedVoice && isGoogleVoice(storedVoice)) {
              voiceName = storedVoice;
              console.log(`Using Google voice from database: ${voiceName}`);
            } else if (storedVoice) {
              console.log(`Stored voice "${storedVoice}" is not a Google voice format, using default`);
            }
          }
        }
      } catch (dbError) {
        console.warn("Could not fetch voice from database:", dbError);
      }
    }
    
    // Default fallback - always use a valid Google voice
    if (!voiceName || !isGoogleVoice(voiceName)) {
      voiceName = "en-AU-Neural2-B";
      console.log(`Using default Google voice: ${voiceName}`);
    }

    // Extract language code from voice name (e.g., "en-AU-Neural2-B" -> "en-AU")
    const languageCode = voiceName.split("-").slice(0, 2).join("-");

    console.log(`Generating TTS for text: "${text.substring(0, 50)}..." with voice: ${voiceName}`);

    // Create abort controller for timeout (8 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: { ssml: convertToSSML(text) },
            voice: {
              languageCode,
              name: voiceName,
            },
            audioConfig: {
              audioEncoding: "MP3",
              speakingRate: 0.95,
              pitch: 0,
            },
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.text();
        console.error("Google TTS API error:", response.status, error);
        throw new Error(`TTS API error: ${response.status}`);
      }

      const data = await response.json();
      console.log("TTS audio generated successfully");
      
      return new Response(
        JSON.stringify({ audioContent: data.audioContent }),
        { 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=3600" // Cache for 1 hour
          } 
        }
      );
    } catch (fetchError: unknown) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error("Google TTS API timeout after 8s");
        throw new Error("TTS API timeout");
      }
      throw fetchError;
    }
  } catch (error) {
    console.error("bob-tts error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
