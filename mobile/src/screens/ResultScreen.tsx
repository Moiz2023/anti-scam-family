import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { colorForNiveau, labelForNiveau, colors } from "../theme/colors";
import { requestFamilyCheck } from "../lib/api";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AppStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<AppStackParamList, "Result">;

export default function ResultScreen({ route, navigation }: Props) {
  const { result } = route.params;
  const [sending, setSending] = useState(false);
  const niveauColor = colorForNiveau(result.niveau);
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
    <View style={styles.container}>
      <View style={[styles.scoreCircle, { borderColor: niveauColor }]}>
        <Text style={[styles.scoreNumber, { color: niveauColor }]}>{result.score}</Text>
        <Text style={styles.scoreMax}>/100</Text>
      </View>

      <Text style={[styles.niveau, { color: niveauColor }]}>{labelForNiveau(result.niveau)}</Text>

      {result.niveau === "danger" && (
        <Text style={styles.warning}>Ne payez pas avant verification familiale.</Text>
      )}

      <Text style={styles.sectionTitle}>Pourquoi ce score ?</Text>
      {result.raisons.map((raison, idx) => (
        <View key={idx} style={styles.raisonRow}>
          <Text style={styles.raisonBullet}>•</Text>
          <Text style={styles.raisonText}>{raison}</Text>
        </View>
      ))}

      {isRisky && (
        <Pressable style={styles.familyButton} onPress={handleFamilyCheck} disabled={sending}>
          {sending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.familyButtonText}>Verifier avec ma famille</Text>
          )}
        </Pressable>
      )}

      <Pressable style={styles.doneButton} onPress={() => navigation.popToTop()}>
        <Text style={styles.doneButtonText}>Terminer</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 24, paddingTop: 56, alignItems: "center" },
  scoreCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 8,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  scoreNumber: { fontSize: 40, fontWeight: "800" },
  scoreMax: { fontSize: 14, color: colors.textMuted, marginLeft: 2 },
  niveau: { fontSize: 22, fontWeight: "800", marginTop: 16, letterSpacing: 1 },
  warning: { fontSize: 14, color: colors.danger, fontWeight: "600", marginTop: 8, textAlign: "center" },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: colors.text, marginTop: 28, alignSelf: "flex-start" },
  raisonRow: { flexDirection: "row", marginTop: 10, alignSelf: "flex-start" },
  raisonBullet: { color: colors.textMuted, marginRight: 8 },
  raisonText: { color: colors.text, fontSize: 14, flex: 1 },
  familyButton: {
    backgroundColor: colors.danger,
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: "center",
    marginTop: 32,
    width: "100%",
  },
  familyButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  doneButton: { marginTop: 20, paddingVertical: 12 },
  doneButtonText: { color: colors.textMuted, fontSize: 14 },
});
