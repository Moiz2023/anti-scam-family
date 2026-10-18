import React, { useCallback, useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  colors,
  gradients,
  colorForNiveau,
  softColorForNiveau,
  radius,
  spacing,
  shadow,
} from "../theme/colors";
import { supabase } from "../lib/supabase";
import { registerForPushNotifications } from "../lib/notifications";
import { timeAgo } from "../lib/time";
import {
  fetchProtectedPersons,
  fetchMyProtectors,
  fetchFamilyRiskEvents,
  type LinkedPerson,
  type RiskEvent,
} from "../lib/api";
import type { TabParamList, AppStackParamList } from "../navigation/RootNavigator";

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, "HomeTab">,
  NativeStackScreenProps<AppStackParamList>
>;

export default function HomeScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<LinkedPerson[]>([]);
  const [events, setEvents] = useState<RiskEvent[]>([]);
  const [myId, setMyId] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setMyId(user?.id ?? null);

      const [protectedPersons, protectors, recentEvents] = await Promise.all([
        fetchProtectedPersons(),
        fetchMyProtectors(),
        fetchFamilyRiskEvents(5),
      ]);

      const byId = new Map<string, LinkedPerson>();
      [...protectedPersons, ...protectors].forEach((p) => byId.set(p.id, p));
      setMembers(Array.from(byId.values()));
      setEvents(recentEvents);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard]),
  );

  React.useEffect(() => {
    registerForPushNotifications().catch((err) =>
      console.warn("push registration failed", err),
    );
  }, []);

  const recentEvents24h = events.filter(
    (e) => Date.now() - new Date(e.created_at).getTime() < 24 * 60 * 60 * 1000,
  );
  const hasAlertsToday = recentEvents24h.length > 0;

  function nameFor(protectedId: string): string {
    if (protectedId === myId) return "Vous";
    return members.find((m) => m.id === protectedId)?.full_name ?? "Un proche";
  }

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.heroTop}>
          <Text style={styles.heroTitle}>Anti-Scam Family</Text>
          <Pressable style={styles.logoutIcon} onPress={() => supabase.auth.signOut()}>
            <Ionicons name="log-out-outline" size={20} color="#fff" />
          </Pressable>
        </View>

        <View style={[styles.statusBanner, hasAlertsToday && styles.statusBannerAlert]}>
          <View style={[styles.statusIcon, { backgroundColor: hasAlertsToday ? "#fff" : "rgba(255,255,255,0.25)" }]}>
            <Ionicons
              name={hasAlertsToday ? "warning" : "checkmark"}
              size={20}
              color={hasAlertsToday ? colors.attention : "#fff"}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.statusTitle, hasAlertsToday && styles.statusTitleAlert]}>
              {hasAlertsToday ? "Signal de risque détecté" : "Votre famille est protégée"}
            </Text>
            <Text style={[styles.statusSubtitle, hasAlertsToday && styles.statusSubtitleAlert]}>
              {hasAlertsToday
                ? `${recentEvents24h.length} message${recentEvents24h.length > 1 ? "s" : ""} à vérifier aujourd'hui`
                : "Aucune menace détectée aujourd'hui"}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <Text style={styles.sectionLabel}>Protection</Text>
      <View style={styles.darkCard}>
        <Ionicons name="search" size={22} color="#fff" />
        <Text style={styles.darkCardTitle}>Vérifier un message</Text>
        <Text style={styles.darkCardSubtitle}>SMS, WhatsApp, e-mail ou texte collé</Text>
        <Pressable style={styles.analyzeButton} onPress={() => navigation.navigate("Check")}>
          <Text style={styles.analyzeButtonText}>Analyser maintenant</Text>
        </Pressable>
        <Pressable style={styles.qrButton} onPress={() => navigation.navigate("QrScan")}>
          <Ionicons name="qr-code-outline" size={16} color="#fff" />
          <Text style={styles.qrButtonText}>Scanner un QR code</Text>
        </Pressable>
      </View>

      <Pressable
        style={styles.familyCard}
        onPress={() => navigation.navigate("FamilyTab")}
      >
        <View style={styles.familyCardHeader}>
          <Text style={styles.familyCardTitle}>Ma famille</Text>
          <View style={styles.familyCardHeaderRight}>
            <Pressable
              hitSlop={8}
              onPress={(e) => {
                e.stopPropagation();
                navigation.navigate("CallFamily");
              }}
              style={styles.callIconButton}
            >
              <Ionicons name="call" size={15} color={colors.attention} />
            </Pressable>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.brand} style={{ marginVertical: spacing.md }} />
        ) : members.length === 0 ? (
          <Text style={styles.emptyText}>Aucun proche lié pour l'instant.</Text>
        ) : (
          <>
            <View style={styles.avatarRow}>
              {members.slice(0, 6).map((m) => (
                <View key={m.id} style={styles.avatar}>
                  <Text style={styles.avatarText}>{(m.full_name ?? "?").charAt(0).toUpperCase()}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.familyCardCount}>
              {members.length} membre{members.length > 1 ? "s" : ""} lié{members.length > 1 ? "s" : ""}
            </Text>
            <View style={styles.activeRow}>
              <View style={styles.activeDot} />
              <Text style={styles.activeText}>Protection active</Text>
            </View>
          </>
        )}
      </Pressable>

      <Text style={styles.sectionLabel}>Dernières alertes</Text>
      {loading ? (
        <ActivityIndicator color={colors.brand} style={{ marginVertical: spacing.lg }} />
      ) : events.length === 0 ? (
        <View style={styles.alertCard}>
          <Text style={styles.emptyText}>Aucune alerte récente.</Text>
        </View>
      ) : (
        events.map((e) => {
          const niveauColor = colorForNiveau(e.niveau);
          return (
            <Pressable
              key={e.id}
              style={styles.alertCard}
              onPress={() =>
                navigation.navigate("Result", {
                  result: { id: e.id, score: e.score, niveau: e.niveau, raisons: e.raisons },
                  readOnly: e.protected_id !== myId,
                })
              }
            >
              <View style={[styles.alertIcon, { backgroundColor: softColorForNiveau(e.niveau) }]}>
                <Ionicons name={e.niveau === "danger" ? "warning" : "alert-circle"} size={18} color={niveauColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.alertTitle}>
                  {e.niveau === "danger" ? "Tentative de fraude détectée" : "Signal de risque détecté"}
                </Text>
                <Text style={styles.alertSubtitle}>
                  {nameFor(e.protected_id)} · {timeAgo(e.created_at)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingBottom: spacing.xxl },
  hero: {
    paddingTop: 64,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  heroTitle: { fontSize: 24, fontWeight: "800", color: "#fff" },
  logoutIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  statusBannerAlert: { backgroundColor: "rgba(255,255,255,0.95)" },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  statusTitle: { color: "#fff", fontWeight: "800", fontSize: 15.5 },
  statusTitleAlert: { color: colors.text },
  statusSubtitle: { color: "rgba(255,255,255,0.85)", fontSize: 12.5, marginTop: 2 },
  statusSubtitleAlert: { color: colors.textMuted },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.text,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginHorizontal: spacing.xl,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  darkCard: {
    backgroundColor: colors.dark,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginHorizontal: spacing.xl,
    ...shadow.card,
  },
  darkCardTitle: { color: "#fff", fontSize: 20, fontWeight: "800", marginTop: spacing.md },
  darkCardSubtitle: { color: "rgba(255,255,255,0.6)", fontSize: 13, marginTop: spacing.xs, marginBottom: spacing.lg },
  analyzeButton: {
    backgroundColor: "#fff",
    borderRadius: radius.sm,
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
  analyzeButtonText: { color: colors.dark, fontWeight: "800", fontSize: 15.5 },
  qrButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  qrButtonText: { color: "rgba(255,255,255,0.85)", fontWeight: "700", fontSize: 13 },
  familyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginHorizontal: spacing.xl,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  familyCardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  familyCardHeaderRight: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  callIconButton: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.attentionSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  familyCardTitle: { fontSize: 16, fontWeight: "800", color: colors.text },
  avatarRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.brandSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.brand, fontWeight: "800", fontSize: 14 },
  familyCardCount: { color: colors.textMuted, fontSize: 13, marginTop: spacing.md },
  activeRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.xs },
  activeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.faible },
  activeText: { color: colors.faible, fontSize: 12.5, fontWeight: "700" },
  emptyText: { color: colors.textMuted, fontSize: 13, marginTop: spacing.sm },
  alertCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  alertIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  alertTitle: { fontSize: 14.5, fontWeight: "700", color: colors.text },
  alertSubtitle: { fontSize: 12.5, color: colors.textMuted, marginTop: 2 },
});
