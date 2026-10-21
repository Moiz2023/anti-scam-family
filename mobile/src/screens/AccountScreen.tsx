import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, shadow } from "../theme/colors";
import { supabase } from "../lib/supabase";
import { deleteMyAccount } from "../lib/api";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AppStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<AppStackParamList, "Account">;

export default function AccountScreen({ navigation }: Props) {
  const [email, setEmail] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteMyAccount();
      await supabase.auth.signOut();
      // RootNavigator bascule automatiquement vers l'ecran de connexion
      // des que la session devient invalide (le compte n'existe plus).
    } catch (err) {
      Alert.alert("Erreur", "Impossible de supprimer le compte pour le moment. Réessaie plus tard.");
      console.error(err);
      setDeleting(false);
    }
  }

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      <Text style={styles.sectionLabel}>Compte</Text>
      <View style={styles.card}>
        <Ionicons name="person-circle-outline" size={22} color={colors.textMuted} />
        <Text style={styles.email}>{email ?? "…"}</Text>
      </View>

      <Pressable style={styles.logoutButton} onPress={() => supabase.auth.signOut()}>
        <Ionicons name="log-out-outline" size={17} color={colors.text} />
        <Text style={styles.logoutButtonText}>Se déconnecter</Text>
      </Pressable>

      <Text style={[styles.sectionLabel, { marginTop: spacing.xxl }]}>Zone de danger</Text>

      {!confirmingDelete ? (
        <Pressable style={styles.deleteLinkButton} onPress={() => setConfirmingDelete(true)}>
          <Ionicons name="trash-outline" size={17} color={colors.danger} />
          <Text style={styles.deleteLinkText}>Supprimer mon compte et mes données</Text>
        </Pressable>
      ) : (
        <View style={styles.confirmCard}>
          <Ionicons name="warning" size={22} color={colors.danger} />
          <Text style={styles.confirmTitle}>Cette action est irréversible</Text>
          <Text style={styles.confirmBody}>
            Ton compte, tes vérifications, tes liens familiaux et tes alertes seront
            définitivement supprimés. Les proches qui te protègent perdront aussi l'accès
            à ton historique.
          </Text>
          <Pressable style={styles.confirmDeleteButton} onPress={handleDelete} disabled={deleting}>
            {deleting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.confirmDeleteButtonText}>Oui, supprimer définitivement</Text>
            )}
          </Pressable>
          <Pressable style={styles.cancelButton} onPress={() => setConfirmingDelete(false)} disabled={deleting}>
            <Text style={styles.cancelButtonText}>Annuler</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: spacing.xl, paddingTop: 32 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.text,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  email: { color: colors.text, fontSize: 14.5, fontWeight: "600" },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingVertical: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logoutButtonText: { color: colors.text, fontSize: 14.5, fontWeight: "700" },
  deleteLinkButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  deleteLinkText: { color: colors.danger, fontSize: 13.5, fontWeight: "700" },
  confirmCard: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.xl,
    alignItems: "center",
  },
  confirmTitle: { color: colors.danger, fontSize: 15.5, fontWeight: "800", marginTop: spacing.sm, marginBottom: spacing.xs },
  confirmBody: { color: colors.text, fontSize: 13, textAlign: "center", lineHeight: 19, marginBottom: spacing.lg },
  confirmDeleteButton: {
    backgroundColor: colors.danger,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignSelf: "stretch",
    alignItems: "center",
    ...shadow.button,
  },
  confirmDeleteButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  cancelButton: { marginTop: spacing.sm, paddingVertical: spacing.sm },
  cancelButtonText: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
});
