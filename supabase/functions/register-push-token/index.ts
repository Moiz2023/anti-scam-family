// POST /functions/v1/register-push-token
// Entree : { expoPushToken: string, deviceName?: string }
// Enregistre/replace le token push Expo de l'utilisateur courant.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }

  const { expoPushToken, deviceName } = await req.json().catch(() => ({}));
  if (!expoPushToken || typeof expoPushToken !== "string") {
    return new Response(JSON.stringify({ error: "expoPushToken_required" }), {
      status: 400,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const authHeader = req.headers.get("Authorization");

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: authHeader ? { Authorization: authHeader } : {} },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    return new Response(JSON.stringify({ error: "unauthenticated" }), {
      status: 401,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }

  const { error } = await supabase
    .from("push_tokens")
    .upsert(
      {
        user_id: userData.user.id,
        expo_push_token: expoPushToken,
        device_name: deviceName ?? null,
      },
      { onConflict: "expo_push_token" },
    );

  if (error) {
    console.error("upsert push_tokens failed", error);
    return new Response(JSON.stringify({ error: "upsert_failed" }), {
      status: 500,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
});
