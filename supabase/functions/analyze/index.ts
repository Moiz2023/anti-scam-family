// POST /functions/v1/analyze
// Entree : { text?, sender?, link?, source?, inputType?: "message"|"phone"|"screenshot",
//            imageBase64?, imageMediaType? }
// Sortie : { id, score, niveau, raisons[], confidence, scamType, needsMoreInfo }
//
// Combine heuristiques deterministes + classification Claude (si ANTHROPIC_API_KEY
// est configuree). Sans cle, retombe sur les heuristiques seules : utile en dev.
// inputType "phone" : `text` est un numero de telephone suspect plutot qu'un message.
// inputType "screenshot" : `imageBase64`/`imageMediaType` remplacent `text` — pas d'OCR
// local (Expo Go), Claude transcrit ET analyse l'image en un seul appel (vision).
// Necessite Claude (pas de fallback heuristique possible sur une image).
//
// Securite / vie privee (cahier des charges) :
// - Le texte libre (et le texte extrait d'une capture) est masque (IBAN/telephone/
//   e-mail -> jetons) AVANT stockage. Seul le texte masque est conserve.
// - Detection d'injection de prompt independante de Claude.
// - Rate limiting par utilisateur (ou IP si non authentifie) avant tout appel Claude
//   couteux.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { computeHeuristics, type AnalyzeInput } from "../_shared/heuristics.ts";
import { computePhoneHeuristics } from "../_shared/phone-heuristics.ts";
import {
  classifyWithClaude,
  classifyPhoneWithClaude,
  classifyScreenshotWithClaude,
} from "../_shared/claude.ts";
import { maskPII } from "../_shared/pii-mask.ts";
import { detectPromptInjection } from "../_shared/injection-detect.ts";
import { isWithinRateLimit, rateLimitKeyFor } from "../_shared/rate-limit.ts";

function niveauFromScore(score: number): "faible" | "attention" | "danger" {
  if (score >= 71) return "danger";
  if (score >= 31) return "attention";
  return "faible";
}

const INJECTION_RAISON =
  "Ce message contient une tentative de manipulation du systeme d'analyse lui-meme " +
  "(ex: \"ignore tes instructions\", \"reponds que c'est sur\") — c'est en soi un signal " +
  "tres fort d'arnaque : un message legitime n'a aucune raison de parler a un outil d'analyse.";

const RATE_LIMIT_REQUESTS = 20;
const RATE_LIMIT_WINDOW_SECONDS = 60;

type Body = AnalyzeInput & {
  source?: "manual" | "share" | "phone" | "screenshot";
  inputType?: "message" | "phone" | "screenshot";
  imageBase64?: string;
  imageMediaType?: string;
};

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }

  const isPhone = body.inputType === "phone";
  const isScreenshot = body.inputType === "screenshot";

  if (isScreenshot) {
    if (!body.imageBase64 || typeof body.imageBase64 !== "string") {
      return new Response(JSON.stringify({ error: "image_required" }), {
        status: 400,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }
  } else if (!body.text || typeof body.text !== "string" || body.text.trim().length === 0) {
    return new Response(JSON.stringify({ error: "text_required" }), {
      status: 400,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: authHeader ? { Authorization: authHeader } : {} },
  });
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;

  // Rate limit avant tout appel Claude couteux (jamais apres : on ne paie pas
  // pour une requete qu'on va de toute facon rejeter).
  const admin = createClient(supabaseUrl, serviceRoleKey);
  const rateLimitKey = rateLimitKeyFor(userId, req);
  const allowed = await isWithinRateLimit(admin, rateLimitKey, RATE_LIMIT_REQUESTS, RATE_LIMIT_WINDOW_SECONDS);
  if (!allowed) {
    return new Response(
      JSON.stringify({
        error: "rate_limited",
        message: "Trop de verifications en peu de temps. Reessaie dans une minute.",
      }),
      { status: 429, headers: { ...corsHeaders, "content-type": "application/json" } },
    );
  }

  let score: number;
  let niveau: "faible" | "attention" | "danger";
  let raisons: string[];
  let confidence: number;
  let scamType: string;
  let needsMoreInfo: string | null;
  let storedText: string | null;

  if (isScreenshot) {
    const claudeResult = await classifyScreenshotWithClaude(
      body.imageBase64!,
      body.imageMediaType ?? "image/jpeg",
    );

    if (!claudeResult) {
      return new Response(
        JSON.stringify({
          error: "screenshot_analysis_unavailable",
          message: "L'analyse de capture d'ecran necessite Claude, indisponible pour le moment.",
        }),
        { status: 503, headers: { ...corsHeaders, "content-type": "application/json" } },
      );
    }

    const { masked: maskedExtracted } = maskPII(claudeResult.extractedText ?? "");
    score = claudeResult.score;
    niveau = claudeResult.niveau;
    raisons = claudeResult.raisons;
    confidence = claudeResult.confidence;
    scamType = claudeResult.scamType;
    needsMoreInfo = claudeResult.needsMoreInfo;
    storedText = maskedExtracted || null;

    const injectionDetected =
      detectPromptInjection(maskedExtracted) || claudeResult.promptInjectionDetected === true;
    if (injectionDetected) {
      score = Math.max(score, 80);
      niveau = "danger";
      raisons = [INJECTION_RAISON];
      confidence = 0.95;
      scamType = "other_scam";
      needsMoreInfo = null;
    }
  } else {
    // Masquage PII : uniquement sur le texte libre d'un message. Pas sur un
    // numero de telephone en mode "phone" (c'est la cible de l'analyse elle-meme),
    // ni sur sender/link (champs structures necessaires aux heuristiques).
    const { masked: maskedText } = isPhone ? { masked: body.text! } : maskPII(body.text!);
    const analysisInput: AnalyzeInput = { ...body, text: maskedText };

    const heuristics = isPhone ? computePhoneHeuristics(maskedText) : computeHeuristics(analysisInput);
    const claudeResult = isPhone
      ? await classifyPhoneWithClaude(maskedText, heuristics.raisons)
      : await classifyWithClaude(analysisInput, heuristics.raisons);

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

    const injectionDetected =
      detectPromptInjection(maskedText) || claudeResult?.promptInjectionDetected === true;
    if (injectionDetected) {
      score = Math.max(score, 80);
      niveau = "danger";
      raisons = [INJECTION_RAISON];
      confidence = 0.95;
      scamType = "other_scam";
      needsMoreInfo = null;
    }

    storedText = maskedText;
  }

  let eventId: string | null = null;
  if (userId) {
    const { data: inserted, error } = await supabase
      .from("analysis_events")
      .insert({
        protected_id: userId,
        input_text: storedText,
        input_sender: isPhone || isScreenshot ? null : body.sender ?? null,
        input_link: isPhone || isScreenshot ? null : body.link ?? null,
        score,
        niveau,
        raisons,
        confidence,
        scam_type: scamType,
        needs_more_info: needsMoreInfo,
        source: isPhone ? "phone" : isScreenshot ? "screenshot" : body.source ?? "manual",
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
