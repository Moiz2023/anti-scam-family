import React from "react";
import { Pressable, Text, StyleSheet, ViewStyle, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, shadow, spacing } from "../theme/colors";

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sublabel?: string;
  gradientColors: readonly [string, string, ...string[]];
  onPress: () => void;
  loading?: boolean;
  style?: ViewStyle;
}

export default function GradientButton({
  icon,
  label,
  sublabel,
  gradientColors,
  onPress,
  loading,
  style,
}: Props) {
  return (
    <Pressable onPress={onPress} disabled={loading} style={({ pressed }) => [
      styles.wrapper,
      style,
      pressed && styles.pressed,
    ]}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <Ionicons name={icon} size={30} color="#fff" style={styles.icon} />
        <Text style={styles.label}>{label}</Text>
        {sublabel ? <Text style={styles.sublabel}>{sublabel}</Text> : null}
        {loading && (
          <ActivityIndicator color="#fff" style={{ position: "absolute", right: 20 }} />
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: radius.lg,
    ...shadow.button,
  },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  gradient: {
    borderRadius: radius.lg,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
    alignItems: "flex-start",
  },
  icon: { marginBottom: spacing.sm },
  label: { color: "#fff", fontSize: 22, fontWeight: "800", letterSpacing: 0.3 },
  sublabel: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginTop: 2, fontWeight: "500" },
});
