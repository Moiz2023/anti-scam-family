import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, shadow } from "../theme/colors";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AppStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<AppStackParamList, "QrScan">;

export default function QrScanScreen({ navigation }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  function handleScanned(result: BarcodeScanningResult) {
    if (scanned) return;
    setScanned(true);
    navigation.replace("Tabs", { screen: "ScanTab", params: { prefillLink: result.data } });
  }

  if (!permission) {
    return <View style={{ flex: 1, backgroundColor: colors.dark }} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="camera-outline" size={40} color={colors.textMuted} />
        <Text style={styles.permissionTitle}>Accès à l'appareil photo nécessaire</Text>
        <Text style={styles.permissionBody}>
          Pour scanner un QR code (ex: une amende de stationnement) et vérifier le lien avant
          de payer.
        </Text>
        <Pressable style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Autoriser la caméra</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.dark }}>
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={scanned ? undefined : handleScanned}
      >
        <View style={styles.overlay}>
          <View style={styles.frame} />
          <Text style={styles.hint}>Cadre le QR code dans le carré</Text>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: "center", justifyContent: "center" },
  frame: {
    width: 240,
    height: 240,
    borderRadius: radius.md,
    borderWidth: 3,
    borderColor: "#fff",
  },
  hint: { color: "#fff", marginTop: spacing.xl, fontSize: 14, fontWeight: "600" },
  permissionContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xxl,
  },
  permissionTitle: { fontSize: 17, fontWeight: "800", color: colors.text, marginTop: spacing.lg, textAlign: "center" },
  permissionBody: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
    lineHeight: 19,
  },
  permissionButton: {
    backgroundColor: colors.brand,
    borderRadius: radius.sm,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxl,
    ...shadow.button,
  },
  permissionButtonText: { color: "#fff", fontWeight: "700" },
});
