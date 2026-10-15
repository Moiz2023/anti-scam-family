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
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { colors } from "../theme/colors";
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
      Alert.alert("Message vide", "Colle ou ecris le message recu avant de verifier.");
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
      Alert.alert("Erreur", "L'analyse a echoue. Verifie ta connexion et reessaie.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.title}>Verifier un message</Text>
      <Text style={styles.subtitle}>
        Colle le texte du SMS, WhatsApp ou email que tu as recu. Nous analysons les
        signaux de risque, sans jamais garantir qu'un message est totalement sur.
      </Text>

      <TextInput
        style={styles.textarea}
        placeholder="Colle ou ecris le message ici..."
        multiline
        value={text}
        onChangeText={setText}
      />

      <Pressable style={styles.pasteButton} onPress={handlePaste}>
        <Text style={styles.pasteButtonText}>Coller depuis le presse-papier</Text>
      </Pressable>

      <TextInput
        style={styles.input}
        placeholder="Numero ou nom de l'expediteur (optionnel)"
        value={sender}
        onChangeText={setSender}
      />
      <TextInput
        style={styles.input}
        placeholder="Lien recu (optionnel)"
        autoCapitalize="none"
        value={link}
        onChangeText={setLink}
      />

      <Pressable style={styles.checkButton} onPress={handleCheck} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.checkButtonText}>Analyser ce message</Text>
        )}
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 24, paddingTop: 48 },
  title: { fontSize: 22, fontWeight: "700", color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 8, marginBottom: 20 },
  textarea: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 14,
    minHeight: 140,
    textAlignVertical: "top",
    fontSize: 15,
  },
  pasteButton: { alignSelf: "flex-end", marginTop: 8, marginBottom: 16 },
  pasteButtonText: { color: colors.primary, fontSize: 13, fontWeight: "600" },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 15,
  },
  checkButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  checkButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
