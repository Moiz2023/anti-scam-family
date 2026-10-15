import React from "react";
import { View, Text, StyleSheet, ScrollView, Linking, Pressable } from "react-native";
import { colors } from "../theme/colors";

const STEPS = [
  {
    title: "Vous avez deja paye ou partage un code ?",
    body:
      "Contactez immediatement votre banque et demandez le blocage de votre carte/compte. " +
      "En Belgique : Card Stop au 078 170 170 (24h/24).",
  },
  {
    title: "Vous avez partage vos codes itsme ?",
    body: "Bloquez immediatement votre application itsme et contactez votre banque.",
  },
  {
    title: "Deposer plainte",
    body:
      "Contactez la police locale (101) ou rendez-vous au commissariat. " +
      "Conservez tous les messages et preuves.",
  },
  {
    title: "Signaler le message suspect",
    body: "Transferez le SMS suspect au 8222 (Suspect SMS) ou signalez-le sur safeonweb.be.",
  },
];

export default function HelpScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Besoin d'aide</Text>
      <Text style={styles.subtitle}>
        Que faire si vous avez un doute ou si vous avez deja agi suite a un message suspect.
      </Text>

      {STEPS.map((step, idx) => (
        <View key={idx} style={styles.card}>
          <Text style={styles.cardTitle}>{step.title}</Text>
          <Text style={styles.cardBody}>{step.body}</Text>
        </View>
      ))}

      <Pressable
        style={styles.linkButton}
        onPress={() => Linking.openURL("https://www.safeonweb.be")}
      >
        <Text style={styles.linkButtonText}>Ouvrir safeonweb.be</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: colors.background, padding: 24, paddingTop: 48 },
  title: { fontSize: 22, fontWeight: "700", color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 8, marginBottom: 24 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { fontSize: 15, fontWeight: "700", color: colors.text, marginBottom: 6 },
  cardBody: { fontSize: 13, color: colors.textMuted, lineHeight: 19 },
  linkButton: {
    marginTop: 12,
    backgroundColor: colors.help,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  linkButtonText: { color: "#fff", fontWeight: "700" },
});
