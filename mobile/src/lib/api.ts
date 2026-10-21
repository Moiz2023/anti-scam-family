import { supabase } from "./supabase";

// Garantit qu'une ligne profiles existe pour l'utilisateur connecte. Doit
// etre idempotent et appele a chaque connexion : si l'inscription a eu lieu
// avec confirmation d'e-mail active, la session n'existait pas encore au
// moment du signUp et la creation du profil dans RegisterScreen a pu
// echouer silencieusement (RLS bloque un insert sans session valide) — ce
// filet de securite evite qu'un compte reste durablement sans profil.
export async function ensureProfile(): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const fullName = (user.user_metadata?.full_name as string | undefined) ?? null;

  const { error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, full_name: fullName }, { onConflict: "id", ignoreDuplicates: true });

  if (error) {
    console.warn("ensureProfile failed", error);
  }
}

export type ScamType =
  | "fake_bank_advisor"
  | "phishing_bank"
  | "itsme_phishing"
  | "parcel_bpost_dhl"
  | "tax_government"
  | "family_emergency"
  | "law_enforcement_scam"
  | "romance_scam"
  | "investment_crypto"
  | "tech_support"
  | "utilities_telecom"
  | "health_mutuality"
  | "marketplace_scam"
  | "prize_lottery"
  | "job_scam"
  | "subscription_trap"
  | "other_scam"
  | "legitimate"
  | "unknown";

export interface AnalyzeResult {
  id: string | null;
  score: number;
  niveau: "faible" | "attention" | "danger";
  raisons: string[];
  confidence?: number;
  scamType?: ScamType;
  needsMoreInfo?: string | null;
}

export async function analyzeMessage(input: {
  text?: string;
  sender?: string;
  link?: string;
  source?: "manual" | "share";
  inputType?: "message" | "phone" | "screenshot";
  imageBase64?: string;
  imageMediaType?: string;
}): Promise<AnalyzeResult> {
  const { data, error } = await supabase.functions.invoke("analyze", {
    body: input,
  });
  if (error) {
    // supabase-js n'expose pas toujours le JSON d'erreur structure de facon
    // uniforme selon le code de statut : on essaie de recuperer notre
    // message, sinon on relance l'erreur generique.
    const context = (error as { context?: Response }).context;
    let customMessage: string | undefined;
    if (context) {
      try {
        const responseBody = await context.clone().json();
        customMessage = responseBody?.message;
      } catch {
        // pas de JSON exploitable, on retombe sur l'erreur generique
      }
    }
    throw customMessage ? new Error(customMessage) : error;
  }
  return data as AnalyzeResult;
}

export async function submitAnalysisFeedback(
  analysisEventId: string,
  feedbackType: "too_strict" | "too_lenient",
  comment?: string,
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not_authenticated");

  const { error } = await supabase.from("analysis_feedback").insert({
    analysis_event_id: analysisEventId,
    reported_by: user.id,
    feedback_type: feedbackType,
    comment: comment ?? null,
  });
  if (error) throw error;
}

export async function requestFamilyCheck(analysisEventId: string) {
  const { data, error } = await supabase.functions.invoke("family-check", {
    body: { analysisEventId },
  });
  if (error) throw error;
  return data as { familyChecks: unknown[]; notifiedProtectors: number; message?: string };
}

export async function registerPushToken(expoPushToken: string, deviceName?: string) {
  const { error } = await supabase.functions.invoke("register-push-token", {
    body: { expoPushToken, deviceName },
  });
  if (error) throw error;
}

// Consentement de partage (cahier des charges : explicite, avec ecran de
// transparence, requis AVANT qu'un proche puisse voir la moindre alerte).
export async function getSharingConsentStatus(): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from("profiles")
    .select("consent_sharing_at")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data?.consent_sharing_at);
}

export async function grantSharingConsent(): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not_authenticated");

  const { error } = await supabase
    .from("profiles")
    .update({ consent_sharing_at: new Date().toISOString() })
    .eq("id", user.id);
  if (error) throw error;
}

export async function revokeSharingConsent(): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not_authenticated");

  const { error } = await supabase
    .from("profiles")
    .update({ consent_sharing_at: null })
    .eq("id", user.id);
  if (error) throw error;
}

export async function createInviteCode(): Promise<string> {
  const code = Math.random().toString(36).slice(2, 8).toUpperCase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not_authenticated");

  const { error } = await supabase.from("invite_codes").insert({
    code,
    protected_id: user.id,
  });
  if (error) throw error;
  return code;
}

