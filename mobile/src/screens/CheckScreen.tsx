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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { colors, radius, spacing, shadow } from "../theme/colors";
import { analyzeMessage } from "../lib/api";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AppStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<AppStackParamList, "Check">;
type Mode = "message" | "phone";

export default function CheckScreen({ navigation, route }: Props) {
  const prefillLink = route.params?.prefillLink;
  const [mode, setMode] = useState<Mode>("message");
  const [text, setText] = useState(prefillLink ?? "");
  const [sender, setSender] = useState("");
  const [link, setLink] = useState(prefillLink ?? "");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  async function handlePaste() {
    const clipboardText = await Clipboard.getStringAsync();
    if (clipboardText) setText(clipboardText);
  }

  async function handleCheck() {
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
      navigation.navigate("Result", { result });
    } catch (err) {
      Alert.alert("Erreur", "L'analyse a échoué. Vérifie ta connexion et réessaie.");
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
            <Ionicons name="chatbubble-outline" size={15} color={mode === "message" ? "#fff" : colors.textMuted} />
            <Text style={[styles.modeButtonText, mode === "message" && styles.modeButtonTextActive]}>Message</Text>
          </Pressable>
          <Pressable
            style={[styles.modeButton, mode === "phone" && styles.modeButtonActive]}
            onPress={() => setMode("phone")}
          >
            <Ionicons name="call-outline" size={15} color={mode === "phone" ? "#fff" : colors.textMuted} />
            <Text style={[styles.modeButtonText, mode === "phone" && styles.modeButtonTextActive]}>Numéro</Text>
          </Pressable>
        </View>

        {mode === "message" ? (
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
        ) : (
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

        <Pressable style={styles.checkButton} onPress={handleCheck} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="search" size={18} color="#fff" />
              <Text style={styles.checkButtonText}>
                {mode === "phone" ? "Analyser ce numéro" : "Analyser ce message"}
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
    gap: 6,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  modeButtonActive: { backgroundColor: colors.brand },
  modeButtonText: { color: colors.textMuted, fontWeight: "700", fontSize: 13.5 },
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
  checkButton: {
    backgroundColor: colors.brand,
    borderRadius: radius.sm,
    paddingVertical: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
    ...shadow.button,
  },
  checkButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
