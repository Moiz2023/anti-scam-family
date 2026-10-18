import React, { useEffect } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { colors, gradients, radius, spacing } from "../theme/colors";
import { supabase } from "../lib/supabase";
import { registerForPushNotifications } from "../lib/notifications";
import GradientButton from "../components/GradientButton";
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
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.heroBadge}>
          <Ionicons name="shield-checkmark" size={22} color="#fff" />
        </View>
        <Text style={styles.heroTitle}>Anti-Scam Family</Text>
        <Text style={styles.heroSubtitle}>
          Nous détectons et signalons des signaux de risque — jamais une garantie absolue de
          sécurité. En cas de doute, vérifiez toujours avec votre famille.
        </Text>
      </LinearGradient>

      <View style={styles.buttons}>
        <GradientButton
          icon="search"
          label="CHECK"
          sublabel="Vérifier un message reçu"
          gradientColors={gradients.check}
          onPress={() => navigation.navigate("Check")}
        />
        <GradientButton
          icon="call"
          label="CALL FAMILY"
          sublabel="Appeler un proche maintenant"
          gradientColors={gradients.callFamily}
          onPress={() => navigation.navigate("CallFamily")}
        />
        <GradientButton
          icon="help-buoy"
          label="HELP"
          sublabel="J'ai un doute ou j'ai déjà payé"
          gradientColors={gradients.help}
          onPress={() => navigation.navigate("Help")}
        />
      </View>

      <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate("Family")}>
        <Ionicons name="people" size={18} color={colors.brand} />
        <Text style={styles.secondaryButtonText}>Ma famille / proches liés</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Pressable>

      <Pressable style={styles.logout} onPress={() => supabase.auth.signOut()}>
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingBottom: spacing.xxl },
  hero: {
    paddingTop: 64,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.xl,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
  heroBadge: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  heroTitle: { fontSize: 28, fontWeight: "800", color: "#fff" },
  heroSubtitle: {
    fontSize: 13.5,
    color: "rgba(255,255,255,0.88)",
    marginTop: spacing.sm,
    lineHeight: 19,
  },
  buttons: { padding: spacing.xl, gap: spacing.lg },
  secondaryButton: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.sm,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: { flex: 1, color: colors.text, fontSize: 15, fontWeight: "600" },
  logout: { marginTop: spacing.xl, alignItems: "center" },
  logoutText: { color: colors.textMuted, fontSize: 13 },
});
