import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ConversationPayload {
  session_id: string;
  user_id?: string | null;
  channel?: string;
  vehicle_id?: string | null;
  rego?: string | null;
  had_product_match?: boolean;
  led_to_cart?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: ConversationPayload = await req.json();

    if (!body.session_id) {
      return new Response(
        JSON.stringify({ error: "session_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Upsert: insert if new session, update counters if existing
    const { data, error } = await supabase.rpc("upsert_bob_conversation", {
      p_session_id: body.session_id,
      p_user_id: body.user_id || null,
      p_channel: body.channel || "web",
      p_vehicle_id: body.vehicle_id || null,
      p_rego: body.rego || null,
      p_had_product_match: body.had_product_match || false,
      p_led_to_cart: body.led_to_cart || false,
    });

    if (error) {
      console.error("[bob-conversation-track] Upsert error:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[bob-conversation-track] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
