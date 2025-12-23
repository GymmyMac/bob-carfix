import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PARTNER_API_URL = "https://flpzjbasdsfwoeruyxgp.supabase.co/functions/v1/partner-api";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const partnerKey = Deno.env.get("CARFIX_PARTNER_API_KEY");
    if (!partnerKey) {
      throw new Error("CARFIX_PARTNER_API_KEY is not configured");
    }

    const { session_token } = await req.json();
    if (!session_token || typeof session_token !== "string") {
      return new Response(JSON.stringify({ error: "Missing session_token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("session-handoff: fetching session (token present)");

    const resp = await fetch(PARTNER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Partner-Key": partnerKey,
      },
      body: JSON.stringify({
        action: "get_session",
        session_token,
      }),
    });

    const text = await resp.text();
    if (!resp.ok) {
      console.error("session-handoff: partner-api failed", resp.status, text);
      return new Response(JSON.stringify({ error: `Session fetch failed: ${resp.status}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      console.error("session-handoff: invalid JSON from partner-api", text.slice(0, 300));
      return new Response(JSON.stringify({ error: "Invalid session response" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (data?.error) {
      console.error("session-handoff: partner-api returned error", data.error);
      return new Response(JSON.stringify({ error: data.error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawVehicle = data.vehicle ?? null;
    const rawVehicleId = rawVehicle?.vehicle_id ?? rawVehicle?.id ?? null;
    const vehicleIdNum = rawVehicleId == null ? null : Number.parseInt(String(rawVehicleId), 10);

    const normalizedVehicle = rawVehicle
      ? {
          ...rawVehicle,
          // Ensure the client always has vehicle_id (used for parts lookup)
          vehicle_id: Number.isFinite(vehicleIdNum) ? String(vehicleIdNum) : rawVehicle?.vehicle_id,
        }
      : null;

    const payload = {
      vehicle: normalizedVehicle,
      user_email: data.user_email ?? data.email ?? null,
      expires_at: data.expires_at ?? null,
    };

    console.log(
      "session-handoff: success",
      JSON.stringify({ hasVehicle: !!payload.vehicle, vehicle_id: payload.vehicle?.vehicle_id ?? null })
    );

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in session-handoff:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
