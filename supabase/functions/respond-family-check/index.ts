// POST /functions/v1/respond-family-check
// Entree : { checkId: string, confirmed: boolean }
// Le proche (protecteur) repond OUI (confirmed=true, legitime) ou NON
// (confirmed=false, bloquer) a une alerte. Met a jour family_checks ET
// notifie la personne protegee du resultat — ferme la boucle du FAMILY
// CHECK, qui sinon reste invisible pour elle tant qu'elle ne rouvre pas
// l'app.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { sendExpoPushNotifications } from "../_shared/expo-push.ts";

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }

  const { checkId, confirmed } = await req.json().catch(() => ({}));
  if (!checkId || typeof confirmed !== "boolean") {
    return new Response(JSON.stringify({ error: "checkId_and_confirmed_required" }), {
      status: 400,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization");
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: authHeader ? { Authorization: authHeader } : {} },
  });

  const { data: userData, error: userError } = await callerClient.auth.getUser();
  if (userError || !userData?.user) {
    return new Response(JSON.stringify({ error: "unauthenticated" }), {
      status: 401,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
  const callerId = userData.user.id;

  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: check, error: checkError } = await admin
    .from("family_checks")
    .select("id, protector_id, analysis_event_id")
    .eq("id", checkId)
    .single();

  if (checkError || !check) {
    return new Response(JSON.stringify({ error: "family_check_not_found" }), {
      status: 404,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }

  if (check.protector_id !== callerId) {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }

  const { error: updateError } = await admin
    .from("family_checks")
    .update({ status: confirmed ? "confirmed" : "denied", responded_at: new Date().toISOString() })
    .eq("id", checkId);

  if (updateError) {
    console.error("update family_checks failed", updateError);
    return new Response(JSON.stringify({ error: "update_failed" }), {
      status: 500,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }

  const { data: event } = await admin
    .from("analysis_events")
    .select("protected_id, score")
    .eq("id", check.analysis_event_id)
    .single();

  let notified = 0;
  if (event?.protected_id) {
    const { data: protectorProfile } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", callerId)
      .single();

    const { data: tokens } = await admin
      .from("push_tokens")
      .select("expo_push_token")
      .eq("user_id", event.protected_id);

    const name = protectorProfile?.full_name ?? "Votre proche";
    const title = confirmed ? "Réponse de la famille" : "⚠️ Ne payez pas";
    const body = confirmed
      ? `${name} confirme : ce message est légitime.`
      : `${name} pense que c'est une arnaque. Ne payez pas et vérifiez par un autre moyen.`;

    const messages = (tokens ?? []).map((t) => ({
      to: t.expo_push_token as string,
      title,
      body,
      data: { analysisEventId: check.analysis_event_id, type: "family_check_response", confirmed },
    }));

    await sendExpoPushNotifications(messages);
    notified = messages.length;
  }

  return new Response(JSON.stringify({ ok: true, notified }), {
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
});
