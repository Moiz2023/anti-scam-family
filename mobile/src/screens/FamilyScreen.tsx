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
import { colors, radius, spacing, shadow } from "../theme/colors";
import {
  createInviteCode,
  redeemInviteCode,
  fetchProtectedPersons,
  fetchMyProtectors,
  getSharingConsentStatus,
  revokeSharingConsent,
  type LinkedPerson,
} from "../lib/api";
import type { AppStackParamList } from "../navigation/RootNavigator";

export default function FamilyScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [protectedPersons, setProtectedPersons] = useState<LinkedPerson[]>([]);
  const [protectors, setProtectors] = useState<LinkedPerson[]>([]);
  const [codeInput, setCodeInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sharingConsent, setSharingConsent] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const [pp, pr, consent] = await Promise.all([
        fetchProtectedPersons(),
        fetchMyProtectors(),
        getSharingConsentStatus(),
      ]);
      setProtectedPersons(pp);
      setProtectors(pr);
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

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={false} onRefresh={loadAll} tintColor={colors.ink} />}
    >
      <Text style={styles.title}>Ma famille</Text>
      <Text style={styles.hint}>
        Les alertes à confirmer se gèrent depuis l'onglet Activité.
      </Text>

      <SectionHeader icon="shield-checkmark" label="Personnes que je protège" color={colors.ink} />
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

      <SectionHeader icon="heart" label="Qui me protège" color={colors.ink} />
      {protectors.length === 0 && (
        <Text style={styles.empty}>Personne ne te protège encore.</Text>
      )}
      {protectors.map((p) => (
        <PersonRow key={p.id} name={p.full_name ?? "Proche"} />
      ))}
      <Pressable style={styles.primaryButton} onPress={handleGenerateCode}>
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
  title: { fontSize: 22, fontWeight: "800", color: colors.text, marginBottom: spacing.xs },
  hint: { fontSize: 12.5, color: colors.textMuted, marginBottom: spacing.sm },
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
    backgroundColor: colors.pillInactive,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.ink, fontWeight: "800", fontSize: 14 },
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
    backgroundColor: colors.ink,
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
});
