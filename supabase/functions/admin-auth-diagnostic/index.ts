import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface DiagnosticResult {
  authed: boolean;
  userId: string | null;
  email: string | null;
  isAdmin: boolean;
  reason: string;
  timestamp: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    const authHeader = req.headers.get("Authorization");
    
    if (!authHeader?.startsWith("Bearer ")) {
      const result: DiagnosticResult = {
        authed: false,
        userId: null,
        email: null,
        isAdmin: false,
        reason: "no_auth_header",
        timestamp: new Date().toISOString(),
      };
      return new Response(JSON.stringify(result), {
        status: 200, // Return 200 with diagnostic info, not 401
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create client with user's auth header for token verification
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify the token using getClaims
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      const result: DiagnosticResult = {
        authed: false,
        userId: null,
        email: null,
        isAdmin: false,
        reason: claimsError?.message || "invalid_token",
        timestamp: new Date().toISOString(),
      };
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
    const email = claimsData.claims.email as string | undefined;

    // Use service role client to check admin status (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .limit(1);

    if (roleError) {
      console.error("[admin-auth-diagnostic] Role query error:", roleError);
      const result: DiagnosticResult = {
        authed: true,
        userId,
        email: email || null,
        isAdmin: false,
        reason: `role_query_error: ${roleError.message}`,
        timestamp: new Date().toISOString(),
      };
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isAdmin = (roleData?.length ?? 0) > 0;
    const elapsed = Date.now() - startTime;

    console.log(`[admin-auth-diagnostic] userId=${userId} isAdmin=${isAdmin} elapsed=${elapsed}ms`);

    const result: DiagnosticResult = {
      authed: true,
      userId,
      email: email || null,
      isAdmin,
      reason: isAdmin ? "admin_confirmed" : "not_admin",
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[admin-auth-diagnostic] Unexpected error:", error);
    const result: DiagnosticResult = {
      authed: false,
      userId: null,
      email: null,
      isAdmin: false,
      reason: `server_error: ${error instanceof Error ? error.message : String(error)}`,
      timestamp: new Date().toISOString(),
    };
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
