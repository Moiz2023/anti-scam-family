import React from "react";
import { View, Text, StyleSheet, ScrollView, Linking, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, shadow } from "../theme/colors";

const STEPS: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }[] = [
  {
    icon: "card-outline",
    title: "Vous avez déjà payé ou partagé un code ?",
    body:
      "Contactez immédiatement votre banque et demandez le blocage de votre carte/compte. " +
      "En Belgique : Card Stop au 078 170 170 (24h/24).",
  },
  {
    icon: "lock-closed-outline",
    title: "Vous avez partagé vos codes itsme ?",
    body: "Bloquez immédiatement votre application itsme et contactez votre banque.",
  },
  {
    icon: "document-text-outline",
    title: "Déposer plainte",
    body:
      "Contactez la police locale (101) ou rendez-vous au commissariat. " +
      "Conservez tous les messages et preuves.",
  },
  {
    icon: "flag-outline",
    title: "Signaler le message suspect",
    body: "Transférez le SMS suspect au 8222 (Suspect SMS) ou signalez-le sur safeonweb.be.",
  },
];

export default function HelpScreen() {
  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Besoin d'aide</Text>
      <Text style={styles.subtitle}>
        Que faire si vous avez un doute ou si vous avez déjà agi suite à un message suspect.
      </Text>

      {STEPS.map((step, idx) => (
        <View key={idx} style={styles.card}>
          <View style={styles.cardIcon}>
            <Ionicons name={step.icon} size={20} color={colors.help} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{step.title}</Text>
            <Text style={styles.cardBody}>{step.body}</Text>
          </View>
        </View>
      ))}

      <Pressable
        style={styles.linkButton}
        onPress={() => Linking.openURL("https://www.safeonweb.be")}
      >
        <Ionicons name="open-outline" size={18} color="#fff" />
        <Text style={styles.linkButtonText}>Ouvrir safeonweb.be</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: spacing.xl, paddingTop: 32 },
  title: { fontSize: 22, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: spacing.sm, marginBottom: spacing.xl, lineHeight: 18 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: "row",
    gap: spacing.md,
    ...shadow.card,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.helpSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontSize: 15, fontWeight: "700", color: colors.text, marginBottom: 4 },
  cardBody: { fontSize: 13, color: colors.textMuted, lineHeight: 19 },
  linkButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.help,
    borderRadius: radius.sm,
    paddingVertical: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    ...shadow.button,
  },
  linkButtonText: { color: "#fff", fontWeight: "700" },
});
