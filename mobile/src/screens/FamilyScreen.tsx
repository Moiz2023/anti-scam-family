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
import { useFocusEffect } from "@react-navigation/native";
import { colors, colorForNiveau, labelForNiveau } from "../theme/colors";
import {
  createInviteCode,
  redeemInviteCode,
  fetchProtectedPersons,
  fetchMyProtectors,
  fetchPendingChecksWithEvents,
  respondFamilyCheck,
  type LinkedPerson,
  type FamilyCheckWithEvent,
} from "../lib/api";

export default function FamilyScreen() {
  const [protectedPersons, setProtectedPersons] = useState<LinkedPerson[]>([]);
  const [protectors, setProtectors] = useState<LinkedPerson[]>([]);
  const [pendingChecks, setPendingChecks] = useState<FamilyCheckWithEvent[]>([]);
  const [codeInput, setCodeInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyCheckId, setBusyCheckId] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const [pp, pr, checks] = await Promise.all([
        fetchProtectedPersons(),
        fetchMyProtectors(),
        fetchPendingChecksWithEvents(),
      ]);
      setProtectedPersons(pp);
      setProtectors(pr);
      setPendingChecks(checks);
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
    try {
      const code = await createInviteCode();
      Alert.alert(
        "Code d'invitation",
        `Partage ce code avec ton proche pour qu'il te protege : ${code}\n\nValide 7 jours.`,
      );
      Share.share({ message: `Rejoins-moi sur Anti-Scam Family avec le code ${code}` });
    } catch (err) {
      Alert.alert("Erreur", "Impossible de generer un code pour le moment.");
      console.error(err);
    }
  }

  async function handleRedeemCode() {
    if (!codeInput.trim()) return;
    try {
      await redeemInviteCode(codeInput);
      setCodeInput("");
      Alert.alert("Lien cree", "Vous protegez maintenant cette personne.");
      loadAll();
    } catch (err) {
      Alert.alert("Code invalide", "Ce code est invalide ou a expire.");
      console.error(err);
    }
  }

  async function handleRespond(check: FamilyCheckWithEvent, confirmed: boolean) {
    setBusyCheckId(check.id);
    try {
      await respondFamilyCheck(check.id, confirmed);
      setPendingChecks((prev) => prev.filter((c) => c.id !== check.id));
    } catch (err) {
      Alert.alert("Erreur", "Impossible d'enregistrer la reponse.");
      console.error(err);
    } finally {
      setBusyCheckId(null);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={false} onRefresh={loadAll} />}
    >
      <Text style={styles.title}>Ma famille</Text>

      {pendingChecks.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Alertes a verifier</Text>
          {pendingChecks.map((check) => {
            const event = check.analysis_events;
            if (!event) return null;
            return (
              <View key={check.id} style={styles.alertCard}>
                <Text style={[styles.alertNiveau, { color: colorForNiveau(event.niveau) }]}>
                  {labelForNiveau(event.niveau)} — score {event.score}/100
                </Text>
                {event.input_text && (
                  <Text style={styles.alertText} numberOfLines={3}>
                    "{event.input_text}"
                  </Text>
                )}
                <Text style={styles.alertQuestion}>
                  Cette demande est-elle vraiment legitime ?
                </Text>
                <View style={styles.alertActions}>
                  <Pressable
                    style={[styles.alertButton, { backgroundColor: colors.faible }]}
                    disabled={busyCheckId === check.id}
                    onPress={() => handleRespond(check, true)}
                  >
                    <Text style={styles.alertButtonText}>OUI, legitime</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.alertButton, { backgroundColor: colors.danger }]}
                    disabled={busyCheckId === check.id}
                    onPress={() => handleRespond(check, false)}
                  >
                    <Text style={styles.alertButtonText}>NON, bloquer</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </>
      )}

      <Text style={styles.sectionTitle}>Personnes que je protege</Text>
      {protectedPersons.length === 0 && (
        <Text style={styles.empty}>Aucune personne protegee pour l'instant.</Text>
      )}
      {protectedPersons.map((p) => (
        <View key={p.id} style={styles.personRow}>
          <Text style={styles.personName}>{p.full_name ?? "Personne"}</Text>
        </View>
      ))}
      <Pressable style={styles.secondaryButton} onPress={() => setCodeInput("")}>
        <TextInput
          style={styles.codeInput}
          placeholder="Code recu d'un proche (ex: AB12CD)"
          autoCapitalize="characters"
          value={codeInput}
          onChangeText={setCodeInput}
        />
      </Pressable>
      <Pressable style={styles.primaryButton} onPress={handleRedeemCode}>
        <Text style={styles.primaryButtonText}>Proteger cette personne</Text>
      </Pressable>

      <Text style={styles.sectionTitle}>Qui me protege</Text>
      {protectors.length === 0 && (
        <Text style={styles.empty}>Personne ne te protege encore.</Text>
      )}
      {protectors.map((p) => (
        <View key={p.id} style={styles.personRow}>
          <Text style={styles.personName}>{p.full_name ?? "Proche"}</Text>
        </View>
      ))}
      <Pressable style={styles.primaryButton} onPress={handleGenerateCode}>
        <Text style={styles.primaryButtonText}>Generer un code d'invitation</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: colors.background, padding: 24, paddingTop: 48 },
  centered: { flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "700", color: colors.text, marginBottom: 8 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: colors.text, marginTop: 24, marginBottom: 10 },
  empty: { color: colors.textMuted, fontSize: 13, marginBottom: 8 },
  personRow: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  personName: { fontSize: 15, fontWeight: "600", color: colors.text },
  codeInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  secondaryButton: { marginTop: 4 },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 12,
  },
  primaryButtonText: { color: "#fff", fontWeight: "700" },
  alertCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: colors.danger,
  },
  alertNiveau: { fontWeight: "800", fontSize: 14, marginBottom: 6 },
  alertText: { color: colors.textMuted, fontStyle: "italic", marginBottom: 8 },
  alertQuestion: { color: colors.text, fontWeight: "600", marginBottom: 10 },
  alertActions: { flexDirection: "row", gap: 10 },
  alertButton: { flex: 1, borderRadius: 8, paddingVertical: 12, alignItems: "center" },
  alertButtonText: { color: "#fff", fontWeight: "700", fontSize: 13 },
});
