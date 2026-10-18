import { supabase } from "./supabase";

export interface AnalyzeResult {
  id: string | null;
  score: number;
  niveau: "faible" | "attention" | "danger";
  raisons: string[];
}

export async function analyzeMessage(input: {
  text: string;
  sender?: string;
  link?: string;
  source?: "manual" | "share";
}): Promise<AnalyzeResult> {
  const { data, error } = await supabase.functions.invoke("analyze", {
    body: input,
  });
  if (error) throw error;
  return data as AnalyzeResult;
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
}

export async function fetchFamilyRiskEvents(limit = 50): Promise<RiskEvent[]> {
  // Grace a RLS (analysis_events_owner_all + analysis_events_family_select),
  // retourne a la fois mes propres evenements a risque et ceux des personnes
  // que je protege : exactement le flux d'activite familial recherche.
  const { data, error } = await supabase
    .from("analysis_events")
    .select("id, protected_id, score, niveau, raisons, created_at, input_text")
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
      "id, analysis_event_id, status, created_at, analysis_events(id, protected_id, score, niveau, raisons, created_at, input_text)",
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
  const { error } = await supabase
    .from("family_checks")
    .update({ status: confirmed ? "confirmed" : "denied", responded_at: new Date().toISOString() })
    .eq("id", id);
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
