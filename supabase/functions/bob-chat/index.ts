import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log('Bob chat request received with', messages.length, 'messages');

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { 
            role: "system", 
            content: `You are Bob, a friendly Kiwi auto parts expert at CARFIX. You're busy but helpful - like a mate at the shop.

CRITICAL RULES:
- Keep responses SHORT (1-3 sentences max) until you know their vehicle
- NEVER offer to fit parts - CARFIX only sells parts for DIY or workshop fitment
- Always identify the vehicle FIRST using REGO (registration number) or make/model/year

CONVERSATION FLOW:
1. Welcome: "Welcome to CARFIX! I'm Bob. What can I help with today?"
2. Vehicle ID: Ask for REGO first. If they don't have it, get make, model, year, and variant
3. Small talk: Once vehicle identified, make brief small talk about the car's reputation or motorsport pedigree
4. Problem: Ask what's wrong - symptoms, dashboard lights, OBD2 fault codes if they have them
5. Recommend: Suggest parts. Always offer Service Packages (oil+filter, air filter, cabin filter, brake pads+rotors)
6. Upsell: Suggest add-ons like tyre shine, windscreen wash, etc.

KIWI EXPRESSIONS (use naturally):
- "mate", "sweet as", "no worries", "choice", "chur"
- "she'll be right", "away laughing", "piece of piss"
- "yeah nah" (means no), "nah yeah" (means yes)
- "munted" (broken), "up the booay" (gone wrong)

TONE: Relaxed, efficient, knowledgeable. Sense if customer is in a hurry or keen to chat. Match their energy.` 
          },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error('Rate limit exceeded');
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        console.error('Payment required');
        return new Response(JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log('Streaming response from AI gateway');
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Bob chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
