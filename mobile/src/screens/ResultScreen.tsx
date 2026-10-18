import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, Alert, ActivityIndicator, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  colorForNiveau,
  softColorForNiveau,
  labelForNiveau,
  colors,
  radius,
  spacing,
  shadow,
} from "../theme/colors";
import { requestFamilyCheck } from "../lib/api";
import ScoreGauge from "../components/ScoreGauge";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AppStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<AppStackParamList, "Result">;

const NIVEAU_ICON = {
  danger: "warning" as const,
  attention: "alert-circle" as const,
  faible: "checkmark-circle" as const,
};

export default function ResultScreen({ route, navigation }: Props) {
  const { result, isPhoneCheck, readOnly } = route.params;
  const [sending, setSending] = useState(false);
  const niveauColor = colorForNiveau(result.niveau);
  const softColor = softColorForNiveau(result.niveau);
  const isRisky = result.niveau !== "faible";

  async function handleFamilyCheck() {
    if (!result.id) {
      Alert.alert(
        "Compte requis",
        "Connecte-toi pour pouvoir envoyer une alerte a ta famille.",
      );
      return;
    }
    setSending(true);
    try {
      const response = await requestFamilyCheck(result.id);
      if (response.message === "no_linked_family" || response.notifiedProtectors === 0) {
        Alert.alert(
          "Aucun proche lie",
          "Ajoute un proche depuis l'ecran Famille pour pouvoir envoyer une alerte.",
        );
      } else {
        Alert.alert(
          "Alerte envoyee",
          `${response.notifiedProtectors} proche(s) ont ete notifies. Attends leur reponse avant de payer.`,
        );
      }
    } catch (err) {
      Alert.alert("Erreur", "Impossible d'envoyer l'alerte famille pour le moment.");
      console.error(err);
    } finally {
      setSending(false);
    }
  }

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      <View style={[styles.gaugeCard, { backgroundColor: softColor }]}>
        <ScoreGauge score={result.score} color={niveauColor} />
        <View style={styles.niveauRow}>
          <Ionicons name={NIVEAU_ICON[result.niveau]} size={20} color={niveauColor} />
          <Text style={[styles.niveau, { color: niveauColor }]}>{labelForNiveau(result.niveau)}</Text>
        </View>
        {result.niveau === "danger" && (
          <Text style={styles.warning}>Ne payez pas avant vérification familiale.</Text>
        )}
      </View>

      {isPhoneCheck && result.niveau === "faible" && (
        <View style={styles.hintCard}>
          <Ionicons name="information-circle" size={18} color={colors.brand} />
          <Text style={styles.hintText}>
            Ce score ne couvre que le format du numéro (pas de base de réputation en temps
            réel). Si ce numéro vous a aussi envoyé un message ou un lien, vérifiez-le
            séparément avec "Vérifier un message" — c'est souvent là que se trouve le vrai
            signal.
          </Text>
        </View>
      )}

      <View style={styles.reasonsCard}>
        <Text style={styles.sectionTitle}>Pourquoi ce score ?</Text>
        {result.raisons.map((raison, idx) => (
          <View key={idx} style={styles.raisonRow}>
            <View style={[styles.raisonDot, { backgroundColor: niveauColor }]} />
            <Text style={styles.raisonText}>{raison}</Text>
          </View>
        ))}
      </View>

      {isRisky && !readOnly && (
        <Pressable style={styles.familyButton} onPress={handleFamilyCheck} disabled={sending}>
          {sending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="people" size={18} color="#fff" />
              <Text style={styles.familyButtonText}>Vérifier avec ma famille</Text>
            </>
          )}
        </Pressable>
      )}

      <Pressable style={styles.doneButton} onPress={() => navigation.popToTop()}>
        <Text style={styles.doneButtonText}>Terminer</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: spacing.xl, paddingTop: 48 },
  gaugeCard: {
    borderRadius: radius.lg,
    paddingVertical: spacing.xxl,
    alignItems: "center",
    ...shadow.card,
  },
  niveauRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.lg },
  niveau: { fontSize: 20, fontWeight: "800", letterSpacing: 0.5 },
  warning: {
    fontSize: 13,
    color: colors.danger,
    fontWeight: "700",
    marginTop: spacing.sm,
    textAlign: "center",
    paddingHorizontal: spacing.xl,
  },
  hintCard: {
    flexDirection: "row",
    gap: spacing.sm,
    backgroundColor: colors.brandSoft,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginTop: spacing.lg,
  },
  hintText: { flex: 1, color: colors.text, fontSize: 13, lineHeight: 18 },
  reasonsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginTop: spacing.lg,
    ...shadow.card,
  },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: colors.text, marginBottom: spacing.md },
  raisonRow: { flexDirection: "row", marginTop: spacing.sm, alignItems: "flex-start" },
  raisonDot: { width: 7, height: 7, borderRadius: 4, marginTop: 6, marginRight: spacing.sm },
  raisonText: { color: colors.text, fontSize: 14.5, flex: 1, lineHeight: 20 },
  familyButton: {
    backgroundColor: colors.danger,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.xl,
    ...shadow.button,
  },
  familyButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  doneButton: { marginTop: spacing.lg, paddingVertical: spacing.md, alignItems: "center" },
  doneButtonText: { color: colors.textMuted, fontSize: 14, fontWeight: "600" },
});
