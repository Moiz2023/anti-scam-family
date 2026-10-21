import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Share,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { colors, colorForNiveau, softColorForNiveau, labelForNiveau, radius, spacing, shadow } from "../theme/colors";
import {
  createInviteCode,
  redeemInviteCode,
  fetchProtectedPersons,
  fetchMyProtectors,
  fetchPendingChecksWithEvents,
  respondFamilyCheck,
  getSharingConsentStatus,
  revokeSharingConsent,
  type LinkedPerson,
  type FamilyCheckWithEvent,
} from "../lib/api";
import type { AppStackParamList } from "../navigation/RootNavigator";

export default function FamilyScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [protectedPersons, setProtectedPersons] = useState<LinkedPerson[]>([]);
  const [protectors, setProtectors] = useState<LinkedPerson[]>([]);
  const [pendingChecks, setPendingChecks] = useState<FamilyCheckWithEvent[]>([]);
  const [codeInput, setCodeInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyCheckId, setBusyCheckId] = useState<string | null>(null);
  const [sharingConsent, setSharingConsent] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const [pp, pr, checks, consent] = await Promise.all([
        fetchProtectedPersons(),
        fetchMyProtectors(),
        fetchPendingChecksWithEvents(),
        getSharingConsentStatus(),
      ]);
      setProtectedPersons(pp);
      setProtectors(pr);
      setPendingChecks(checks);
      setSharingConsent(consent);
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

  async function handleGenerateCode() {
    if (!sharingConsent) {
      navigation.navigate("Consent");
      return;
    }
    try {
      const code = await createInviteCode();
      Alert.alert(
        "Code d'invitation",
        `Partage ce code avec ton proche pour qu'il te protège : ${code}\n\nValide 7 jours.`,
      );
      Share.share({ message: `Rejoins-moi sur Anti-Scam Family avec le code ${code}` });
    } catch (err) {
      Alert.alert("Erreur", "Impossible de générer un code pour le moment.");
      console.error(err);
    }
  }

  async function handleRevokeConsent() {
    try {
      await revokeSharingConsent();
      setSharingConsent(false);
      Alert.alert(
        "Partage désactivé",
        "Les proches déjà liés ne verront plus vos nouvelles alertes tant que vous ne réactivez pas le partage.",
      );
    } catch (err) {
      Alert.alert("Erreur", "Impossible de désactiver le partage pour le moment.");
      console.error(err);
    }
  }

  async function handleRedeemCode() {
    if (!codeInput.trim()) return;
    try {
      await redeemInviteCode(codeInput);
      setCodeInput("");
      Alert.alert("Lien créé", "Vous protégez maintenant cette personne.");
      loadAll();
    } catch (err) {
      Alert.alert("Code invalide", "Ce code est invalide ou a expiré.");
      console.error(err);
    }
  }

  async function handleRespond(check: FamilyCheckWithEvent, confirmed: boolean) {
    setBusyCheckId(check.id);
    try {
      await respondFamilyCheck(check.id, confirmed);
      setPendingChecks((prev) => prev.filter((c) => c.id !== check.id));
    } catch (err) {
      Alert.alert("Erreur", "Impossible d'enregistrer la réponse.");
      console.error(err);
    } finally {
      setBusyCheckId(null);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={false} onRefresh={loadAll} tintColor={colors.brand} />}
    >
      <Text style={styles.title}>Ma famille</Text>

      {pendingChecks.length > 0 && (
        <>
          <SectionHeader icon="warning" label="Alertes à vérifier" color={colors.danger} />
          {pendingChecks.map((check) => {
            const event = check.analysis_events;
            if (!event) return null;
            const niveauColor = colorForNiveau(event.niveau);
            return (
              <View key={check.id} style={[styles.alertCard, { borderColor: niveauColor }]}>
                <View style={[styles.alertBadge, { backgroundColor: softColorForNiveau(event.niveau) }]}>
                  <Text style={[styles.alertNiveau, { color: niveauColor }]}>
                    {labelForNiveau(event.niveau)} — score {event.score}/100
                  </Text>
                </View>
                {event.input_text && (
                  <Text style={styles.alertText} numberOfLines={3}>
                    "{event.input_text}"
                  </Text>
                )}
                <Text style={styles.alertQuestion}>
                  Cette demande est-elle vraiment légitime ?
                </Text>
                <View style={styles.alertActions}>
                  <Pressable
                    style={[styles.alertButton, { backgroundColor: colors.faible }]}
                    disabled={busyCheckId === check.id}
                    onPress={() => handleRespond(check, true)}
                  >
                    <Ionicons name="checkmark" size={15} color="#fff" />
                    <Text style={styles.alertButtonText}>OUI, légitime</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.alertButton, { backgroundColor: colors.danger }]}
                    disabled={busyCheckId === check.id}
                    onPress={() => handleRespond(check, false)}
                  >
                    <Ionicons name="close" size={15} color="#fff" />
                    <Text style={styles.alertButtonText}>NON, bloquer</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </>
      )}

      <SectionHeader icon="shield-checkmark" label="Personnes que je protège" color={colors.brand} />
      {protectedPersons.length === 0 && (
        <Text style={styles.empty}>Aucune personne protégée pour l'instant.</Text>
      )}
      {protectedPersons.map((p) => (
        <PersonRow key={p.id} name={p.full_name} />
      ))}

      <TextInput
        style={styles.codeInput}
        placeholder="Code reçu d'un proche (ex: AB12CD)"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="characters"
        value={codeInput}
        onChangeText={setCodeInput}
      />
      <Pressable style={styles.primaryButton} onPress={handleRedeemCode}>
        <Ionicons name="link" size={16} color="#fff" />
        <Text style={styles.primaryButtonText}>Protéger cette personne</Text>
      </Pressable>

      <SectionHeader icon="heart" label="Qui me protège" color={colors.help} />
      {protectors.length === 0 && (
        <Text style={styles.empty}>Personne ne te protège encore.</Text>
      )}
      {protectors.map((p) => (
        <PersonRow key={p.id} name={p.full_name ?? "Proche"} />
      ))}
      <Pressable style={[styles.primaryButton, { backgroundColor: colors.help }]} onPress={handleGenerateCode}>
        <Ionicons name="qr-code" size={16} color="#fff" />
        <Text style={styles.primaryButtonText}>Générer un code d'invitation</Text>
      </Pressable>

      {sharingConsent ? (
        <View style={styles.consentRow}>
          <Ionicons name="checkmark-circle" size={14} color={colors.faible} />
          <Text style={styles.consentActiveText}>Partage de mes alertes activé</Text>
          <Pressable onPress={handleRevokeConsent}>
            <Text style={styles.consentRevokeLink}>Désactiver</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable style={styles.consentRow} onPress={() => navigation.navigate("Consent")}>
          <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
          <Text style={styles.consentInactiveText}>
            Voir ce qui sera partagé avec tes proches
          </Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

function SectionHeader({ icon, label, color }: { icon: keyof typeof Ionicons.glyphMap; label: string; color: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={styles.sectionTitle}>{label}</Text>
    </View>
  );
}

function PersonRow({ name }: { name: string | null }) {
  return (
    <View style={styles.personRow}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{(name ?? "?").charAt(0).toUpperCase()}</Text>
      </View>
      <Text style={styles.personName}>{name ?? "Personne"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: spacing.xl, paddingTop: 32 },
  centered: { flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "800", color: colors.text, marginBottom: spacing.sm },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: { fontSize: 14, fontWeight: "800", color: colors.text, textTransform: "uppercase", letterSpacing: 0.4 },
  empty: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.sm },
  personRow: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    ...shadow.card,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.brandSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.brand, fontWeight: "800", fontSize: 14 },
  personName: { fontSize: 15, fontWeight: "600", color: colors.text },
  codeInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    fontSize: 15,
    color: colors.text,
    marginTop: spacing.xs,
  },
  primaryButton: {
    backgroundColor: colors.brand,
    borderRadius: radius.sm,
    paddingVertical: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
    ...shadow.button,
  },
  primaryButtonText: { color: "#fff", fontWeight: "700" },
  consentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    justifyContent: "center",
  },
  consentActiveText: { color: colors.faible, fontSize: 12.5, fontWeight: "600" },
  consentRevokeLink: { color: colors.textMuted, fontSize: 12.5, fontWeight: "600", textDecorationLine: "underline", marginLeft: spacing.sm },
  consentInactiveText: { color: colors.textMuted, fontSize: 12.5, textDecorationLine: "underline" },
  alertCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 2,
    ...shadow.card,
  },
  alertBadge: {
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    marginBottom: spacing.sm,
  },
  alertNiveau: { fontWeight: "800", fontSize: 12.5 },
  alertText: { color: colors.textMuted, fontStyle: "italic", marginBottom: spacing.sm, lineHeight: 19 },
  alertQuestion: { color: colors.text, fontWeight: "700", marginBottom: spacing.md },
  alertActions: { flexDirection: "row", gap: spacing.sm },
  alertButton: {
    flex: 1,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  alertButtonText: { color: "#fff", fontWeight: "700", fontSize: 13 },
});
