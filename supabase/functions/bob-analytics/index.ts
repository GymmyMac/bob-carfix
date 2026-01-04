import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AnalyticsEvent {
  event_name: string;
  timestamp?: string;
  session_id: string;
  user_email?: string;
  user_id?: string;
  vehicle_id?: string;
  rego?: string;
  parameters?: Record<string, unknown>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    
    // Support single event or batch of events
    const events: AnalyticsEvent[] = Array.isArray(body) ? body : [body];
    
    if (events.length === 0) {
      return new Response(
        JSON.stringify({ error: "No events provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[bob-analytics] Processing ${events.length} event(s)`);

    // Transform events for database insertion
    const records = events.map((event) => {
      const params = event.parameters || {};
      
      return {
        event_name: event.event_name,
        session_id: event.session_id,
        user_email: event.user_email || null,
        user_id: event.user_id || null,
        vehicle_id: event.vehicle_id || null,
        rego: event.rego || null,
        parameters: params,
        created_at: event.timestamp || new Date().toISOString(),
        // Denormalized fields from parameters
        vehicle_make: params.vehicle_make as string || null,
        vehicle_model: params.vehicle_model as string || null,
        product_sku: params.sku as string || null,
        product_name: params.product_name as string || null,
        product_price: params.price as number || null,
        cart_value: params.cart_value as number || null,
        item_count: params.item_count as number || null,
      };
    });

    // Insert events into database
    const { data, error } = await supabase
      .from("bob_analytics_events")
      .insert(records)
      .select("id");

    if (error) {
      console.error("[bob-analytics] Insert error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to store analytics events", details: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[bob-analytics] Stored ${data?.length || 0} event(s)`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        stored: data?.length || 0,
        event_ids: data?.map(d => d.id) || []
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[bob-analytics] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});