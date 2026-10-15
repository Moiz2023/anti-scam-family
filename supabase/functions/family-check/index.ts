// POST /functions/v1/family-check
// Entree : { analysisEventId: string }
// Declenche par le bouton "Verifier avec ma famille". Cree un family_check
// "pending" pour chaque proche lie et leur envoie une notification push.
//
// Utilise la service role key car l'utilisateur protege doit pouvoir creer
// un family_checks pour un proche (protector_id != auth.uid()), ce que les
// policies RLS normales n'autorisent pas.

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

  const { analysisEventId } = await req.json().catch(() => ({ analysisEventId: null }));
  if (!analysisEventId) {
    return new Response(JSON.stringify({ error: "analysisEventId_required" }), {
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

  const { data: event, error: eventError } = await admin
    .from("analysis_events")
    .select("id, protected_id, niveau, score")
    .eq("id", analysisEventId)
    .single();

  if (eventError || !event) {
    return new Response(JSON.stringify({ error: "analysis_event_not_found" }), {
      status: 404,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }

  if (event.protected_id !== callerId) {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }

  const { data: links } = await admin
    .from("family_links")
    .select("protector_id")
    .eq("protected_id", callerId)
    .eq("status", "active");

  const protectorIds = (links ?? []).map((l) => l.protector_id as string);

  if (protectorIds.length === 0) {
    return new Response(
      JSON.stringify({ familyChecks: [], notifiedProtectors: 0, message: "no_linked_family" }),
      { headers: { ...corsHeaders, "content-type": "application/json" } },
    );
  }

  const checksToInsert = protectorIds.map((protectorId) => ({
    analysis_event_id: analysisEventId,
    protector_id: protectorId,
    status: "pending",
  }));

  const { data: insertedChecks, error: insertError } = await admin
    .from("family_checks")
    .insert(checksToInsert)
    .select("id, protector_id");

  if (insertError) {
    console.error("insert family_checks failed", insertError);
    return new Response(JSON.stringify({ error: "insert_failed" }), {
      status: 500,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", callerId)
    .single();

  const { data: tokens } = await admin
    .from("push_tokens")
    .select("expo_push_token, user_id")
    .in("user_id", protectorIds);

  const name = profile?.full_name ?? "Un proche protege";
  const niveauLabel = event.niveau === "danger" ? "DANGER" : "ATTENTION";

  const messages = (tokens ?? []).map((t) => ({
    to: t.expo_push_token as string,
    title: `Anti-Scam Family — ${niveauLabel}`,
    body: `${name} a recu un message a risque (score ${event.score}/100). Verifiez avant tout paiement.`,
    data: { analysisEventId, type: "family_check" },
  }));

  await sendExpoPushNotifications(messages);

  return new Response(
    JSON.stringify({
      familyChecks: insertedChecks,
      notifiedProtectors: messages.length,
    }),
    { headers: { ...corsHeaders, "content-type": "application/json" } },
  );
});
