import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { colors, radius, spacing, shadow } from "../theme/colors";
import { fetchPendingChecksWithEvents } from "../lib/api";

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  DashboardTab: "shield",
  ScanTab: "locate",
  ActivityTab: "notifications",
  EmergencyTab: "speedometer-outline",
};

const LABELS: Record<string, string> = {
  DashboardTab: "Dashboard",
  ScanTab: "Scanner",
  ActivityTab: "Activité",
  EmergencyTab: "Urgence",
};

export default function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    let active = true;
    fetchPendingChecksWithEvents()
      .then((checks) => {
        if (active) setPendingCount(checks.length);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
    // On recharge le compteur a chaque changement d'onglet : suffisant pour
    // rester a jour sans etat global, et peu couteux (une seule requete).
  }, [state.index]);

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, spacing.md) }]} pointerEvents="box-none">
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const color = isFocused ? colors.ink : colors.textMuted;

          function onPress() {
            const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
          }

          return (
            <Pressable key={route.key} onPress={onPress} style={styles.item} hitSlop={6}>
              <View style={styles.iconWrap}>
                <Ionicons name={ICONS[route.name]} size={21} color={color} />
                {route.name === "ScanTab" && <View style={styles.liveDot} />}
                {route.name === "ActivityTab" && pendingCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{pendingCount > 9 ? "9+" : pendingCount}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.label, { color, fontWeight: isFocused ? "800" : "600" }]}>
                {LABELS[route.name]}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: "transparent",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  bar: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    ...shadow.card,
    ...Platform.select({ web: { boxShadow: "0 8px 24px rgba(19,21,31,0.12)" } }),
  },
  item: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3, paddingVertical: 4 },
  iconWrap: { position: "relative" },
  label: { fontSize: 11 },
  liveDot: {
    position: "absolute",
    top: -2,
    right: -4,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.faible,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  badge: {
    position: "absolute",
    top: -6,
    right: -9,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: { color: "#fff", fontSize: 9.5, fontWeight: "800" },
});
