import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, colorForNiveau, labelForNiveau, radius, spacing, shadow } from "../theme/colors";
import { SCAM_TYPE_LABELS } from "../theme/scamTypes";
import { timeAgo } from "../lib/time";
import { supabase } from "../lib/supabase";
import {
  fetchFamilyRiskEvents,
  fetchPendingChecksWithEvents,
  fetchProtectedPersons,
  fetchMyProtectors,
  respondFamilyCheck,
  type RiskEvent,
  type FamilyCheckWithEvent,
  type LinkedPerson,
} from "../lib/api";
import type { AppStackParamList } from "../navigation/RootNavigator";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Filter = "all" | "danger" | "pending";

export default function ActivityScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const insets = useSafeAreaInsets();
  const [events, setEvents] = useState<RiskEvent[]>([]);
  const [pendingChecks, setPendingChecks] = useState<FamilyCheckWithEvent[]>([]);
  const [members, setMembers] = useState<LinkedPerson[]>([]);
  const [myId, setMyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyCheckId, setBusyCheckId] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setMyId(user?.id ?? null);

      const [riskEvents, checks, protectedPersons, protectors] = await Promise.all([
        fetchFamilyRiskEvents(50),
        fetchPendingChecksWithEvents(),
        fetchProtectedPersons(),
        fetchMyProtectors(),
      ]);
      setEvents(riskEvents);
      setPendingChecks(checks);
      const byId = new Map<string, LinkedPerson>();
      [...protectedPersons, ...protectors].forEach((p) => byId.set(p.id, p));
      setMembers(Array.from(byId.values()));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll]),
  );

  function nameFor(protectedId: string): string {
    if (protectedId === myId) return "Vous";
    return members.find((m) => m.id === protectedId)?.full_name ?? "Un proche";
  }

  const pendingByEventId = useMemo(() => {
    const map = new Map<string, FamilyCheckWithEvent>();
    pendingChecks.forEach((c) => {
      if (c.analysis_event_id) map.set(c.analysis_event_id, c);
    });
    return map;
  }, [pendingChecks]);

  const dangerCount = events.filter((e) => e.niveau === "danger").length;
  const pendingCount = pendingChecks.length;

  const filteredEvents = events.filter((e) => {
    if (filter === "danger") return e.niveau === "danger";
    if (filter === "pending") return pendingByEventId.has(e.id);
    return true;
  });

  function toggleExpand(id: string) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId((prev) => (prev === id ? null : id));
  }

  async function handleRespond(check: FamilyCheckWithEvent, confirmed: boolean) {
    setBusyCheckId(check.id);
    try {
      await respondFamilyCheck(check.id, confirmed);
      setPendingChecks((prev) => prev.filter((c) => c.id !== check.id));
    } catch (err) {
      console.error(err);
    } finally {
      setBusyCheckId(null);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + spacing.lg }]}
        refreshControl={<RefreshControl refreshing={false} onRefresh={loadAll} tintColor={colors.ink} />}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.logoBadge}>
              <Ionicons name="shield-checkmark" size={18} color="#fff" />
            </View>
            <View>
              <Text style={styles.appName}>Anti-Scam Family</Text>
              <Text style={styles.appSubtitle}>Activité / Alertes</Text>
            </View>
          </View>
          <Pressable style={styles.avatarButton} onPress={() => navigation.navigate("Account")}>
            <Ionicons name="person" size={18} color={colors.ink} />
          </Pressable>
        </View>

        <View style={styles.statusCard}>
          <View style={styles.statusIcon}>
            <Ionicons name="shield-checkmark" size={18} color={colors.safeText} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.statusTitle}>Protection active et synchronisée</Text>
            <Text style={styles.statusSubtitle}>
              {members.length} proche{members.length > 1 ? "s" : ""} lié{members.length > 1 ? "s" : ""}
            </Text>
          </View>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveBadgeText}>Live</Text>
          </View>
        </View>

        <View style={styles.titleRow}>
          <Text style={styles.sectionTitle}>Activité de{"\n"}protection familiale</Text>
          <Text style={styles.periodLabel}>7 derniers jours</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.pillRow}
          contentContainerStyle={{ gap: spacing.sm }}
        >
          <FilterPill label={`Tout (${events.length})`} active={filter === "all"} onPress={() => setFilter("all")} />
          <FilterPill label={`Dangers (${dangerCount})`} active={filter === "danger"} onPress={() => setFilter("danger")} />
          <FilterPill label={`À confirmer (${pendingCount})`} active={filter === "pending"} onPress={() => setFilter("pending")} />
        </ScrollView>

        {loading ? (
          <ActivityIndicator color={colors.ink} style={{ marginTop: spacing.xxl }} />
        ) : filteredEvents.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="checkmark-done-circle-outline" size={28} color={colors.textMuted} />
            <Text style={styles.emptyText}>Aucune alerte dans cette catégorie.</Text>
          </View>
        ) : (
          filteredEvents.map((e) => {
            const niveauColor = colorForNiveau(e.niveau);
            const pending = pendingByEventId.get(e.id);
            const expanded = expandedId === e.id;
            const title =
              e.scam_type && e.scam_type !== "unknown" && e.scam_type !== "legitimate"
                ? SCAM_TYPE_LABELS[e.scam_type]
                : e.niveau === "danger"
                  ? "Tentative de fraude détectée"
                  : "Signal de risque détecté";

            return (
              <View key={e.id} style={[styles.card, { borderLeftColor: niveauColor }]}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardAvatar}>
                    <Text style={styles.cardAvatarText}>{nameFor(e.protected_id).charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.cardNameRow}>
                      <Text style={styles.cardName}>{nameFor(e.protected_id)}</Text>
                      {e.niveau === "danger" && (
                        <View style={styles.urgentBadge}>
                          <Text style={styles.urgentBadgeText}>URGENT</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.cardTime}>{timeAgo(e.created_at)}</Text>
                  </View>
                </View>

                <View style={styles.cardTitleRow}>
                  <Ionicons name={e.niveau === "danger" ? "warning" : "alert-circle"} size={16} color={niveauColor} />
                  <Text style={[styles.cardTitle, { color: niveauColor }]}>{title}</Text>
                </View>
                {(e.input_text || e.raisons[0]) && (
                  <Text style={styles.cardDescription} numberOfLines={expanded ? undefined : 2}>
                    {e.input_text ?? e.raisons[0]}
                  </Text>
                )}

                <View style={styles.statusRow}>
                  <View style={styles.statusLeft}>
                    <View style={[styles.statusDot, { backgroundColor: niveauColor }]} />
                    <Text style={styles.statusLabel}>
                      {labelForNiveau(e.niveau)} · score {e.score}/100
                    </Text>
                  </View>
                </View>

                <Pressable style={styles.expandRow} onPress={() => toggleExpand(e.id)}>
                  <Ionicons name="information-circle-outline" size={15} color={colors.textMuted} />
                  <Text style={styles.expandText}>Pourquoi ce score ?</Text>
                  <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={14} color={colors.textMuted} />
                </Pressable>
                {expanded && (
                  <View style={styles.reasonsList}>
                    {e.raisons.map((r, idx) => (
                      <View key={idx} style={styles.reasonRow}>
                        <View style={[styles.reasonDot, { backgroundColor: niveauColor }]} />
                        <Text style={styles.reasonText}>{r}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.actionsRow}>
                  <Pressable
                    style={styles.actionButtonLight}
                    onPress={() =>
                      navigation.navigate("Result", {
                        result: {
                          id: e.id,
                          score: e.score,
                          niveau: e.niveau,
                          raisons: e.raisons,
                          scamType: e.scam_type ?? undefined,
                        },
                        readOnly: e.protected_id !== myId,
                      })
                    }
                  >
                    <Ionicons name="document-text-outline" size={14} color={colors.ink} />
                    <Text style={styles.actionButtonLightText}>Voir les détails</Text>
                  </Pressable>
                  {pending && (
                    <>
                      <Pressable
                        style={styles.actionButtonDark}
                        disabled={busyCheckId === pending.id}
                        onPress={() => handleRespond(pending, true)}
                      >
                        {busyCheckId === pending.id ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <>
                            <Ionicons name="checkmark" size={14} color="#fff" />
                            <Text style={styles.actionButtonDarkText}>Légitime</Text>
                          </>
                        )}
                      </Pressable>
                      <Pressable
                        style={styles.actionButtonDanger}
                        disabled={busyCheckId === pending.id}
                        onPress={() => handleRespond(pending, false)}
                      >
                        <Ionicons name="close" size={14} color="#fff" />
                        <Text style={styles.actionButtonDarkText}>Bloquer</Text>
                      </Pressable>
                    </>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

function FilterPill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.pill, active && styles.pillActive]} onPress={onPress}>
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </Pressable>
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
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    ...shadow.card,
  },
  statusIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.safeBg,
    alignItems: "center",
    justifyContent: "center",
  },
  statusTitle: { fontSize: 13.5, fontWeight: "800", color: colors.text },
  statusSubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.pillInactive,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.faible },
  liveBadgeText: { fontSize: 11, fontWeight: "700", color: colors.text },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: spacing.lg },
  sectionTitle: { fontSize: 24, fontWeight: "800", color: colors.text, lineHeight: 29, flex: 1 },
  periodLabel: { fontSize: 11.5, color: colors.textMuted, marginTop: 4 },
  pillRow: { marginBottom: spacing.lg, flexGrow: 0 },
  pill: {
    backgroundColor: colors.pillInactive,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  pillActive: { backgroundColor: colors.ink },
  pillText: { fontSize: 12.5, fontWeight: "700", color: colors.textMuted },
  pillTextActive: { color: "#fff" },
  emptyCard: { alignItems: "center", paddingVertical: spacing.xxl, gap: spacing.md },
  emptyText: { color: colors.textMuted, fontSize: 13.5, textAlign: "center" },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderLeftWidth: 4,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  cardHeaderRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.md },
  cardAvatar: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  cardAvatarText: { fontWeight: "800", color: colors.text, fontSize: 14 },
  cardNameRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  cardName: { fontSize: 14.5, fontWeight: "800", color: colors.text },
  urgentBadge: { backgroundColor: colors.urgentBg, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  urgentBadgeText: { fontSize: 10, fontWeight: "800", color: colors.urgentText },
  cardTime: { fontSize: 11.5, color: colors.textMuted, marginTop: 1 },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: spacing.xs },
  cardTitle: { fontSize: 15, fontWeight: "800", flexShrink: 1 },
  cardDescription: { fontSize: 13, color: colors.textMuted, lineHeight: 18, marginBottom: spacing.md },
  statusRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.sm },
  statusLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusLabel: { fontSize: 12, fontWeight: "700", color: colors.text },
  expandRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: spacing.sm },
  expandText: { flex: 1, fontSize: 12.5, fontWeight: "600", color: colors.textMuted },
  reasonsList: { marginTop: spacing.xs, marginBottom: spacing.sm, gap: 6 },
  reasonRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  reasonDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6 },
  reasonText: { flex: 1, fontSize: 12.5, color: colors.text, lineHeight: 17 },
  actionsRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  actionButtonLight: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.pillInactive,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
  },
  actionButtonLightText: { fontSize: 12.5, fontWeight: "700", color: colors.ink },
  actionButtonDark: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.faible,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
  },
  actionButtonDanger: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.danger,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
  },
  actionButtonDarkText: { fontSize: 12.5, fontWeight: "700", color: "#fff" },
});
