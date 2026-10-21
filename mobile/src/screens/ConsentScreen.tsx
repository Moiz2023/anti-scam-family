import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, shadow } from "../theme/colors";
import { grantSharingConsent } from "../lib/api";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AppStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<AppStackParamList, "Consent">;

const SHARED: { icon: keyof typeof Ionicons.glyphMap; text: string }[] = [
  {
    icon: "warning-outline",
    text:
      "Vos vérifications classées ATTENTION ou DANGER : le score, les raisons de l'analyse, " +
      "et le texte du message (vos données personnelles — IBAN, téléphone, e-mail — sont " +
      "déjà remplacées par des mentions génériques avant d'être conservées).",
  },
];

const NOT_SHARED: { icon: keyof typeof Ionicons.glyphMap; text: string }[] = [
  { icon: "checkmark-done-outline", text: "Vos vérifications sans risque (classées faible) — jamais visibles par un proche." },
  { icon: "location-outline", text: "Votre localisation : l'app ne la demande jamais." },
  { icon: "card-outline", text: "Vos comptes ou mouvements bancaires : l'app n'y a pas accès." },
  { icon: "chatbox-ellipses-outline", text: "Le reste de vos messages ou conversations." },
];

export default function ConsentScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleAccept() {
    setLoading(true);
    try {
      await grantSharingConsent();
      navigation.goBack();
    } catch (err) {
      Alert.alert("Erreur", "Impossible d'enregistrer ton accord pour le moment.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      <View style={styles.iconBadge}>
        <Ionicons name="shield-checkmark" size={26} color={colors.brand} />
      </View>
      <Text style={styles.title}>Avant de partager tes alertes</Text>
      <Text style={styles.subtitle}>
        Un proche que tu ajoutes pourra voir certaines informations te concernant. Voici
        exactement quoi, en toute transparence.
      </Text>

      <Text style={styles.sectionLabel}>Ce qui sera partagé</Text>
      {SHARED.map((item, idx) => (
        <View key={idx} style={[styles.row, styles.rowShared]}>
          <Ionicons name={item.icon} size={18} color={colors.attention} />
          <Text style={styles.rowText}>{item.text}</Text>
        </View>
      ))}

      <Text style={styles.sectionLabel}>Ce qui ne sera jamais partagé</Text>
      {NOT_SHARED.map((item, idx) => (
        <View key={idx} style={[styles.row, styles.rowSafe]}>
          <Ionicons name={item.icon} size={18} color={colors.faible} />
          <Text style={styles.rowText}>{item.text}</Text>
        </View>
      ))}

      <View style={styles.noteCard}>
        <Ionicons name="information-circle" size={16} color={colors.brand} />
        <Text style={styles.noteText}>
          Tu peux désactiver ce partage à tout moment depuis l'écran "Ma famille".
        </Text>
      </View>

      <Pressable style={styles.acceptButton} onPress={handleAccept} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.acceptButtonText}>Je comprends et j'accepte</Text>
        )}
      </Pressable>
      <Pressable style={styles.cancelButton} onPress={() => navigation.goBack()}>
        <Text style={styles.cancelButtonText}>Annuler</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: spacing.xl, paddingTop: 32 },
  iconBadge: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.brandSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  title: { fontSize: 22, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 13.5, color: colors.textMuted, marginTop: spacing.sm, marginBottom: spacing.xl, lineHeight: 19 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.text,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    alignItems: "flex-start",
  },
  rowShared: { borderColor: colors.attentionSoft, backgroundColor: colors.attentionSoft },
  rowSafe: { borderColor: colors.border },
  rowText: { flex: 1, color: colors.text, fontSize: 13.5, lineHeight: 19 },
  noteCard: {
    flexDirection: "row",
    gap: spacing.sm,
    backgroundColor: colors.brandSoft,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginTop: spacing.lg,
    alignItems: "center",
  },
  noteText: { flex: 1, color: colors.text, fontSize: 12.5, lineHeight: 18 },
  acceptButton: {
    backgroundColor: colors.brand,
    borderRadius: radius.sm,
    paddingVertical: spacing.lg,
    alignItems: "center",
    marginTop: spacing.xl,
    ...shadow.button,
  },
  acceptButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  cancelButton: { paddingVertical: spacing.md, alignItems: "center", marginTop: spacing.sm },
  cancelButtonText: { color: colors.textMuted, fontSize: 14, fontWeight: "600" },
});
