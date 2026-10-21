import React, { useCallback, useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, spacing, shadow } from "../theme/colors";
import { supabase } from "../lib/supabase";
import { registerForPushNotifications } from "../lib/notifications";
import { fetchProtectedPersons, fetchMyProtectors, fetchFamilyRiskEvents, type LinkedPerson, type RiskEvent } from "../lib/api";
import type { TabParamList, AppStackParamList } from "../navigation/RootNavigator";

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, "DashboardTab">,
  NativeStackScreenProps<AppStackParamList>
>;

export default function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [protectedPersons, setProtectedPersons] = useState<LinkedPerson[]>([]);
  const [protectors, setProtectors] = useState<LinkedPerson[]>([]);
  const [events, setEvents] = useState<RiskEvent[]>([]);
  const [myId, setMyId] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setMyId(user?.id ?? null);

      const [pp, pr, recentEvents] = await Promise.all([
        fetchProtectedPersons(),
        fetchMyProtectors(),
        fetchFamilyRiskEvents(20),
      ]);
      setProtectedPersons(pp);
      setProtectors(pr);
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
    registerForPushNotifications().catch((err) => console.warn("push registration failed", err));
  }, []);

  const members = [...protectedPersons, ...protectors.filter((p) => !protectedPersons.some((pp) => pp.id === p.id))];
  const recentEvents24h = events.filter((e) => Date.now() - new Date(e.created_at).getTime() < 24 * 60 * 60 * 1000);
  const hasAlertsToday = recentEvents24h.length > 0;
  const daysSinceLastAlert = events.length > 0 ? Math.floor((Date.now() - new Date(events[0].created_at).getTime()) / 86400000) : null;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + spacing.lg }]}
      refreshControl={<RefreshControl refreshing={false} onRefresh={loadDashboard} tintColor={colors.ink} />}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoBadge}>
            <Ionicons name="shield-checkmark" size={18} color="#fff" />
          </View>
          <View>
            <Text style={styles.appName}>Anti-Scam Family</Text>
            <Text style={styles.appSubtitle}>Dashboard</Text>
          </View>
        </View>
        <Pressable style={styles.avatarButton} onPress={() => navigation.navigate("Account")}>
          <Ionicons name="person" size={18} color={colors.ink} />
        </Pressable>
      </View>

      <View style={styles.statusCard}>
        <View style={styles.statusTopRow}>
          <View style={[styles.statusDot, hasAlertsToday && { backgroundColor: colors.urgentText }]} />
          <Text style={[styles.statusEyebrow, hasAlertsToday && { color: colors.urgentText }]}>
            {hasAlertsToday ? "SIGNAL DÉTECTÉ" : "FAMILY SHIELD ACTIF"}
          </Text>
        </View>
        <Text style={styles.statusHeadline}>
          {hasAlertsToday
            ? `${recentEvents24h.length} message${recentEvents24h.length > 1 ? "s" : ""} à vérifier`
            : members.length > 0
              ? `${members.length} proche${members.length > 1 ? "s" : ""} protégé${members.length > 1 ? "s" : ""}`
              : "Votre protection est active"}
        </Text>
        <Text style={styles.statusSubtitle}>
          {hasAlertsToday
            ? "Un signal de risque a été détecté aujourd'hui dans votre famille."
            : "Aucune menace détectée aujourd'hui."}
        </Text>

        <View style={styles.statChipsRow}>
          <View style={styles.statChip}>
            <Ionicons name="shield-checkmark-outline" size={15} color={colors.text} />
            <View style={styles.statChipTextWrap}>
              <Text style={styles.statChipValue}>
                {daysSinceLastAlert === null ? "—" : daysSinceLastAlert === 0 ? "Aujourd'hui" : `${daysSinceLastAlert} j`}
              </Text>
              <Text style={styles.statChipLabel}>Depuis la dernière alerte</Text>
            </View>
          </View>
          <View style={styles.statChip}>
            <Ionicons name="people-outline" size={15} color={colors.text} />
            <View style={styles.statChipTextWrap}>
              <Text style={styles.statChipValue}>{members.length}</Text>
              <Text style={styles.statChipLabel}>Membres liés</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.darkCard}>
        <Text style={styles.darkCardEyebrow}>VÉRIFICATION RAPIDE</Text>
        <Text style={styles.darkCardTitle}>Un message ou appel suspect ?</Text>
        <Text style={styles.darkCardSubtitle}>
          Collez le texte ou choisissez une capture d'écran, on analyse tout de suite.
        </Text>
        <View style={styles.darkCardActionsRow}>
          <Pressable style={styles.analyzeButton} onPress={() => navigation.navigate("ScanTab")}>
            <Ionicons name="clipboard-outline" size={16} color={colors.ink} />
            <Text style={styles.analyzeButtonText}>Coller & analyser</Text>
          </Pressable>
          <Pressable style={styles.cameraButton} onPress={() => navigation.navigate("QrScan")}>
            <Ionicons name="qr-code-outline" size={18} color="#fff" />
          </Pressable>
        </View>
      </View>

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Cercle familial</Text>
        <Pressable onPress={() => navigation.navigate("FamilyManage")}>
          <Text style={styles.sectionLink}>Gérer</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.ink} style={{ marginVertical: spacing.xl }} />
      ) : members.length === 0 ? (
        <Pressable style={styles.emptyFamilyCard} onPress={() => navigation.navigate("FamilyManage")}>
          <Ionicons name="person-add-outline" size={22} color={colors.textMuted} />
          <Text style={styles.emptyFamilyText}>Aucun proche lié pour l'instant. Ajoutez-en un.</Text>
        </Pressable>
      ) : (
        <View style={styles.familyGrid}>
          {members.map((m) => {
            const isProtected = protectedPersons.some((pp) => pp.id === m.id);
            return (
              <Pressable key={m.id} style={styles.memberCard} onPress={() => navigation.navigate("FamilyManage")}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberAvatarText}>{(m.full_name ?? "?").charAt(0).toUpperCase()}</Text>
                </View>
                <Text style={styles.memberName} numberOfLines={1}>
                  {m.full_name ?? "Proche"}
                </Text>
                <View style={styles.memberStatusRow}>
                  <View style={styles.memberDot} />
                  <Text style={styles.memberStatusText}>{isProtected ? "Vous protégez" : "Vous protège"}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      <Pressable style={styles.callFamilyLink} onPress={() => navigation.navigate("CallFamily")}>
        <Ionicons name="call-outline" size={15} color={colors.ink} />
        <Text style={styles.callFamilyLinkText}>Appeler un proche maintenant</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: spacing.xl, paddingBottom: 110 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.lg },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  logoBadge: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  appName: { fontSize: 15, fontWeight: "800", color: colors.text },
  appSubtitle: { fontSize: 11.5, color: colors.textMuted },
  avatarButton: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  statusCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  statusTopRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: spacing.sm },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.faible },
  statusEyebrow: { fontSize: 11, fontWeight: "800", color: colors.faible, letterSpacing: 0.5 },
  statusHeadline: { fontSize: 22, fontWeight: "800", color: colors.text, lineHeight: 27 },
  statusSubtitle: { fontSize: 13, color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.lg },
  statChipsRow: { flexDirection: "row", gap: spacing.md },
  statChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.pillInactive,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  statChipTextWrap: { flex: 1, flexShrink: 1 },
  statChipValue: { fontSize: 13.5, fontWeight: "800", color: colors.text },
  statChipLabel: { fontSize: 10.5, color: colors.textMuted, marginTop: 1, flexWrap: "wrap" },
  darkCard: {
    backgroundColor: colors.ink,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    ...shadow.card,
  },
  darkCardEyebrow: { color: colors.faible, fontSize: 11, fontWeight: "800", letterSpacing: 0.6, marginBottom: spacing.sm },
  darkCardTitle: { color: "#fff", fontSize: 19, fontWeight: "800", marginBottom: spacing.xs },
  darkCardSubtitle: { color: "rgba(255,255,255,0.6)", fontSize: 13, lineHeight: 18, marginBottom: spacing.lg },
  darkCardActionsRow: { flexDirection: "row", gap: spacing.sm },
  analyzeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: "#fff",
    borderRadius: radius.sm,
    paddingVertical: spacing.lg,
  },
  analyzeButtonText: { color: colors.ink, fontWeight: "800", fontSize: 14.5 },
  cameraButton: {
    width: 48,
    borderRadius: radius.sm,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: colors.text },
  sectionLink: { fontSize: 13, fontWeight: "700", color: colors.ink, textDecorationLine: "underline" },
  emptyFamilyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
  },
  emptyFamilyText: { flex: 1, color: colors.textMuted, fontSize: 13 },
  familyGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  memberCard: {
    width: "47%",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    ...shadow.card,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.pillInactive,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  memberAvatarText: { fontWeight: "800", color: colors.text, fontSize: 14 },
  memberName: { fontSize: 13.5, fontWeight: "800", color: colors.text, marginBottom: 4 },
  memberStatusRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  memberDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.faible },
  memberStatusText: { fontSize: 11, color: colors.textMuted, fontWeight: "600" },
  callFamilyLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
  },
  callFamilyLinkText: { color: colors.ink, fontSize: 13, fontWeight: "700" },
});
