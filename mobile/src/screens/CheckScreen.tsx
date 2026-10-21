import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";
import { colors, radius, spacing, shadow } from "../theme/colors";
import { analyzeMessage } from "../lib/api";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AppStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<AppStackParamList, "Check">;
type Mode = "message" | "phone" | "screenshot";

export default function CheckScreen({ navigation, route }: Props) {
  const prefillLink = route.params?.prefillLink;
  const [mode, setMode] = useState<Mode>("message");
  const [text, setText] = useState(prefillLink ?? "");
  const [sender, setSender] = useState("");
  const [link, setLink] = useState(prefillLink ?? "");
  const [phone, setPhone] = useState("");
  const [screenshot, setScreenshot] = useState<{ uri: string; base64: string; mediaType: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handlePaste() {
    const clipboardText = await Clipboard.getStringAsync();
    if (clipboardText) setText(clipboardText);
  }

  async function handlePickScreenshot() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Accès refusé",
        "Autorise l'accès aux photos pour pouvoir analyser une capture d'écran.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      base64: true,
      quality: 0.7,
    });

    if (result.canceled || !result.assets?.[0]?.base64) return;

    const asset = result.assets[0];
    const mediaType = asset.mimeType ?? "image/jpeg";
    setScreenshot({ uri: asset.uri, base64: asset.base64!, mediaType });
  }

  async function handleCheck() {
    if (mode === "screenshot") {
      if (!screenshot) {
        Alert.alert("Aucune image", "Choisis une capture d'écran à analyser.");
        return;
      }
      setLoading(true);
      try {
        const result = await analyzeMessage({
          inputType: "screenshot",
          imageBase64: screenshot.base64,
          imageMediaType: screenshot.mediaType,
        });
        navigation.navigate("Result", { result });
      } catch (err) {
        Alert.alert(
          "Erreur",
          err instanceof Error ? err.message : "L'analyse a échoué. Vérifie ta connexion et réessaie.",
        );
        console.error(err);
      } finally {
        setLoading(false);
      }
      return;
    }

    const value = mode === "phone" ? phone : text;
    if (!value.trim()) {
      Alert.alert(
        "Champ vide",
        mode === "phone" ? "Entre le numéro à vérifier." : "Colle ou écris le message reçu avant de vérifier.",
      );
      return;
    }
    setLoading(true);
    try {
      const result =
        mode === "phone"
          ? await analyzeMessage({ text: phone.trim(), inputType: "phone" })
          : await analyzeMessage({
              text: text.trim(),
              sender: sender.trim() || undefined,
              link: link.trim() || undefined,
              source: "manual",
            });
      navigation.navigate("Result", { result, isPhoneCheck: mode === "phone" });
    } catch (err) {
      Alert.alert(
        "Erreur",
        err instanceof Error ? err.message : "L'analyse a échoué. Vérifie ta connexion et réessaie.",
      );
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.modeSwitch}>
          <Pressable
            style={[styles.modeButton, mode === "message" && styles.modeButtonActive]}
            onPress={() => setMode("message")}
          >
            <Ionicons name="chatbubble-outline" size={14} color={mode === "message" ? "#fff" : colors.textMuted} />
            <Text style={[styles.modeButtonText, mode === "message" && styles.modeButtonTextActive]}>Message</Text>
          </Pressable>
          <Pressable
            style={[styles.modeButton, mode === "phone" && styles.modeButtonActive]}
            onPress={() => setMode("phone")}
          >
            <Ionicons name="call-outline" size={14} color={mode === "phone" ? "#fff" : colors.textMuted} />
            <Text style={[styles.modeButtonText, mode === "phone" && styles.modeButtonTextActive]}>Numéro</Text>
          </Pressable>
          <Pressable
            style={[styles.modeButton, mode === "screenshot" && styles.modeButtonActive]}
            onPress={() => setMode("screenshot")}
          >
            <Ionicons name="image-outline" size={14} color={mode === "screenshot" ? "#fff" : colors.textMuted} />
            <Text style={[styles.modeButtonText, mode === "screenshot" && styles.modeButtonTextActive]}>Capture</Text>
          </Pressable>
        </View>

        {mode === "message" && (
          <>
            <Text style={styles.title}>Vérifier un message</Text>
            <Text style={styles.subtitle}>
              Colle le texte du SMS, WhatsApp ou email reçu. Nous analysons les signaux de
              risque, sans jamais garantir qu'un message est totalement sûr.
            </Text>

            <TextInput
              style={styles.textarea}
              placeholder="Colle ou écris le message ici..."
              placeholderTextColor={colors.textMuted}
              multiline
              value={text}
              onChangeText={setText}
            />

            <View style={styles.quickActionsRow}>
              <Pressable style={styles.quickAction} onPress={handlePaste}>
                <Ionicons name="clipboard-outline" size={15} color={colors.brand} />
                <Text style={styles.quickActionText}>Coller</Text>
              </Pressable>
              <Pressable style={styles.quickAction} onPress={() => navigation.navigate("QrScan")}>
                <Ionicons name="qr-code-outline" size={15} color={colors.brand} />
                <Text style={styles.quickActionText}>Scanner un QR code</Text>
              </Pressable>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Numéro ou nom de l'expéditeur (optionnel)"
              placeholderTextColor={colors.textMuted}
              value={sender}
              onChangeText={setSender}
            />
            <TextInput
              style={styles.input}
              placeholder="Lien reçu (optionnel)"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              value={link}
              onChangeText={setLink}
            />
          </>
        )}

        {mode === "phone" && (
          <>
            <Text style={styles.title}>Vérifier un numéro</Text>
            <Text style={styles.subtitle}>
              Un appel manqué ou un SMS d'un numéro inconnu te paraît louche ? Entre-le
              ci-dessous. Nous n'avons pas de base de réputation en temps réel : l'analyse se
              base sur le format du numéro (indicatif, séries surtaxées).
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Ex: +216 12 345 678 ou 0900 12345"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
          </>
        )}

        {mode === "screenshot" && (
          <>
            <Text style={styles.title}>Vérifier une capture d'écran</Text>
            <Text style={styles.subtitle}>
              Choisis une capture d'écran d'un SMS, WhatsApp ou e-mail suspect. Nous lisons
              et analysons le texte visible — l'image elle-même n'est jamais conservée.
            </Text>

            {screenshot ? (
              <View style={styles.previewWrap}>
                <Image source={{ uri: screenshot.uri }} style={styles.preview} resizeMode="cover" />
                <Pressable style={styles.changeImageButton} onPress={handlePickScreenshot}>
                  <Ionicons name="swap-horizontal" size={14} color={colors.brand} />
                  <Text style={styles.changeImageText}>Changer d'image</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable style={styles.pickButton} onPress={handlePickScreenshot}>
                <Ionicons name="images-outline" size={28} color={colors.brand} />
                <Text style={styles.pickButtonText}>Choisir une capture d'écran</Text>
              </Pressable>
            )}
          </>
        )}

        <Pressable style={styles.checkButton} onPress={handleCheck} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="search" size={18} color="#fff" />
              <Text style={styles.checkButtonText}>
                {mode === "phone" ? "Analyser ce numéro" : mode === "screenshot" ? "Analyser cette capture" : "Analyser ce message"}
              </Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: spacing.xl, paddingTop: 32 },
  modeSwitch: {
    flexDirection: "row",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    padding: 4,
    marginBottom: spacing.xl,
  },
  modeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  modeButtonActive: { backgroundColor: colors.brand },
  modeButtonText: { color: colors.textMuted, fontWeight: "700", fontSize: 12.5 },
  modeButtonTextActive: { color: "#fff" },
  title: { fontSize: 22, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: spacing.sm, marginBottom: spacing.xl, lineHeight: 18 },
  textarea: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    minHeight: 140,
    textAlignVertical: "top",
    fontSize: 15,
    color: colors.text,
    ...shadow.card,
  },
  quickActionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  quickAction: { flexDirection: "row", alignItems: "center", gap: 6 },
  quickActionText: { color: colors.brand, fontSize: 13, fontWeight: "700" },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    marginBottom: spacing.md,
    fontSize: 15,
    color: colors.text,
  },
  pickButton: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: "dashed",
    borderRadius: radius.md,
    paddingVertical: spacing.xxl,
    alignItems: "center",
    gap: spacing.sm,
  },
  pickButtonText: { color: colors.brand, fontWeight: "700", fontSize: 14 },
  previewWrap: { alignItems: "center" },
  preview: {
    width: "100%",
    height: 220,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  changeImageButton: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.md },
  changeImageText: { color: colors.brand, fontSize: 13, fontWeight: "700" },
  checkButton: {
    backgroundColor: colors.brand,
    borderRadius: radius.sm,
    paddingVertical: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.xl,
    ...shadow.button,
  },
  checkButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
