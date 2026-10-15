import React, { useEffect } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { colors } from "../theme/colors";
import { supabase } from "../lib/supabase";
import { registerForPushNotifications } from "../lib/notifications";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AppStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<AppStackParamList, "Home">;

export default function HomeScreen({ navigation }: Props) {
  useEffect(() => {
    registerForPushNotifications().catch((err) =>
      console.warn("push registration failed", err),
    );
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Anti-Scam Family</Text>
      <Text style={styles.subtitle}>
        Nous detectons et signalons des signaux de risque. Pas de garantie de securite
        absolue : en cas de doute, verifiez toujours avec votre famille.
      </Text>

      <Pressable
        style={[styles.bigButton, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate("Check")}
      >
        <Text style={styles.bigButtonLabel}>CHECK</Text>
        <Text style={styles.bigButtonSub}>Verifier un message recu</Text>
      </Pressable>

      <Pressable
        style={[styles.bigButton, { backgroundColor: colors.attention }]}
        onPress={() => navigation.navigate("CallFamily")}
      >
        <Text style={styles.bigButtonLabel}>CALL FAMILY</Text>
        <Text style={styles.bigButtonSub}>Appeler un proche maintenant</Text>
      </Pressable>

      <Pressable
        style={[styles.bigButton, { backgroundColor: colors.help }]}
        onPress={() => navigation.navigate("Help")}
      >
        <Text style={styles.bigButtonLabel}>HELP</Text>
        <Text style={styles.bigButtonSub}>J'ai un doute ou j'ai deja paye</Text>
      </Pressable>

      <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate("Family")}>
        <Text style={styles.secondaryButtonText}>Ma famille / proches lies</Text>
      </Pressable>

      <Pressable style={styles.logout} onPress={() => supabase.auth.signOut()}>
        <Text style={styles.logoutText}>Se deconnecter</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: colors.background, padding: 24, paddingTop: 48 },
  title: { fontSize: 26, fontWeight: "700", color: colors.text, textAlign: "center" },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 32,
  },
  bigButton: {
    borderRadius: 16,
    paddingVertical: 24,
    alignItems: "center",
    marginBottom: 16,
  },
  bigButtonLabel: { color: "#fff", fontSize: 24, fontWeight: "800", letterSpacing: 1 },
  bigButtonSub: { color: "#fff", fontSize: 13, marginTop: 4, opacity: 0.9 },
  secondaryButton: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: { color: colors.text, fontSize: 15, fontWeight: "600" },
  logout: { marginTop: 24, alignItems: "center" },
  logoutText: { color: colors.textMuted, fontSize: 13 },
});
