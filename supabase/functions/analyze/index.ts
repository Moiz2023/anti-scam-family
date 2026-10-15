// POST /functions/v1/analyze
// Entree : { text: string, sender?: string, link?: string, source?: "manual"|"share" }
// Sortie : { id, score, niveau, raisons[] }
//
// Combine heuristiques deterministes + classification Claude (si ANTHROPIC_API_KEY
// est configuree). Sans cle, retombe sur les heuristiques seules : utile en dev.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { computeHeuristics, type AnalyzeInput } from "../_shared/heuristics.ts";
import { classifyWithClaude } from "../_shared/claude.ts";

function niveauFromScore(score: number): "faible" | "attention" | "danger" {
  if (score >= 71) return "danger";
  if (score >= 31) return "attention";
  return "faible";
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }

  let body: AnalyzeInput & { source?: "manual" | "share" };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }

  if (!body.text || typeof body.text !== "string" || body.text.trim().length === 0) {
    return new Response(JSON.stringify({ error: "text_required" }), {
      status: 400,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }

  const heuristics = computeHeuristics(body);
  const claudeResult = await classifyWithClaude(body, heuristics.raisons);

  let score: number;
  let niveau: "faible" | "attention" | "danger";
  let raisons: string[];

  if (claudeResult) {
    score = claudeResult.score;
    niveau = claudeResult.niveau;
    raisons = claudeResult.raisons;
  } else {
    score = heuristics.heuristicScore;
    niveau = niveauFromScore(score);
    raisons = heuristics.raisons.length > 0
      ? heuristics.raisons
      : ["Aucun signal de risque detecte"];
  }

  const authHeader = req.headers.get("Authorization");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: authHeader ? { Authorization: authHeader } : {} },
  });

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;

  let eventId: string | null = null;
  if (userId) {
    const { data: inserted, error } = await supabase
      .from("analysis_events")
      .insert({
        protected_id: userId,
        input_text: body.text,
        input_sender: body.sender ?? null,
        input_link: body.link ?? null,
        score,
        niveau,
        raisons,
        source: body.source ?? "manual",
      })
      .select("id")
      .single();

    if (error) {
      console.error("insert analysis_events failed", error);
    } else {
      eventId = inserted.id;
    }
  }

  return new Response(
    JSON.stringify({ id: eventId, score, niveau, raisons }),
    { headers: { ...corsHeaders, "content-type": "application/json" } },
  );
});