export async function redeemInviteCode(code: string) {
  const { data, error } = await supabase.rpc("redeem_invite_code", {
    p_code: code.trim().toUpperCase(),
  });
  if (error) throw error;
  return data;
}

export interface RiskEvent {
  id: string;
  protected_id: string;
  score: number;
  niveau: "faible" | "attention" | "danger";
  raisons: string[];
  created_at: string;
  input_text: string | null;
  scam_type?: ScamType | null;
}

export async function fetchFamilyRiskEvents(limit = 50): Promise<RiskEvent[]> {
  // Grace a RLS (analysis_events_owner_all + analysis_events_family_select),
  // retourne a la fois mes propres evenements a risque et ceux des personnes
  // que je protege : exactement le flux d'activite familial recherche.
  const { data, error } = await supabase
    .from("analysis_events")
    .select("id, protected_id, score, niveau, raisons, created_at, input_text, scam_type")
    .in("niveau", ["attention", "danger"])
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as RiskEvent[];
}

export interface FamilyCheckRow {
  id: string;
  analysis_event_id: string;
  status: "pending" | "confirmed" | "denied";
  created_at: string;
}

export interface FamilyCheckWithEvent extends FamilyCheckRow {
  analysis_events: RiskEvent | null;
}

export async function fetchPendingChecksWithEvents(): Promise<FamilyCheckWithEvent[]> {
  const { data, error } = await supabase
    .from("family_checks")
    .select(
      "id, analysis_event_id, status, created_at, analysis_events(id, protected_id, score, niveau, raisons, created_at, input_text, scam_type)",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as unknown as FamilyCheckWithEvent[];
}

export async function fetchMyFamilyChecks(): Promise<FamilyCheckRow[]> {
  const { data, error } = await supabase
    .from("family_checks")
    .select("id, analysis_event_id, status, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data as FamilyCheckRow[];
}

export async function respondFamilyCheck(id: string, confirmed: boolean) {
  // Passe par l'edge function (plutot qu'un update direct) pour notifier la
  // personne protegee du resultat : sans ca, elle n'a aucun moyen de savoir
  // que son proche a repondu sans rouvrir l'app.
  const { error } = await supabase.functions.invoke("respond-family-check", {
    body: { checkId: id, confirmed },
  });
  if (error) throw error;
}

export interface LinkedPerson {
  id: string;
  full_name: string | null;
}

export async function fetchProtectedPersons(): Promise<LinkedPerson[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: links, error } = await supabase
    .from("family_links")
    .select("protected_id")
    .eq("protector_id", user.id)
    .eq("status", "active");
  if (error) throw error;

  const ids = (links ?? []).map((l) => l.protected_id);
  if (ids.length === 0) return [];

  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", ids);
  if (profileError) throw profileError;

  return (profiles ?? []).map((p) => ({ id: p.id, full_name: p.full_name }));
}

export async function fetchMyProtectors(): Promise<LinkedPerson[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: links, error } = await supabase
    .from("family_links")
    .select("protector_id")
    .eq("protected_id", user.id)
    .eq("status", "active");
  if (error) throw error;

  const ids = (links ?? []).map((l) => l.protector_id);
  if (ids.length === 0) return [];

  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", ids);
  if (profileError) throw profileError;

  return (profiles ?? []).map((p) => ({ id: p.id, full_name: p.full_name }));
}

export interface CampaignTrend {
  scam_type: ScamType;
  niveau: "attention" | "danger";
  affected_count: number;
  first_seen: string;
  last_seen: string;
}

// "Nouvelle campagne" : vagues d'arnaques detectees sur TOUS les
// utilisateurs (donnees agregees et anonymes, jamais de contenu individuel
// — voir la fonction SQL get_campaign_trends).
export async function fetchCampaignTrends(): Promise<CampaignTrend[]> {
  const { data, error } = await supabase.rpc("get_campaign_trends", {
    hours_window: 48,
    min_affected: 3,
  });
  if (error) throw error;
  return (data ?? []) as CampaignTrend[];
}

// Droit a l'effacement (RGPD) : supprime le compte de l'utilisateur courant
// et, par cascade cote serveur, toutes ses donnees (profil, liens
// familiaux, verifications, alertes, feedback, tokens push).
export async function deleteMyAccount(): Promise<void> {
  const { error } = await supabase.functions.invoke("delete-account", { body: {} });
  if (error) throw error;
}
