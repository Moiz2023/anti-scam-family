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

export default function CheckScreen({ navigation }: Props) {
  const [text, setText] = useState("");
  const [sender, setSender] = useState("");
  const [link, setLink] = useState("");
  const [loading, setLoading] = useState(false);

  async function handlePaste() {
    const clipboardText = await Clipboard.getStringAsync();
    if (clipboardText) setText(clipboardText);
  }

  async function handleCheck() {
    if (!text.trim()) {
      Alert.alert("Message vide", "Colle ou écris le message reçu avant de vérifier.");
      return;
    }
    setLoading(true);
    try {
      const result = await analyzeMessage({
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

        <Pressable style={styles.pasteButton} onPress={handlePaste}>
          <Ionicons name="clipboard-outline" size={15} color={colors.brand} />
          <Text style={styles.pasteButtonText}>Coller depuis le presse-papier</Text>
        </Pressable>

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

        <Pressable style={styles.checkButton} onPress={handleCheck} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="search" size={18} color="#fff" />
              <Text style={styles.checkButtonText}>Analyser ce message</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: spacing.xl, paddingTop: 32 },
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
  pasteButton: {
    alignSelf: "flex-end",
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pasteButtonText: { color: colors.brand, fontSize: 13, fontWeight: "700" },
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
