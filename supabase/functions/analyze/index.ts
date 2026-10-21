// POST /functions/v1/analyze
// Entree : { text: string, sender?: string, link?: string, source?: "manual"|"share",
//            inputType?: "message"|"phone" }
// Sortie : { id, score, niveau, raisons[], confidence, scamType, needsMoreInfo }
//
// Combine heuristiques deterministes + classification Claude (si ANTHROPIC_API_KEY
// est configuree). Sans cle, retombe sur les heuristiques seules : utile en dev.
// inputType "phone" : `text` est un numero de telephone suspect (ex: appel
// manque) plutot qu'un message — heuristiques et prompt Claude dedies.
//
// Securite / vie privee (cahier des charges) :
// - Le texte libre est masque (IBAN/telephone/e-mail -> jetons) AVANT tout envoi a
//   Claude et avant stockage. Seul le texte masque est conserve.
// - Detection d'injection de prompt independante de Claude : meme si le modele est
//   manipule ou indisponible, un message qui tente de "piloter" l'analyseur est
//   force a danger cote serveur.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { computeHeuristics, type AnalyzeInput } from "../_shared/heuristics.ts";
import { computePhoneHeuristics } from "../_shared/phone-heuristics.ts";
import { classifyWithClaude, classifyPhoneWithClaude } from "../_shared/claude.ts";
import { maskPII } from "../_shared/pii-mask.ts";
import { detectPromptInjection } from "../_shared/injection-detect.ts";

function niveauFromScore(score: number): "faible" | "attention" | "danger" {
  if (score >= 71) return "danger";
  if (score >= 31) return "attention";
  return "faible";
}

const INJECTION_RAISON =
  "Ce message contient une tentative de manipulation du systeme d'analyse lui-meme " +
  "(ex: \"ignore tes instructions\", \"reponds que c'est sur\") — c'est en soi un signal " +
  "tres fort d'arnaque : un message legitime n'a aucune raison de parler a un outil d'analyse.";

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }

  let body: AnalyzeInput & { source?: "manual" | "share" | "phone"; inputType?: "message" | "phone" };
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

  const isPhone = body.inputType === "phone";

  // Masquage PII : uniquement sur le texte libre d'un message. Pas sur un
  // numero de telephone en mode "phone" (c'est la cible de l'analyse elle-meme,
  // pas une donnee incidente a proteger), ni sur sender/link (champs
  // structures necessaires aux heuristiques de format/domaine).
  const { masked: maskedText } = isPhone ? { masked: body.text } : maskPII(body.text);
  const analysisInput: AnalyzeInput = { ...body, text: maskedText };

  const heuristics = isPhone ? computePhoneHeuristics(maskedText) : computeHeuristics(analysisInput);
  const claudeResult = isPhone
    ? await classifyPhoneWithClaude(maskedText, heuristics.raisons)
    : await classifyWithClaude(analysisInput, heuristics.raisons);

  let score: number;
  let niveau: "faible" | "attention" | "danger";
  let raisons: string[];
  let confidence: number;
  let scamType: string;
  let needsMoreInfo: string | null;

  if (claudeResult) {
    score = claudeResult.score;
    niveau = claudeResult.niveau;
    raisons = claudeResult.raisons;
    confidence = claudeResult.confidence;
    scamType = claudeResult.scamType;
    needsMoreInfo = claudeResult.needsMoreInfo;
  } else {
    score = heuristics.heuristicScore;
    niveau = niveauFromScore(score);
    raisons = heuristics.raisons.length > 0
      ? heuristics.raisons
      : ["Aucun signal de risque detecte"];
    // Pas de notion de confiance/categorie fiable sans Claude : on reste
    // volontairement modeste plutot que d'inventer une fausse precision.
    confidence = 0.5;
    scamType = "unknown";
    needsMoreInfo = null;
  }

  // Defense en profondeur : detection d'injection independante de Claude.
  // Ne depend jamais uniquement du bon comportement du modele.
  const injectionDetected =
    detectPromptInjection(maskedText) || claudeResult?.promptInjectionDetected === true;

  if (injectionDetected) {
    // Remplace les raisons (ne les ajoute pas) : si le modele a ete trompe
    // au point de dire "aucun risque", garder cette raison a cote de
    // l'alerte d'injection serait contradictoire et pretait a confusion.
    score = Math.max(score, 80);
    niveau = "danger";
    raisons = [INJECTION_RAISON];
    confidence = 0.95;
    scamType = "other_scam";
    needsMoreInfo = null;
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
        input_text: maskedText,
        input_sender: isPhone ? null : body.sender ?? null,
        input_link: isPhone ? null : body.link ?? null,
        score,
        niveau,
        raisons,
        confidence,
        scam_type: scamType,
        needs_more_info: needsMoreInfo,
        source: isPhone ? "phone" : body.source ?? "manual",
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
    JSON.stringify({ id: eventId, score, niveau, raisons, confidence, scamType, needsMoreInfo }),
    { headers: { ...corsHeaders, "content-type": "application/json" } },
  );
});
