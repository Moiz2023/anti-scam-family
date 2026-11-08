import React from "react";
import { Pressable, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { colors, radius, shadow } from "../theme/colors";
import type { TabParamList } from "../navigation/RootNavigator";

// Bouton flottant permanent : accès en un tap au Scanner depuis Dashboard,
// Activité ou Urgence, sans devoir chercher l'onglet. Absent sur l'écran
// Scanner lui-même (redondant).
export default function QuickScanFab() {
  const navigation = useNavigation<NativeStackNavigationProp<TabParamList>>();

  return (
    <Pressable
      style={styles.fab}
      onPress={() => navigation.navigate("ScanTab")}
      hitSlop={8}
    >
      <Ionicons name="search" size={22} color="#fff" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 18,
    bottom: 104,
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.button,
    ...Platform.select({ web: { boxShadow: "0 10px 24px rgba(19,21,31,0.3)" } }),
  },
});
