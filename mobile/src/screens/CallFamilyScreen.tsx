import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, Linking, ActivityIndicator, ScrollView } from "react-native";
import { colors } from "../theme/colors";
import { fetchMyProtectors, type LinkedPerson } from "../lib/api";

export default function CallFamilyScreen() {
  const [protectors, setProtectors] = useState<LinkedPerson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyProtectors()
      .then(setProtectors)
      .finally(() => setLoading(false));
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Appeler ma famille</Text>
      <Text style={styles.subtitle}>
        En cas de doute, le reflexe le plus sur reste d'appeler directement votre proche sur
        un numero que vous connaissez deja (pas celui recu dans le message suspect). Nous ne
        stockons pas les numeros de telephone de vos proches : ouvrez votre carnet de contacts
        habituel pour les joindre.
      </Text>

      {loading && <ActivityIndicator style={{ marginTop: 24 }} />}

      {!loading && protectors.length === 0 && (
        <Text style={styles.empty}>
          Aucun proche lie pour l'instant. Rendez-vous dans "Ma famille" pour en ajouter un.
        </Text>
      )}

      {protectors.map((p) => (
        <View key={p.id} style={styles.card}>
          <Text style={styles.name}>{p.full_name ?? "Proche"}</Text>
          <Pressable
            style={styles.callButton}
            onPress={() => Linking.openURL("tel:").catch(() => undefined)}
          >
            <Text style={styles.callButtonText}>Ouvrir le telephone</Text>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: colors.background, padding: 24, paddingTop: 48 },
  title: { fontSize: 22, fontWeight: "700", color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 8, marginBottom: 24 },
  empty: { color: colors.textMuted, fontSize: 14, textAlign: "center", marginTop: 40 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  name: { fontSize: 16, fontWeight: "600", color: colors.text },
  callButton: { backgroundColor: colors.attention, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16 },
  callButtonText: { color: "#fff", fontWeight: "700" },
});
