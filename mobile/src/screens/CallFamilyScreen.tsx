import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, Linking, ActivityIndicator, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, shadow } from "../theme/colors";
import { fetchMyProtectors, type LinkedPerson } from "../lib/api";

export default function CallFamilyScreen() {
  const [protectors, setProtectors] = useState<LinkedPerson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyProtectors()
      .then(setProtectors)
      .finally(() => setLoading(false));
  }, []);

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Appeler ma famille</Text>
      <Text style={styles.subtitle}>
        En cas de doute, le réflexe le plus sûr reste d'appeler directement votre proche sur
        un numéro que vous connaissez déjà (pas celui reçu dans le message suspect). Nous ne
        stockons pas les numéros de téléphone de vos proches : ouvrez votre carnet de
        contacts habituel pour les joindre.
      </Text>

      {loading && <ActivityIndicator style={{ marginTop: 24 }} color={colors.ink} />}

      {!loading && protectors.length === 0 && (
        <View style={styles.emptyCard}>
          <Ionicons name="people-outline" size={28} color={colors.textMuted} />
          <Text style={styles.empty}>
            Aucun proche lié pour l'instant. Rendez-vous dans "Ma famille" pour en ajouter un.
          </Text>
        </View>
      )}

      {protectors.map((p) => (
        <View key={p.id} style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(p.full_name ?? "?").charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.name}>{p.full_name ?? "Proche"}</Text>
          <Pressable
            style={styles.callButton}
            onPress={() => Linking.openURL("tel:").catch(() => undefined)}
          >
            <Ionicons name="call" size={15} color="#fff" />
            <Text style={styles.callButtonText}>Ouvrir le téléphone</Text>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: spacing.xl, paddingTop: 32 },
  title: { fontSize: 22, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: spacing.sm, marginBottom: spacing.xl, lineHeight: 19 },
  emptyCard: {
    alignItems: "center",
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  empty: { color: colors.textMuted, fontSize: 14, textAlign: "center", paddingHorizontal: spacing.xl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    ...shadow.card,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.pillInactive,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.ink, fontWeight: "800", fontSize: 16 },
  name: { flex: 1, fontSize: 16, fontWeight: "700", color: colors.text },
  callButton: {
    backgroundColor: colors.ink,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  callButtonText: { color: "#fff", fontWeight: "700", fontSize: 12.5 },
});
