import React, { useCallback, useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, Linking } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, spacing, shadow } from "../theme/colors";
import { getMyLocale } from "../lib/api";
import { countryFromLocale, COUNTRY_LABELS, type Country } from "../lib/country";
import type { AppStackParamList } from "../navigation/RootNavigator";

interface Step {
  title: string;
  body: string;
  action?: { label: string; icon: keyof typeof Ionicons.glyphMap; url: string };
}

// Numeros/organismes verifies par pays (recherche web effectuee avant
// integration — donner un faux numero dans une app de protection serait
// pire que de ne pas en donner). Quand aucune ligne nationale fiable
// n'existe (ex: opposition carte en FR/NL, qui varie par banque), on ne
// l'invente pas : on renvoie vers la banque ou l'organisme officiel.
const STEPS_BY_COUNTRY: Record<Country, Step[]> = {
  BE: [
    {
      title: "Carte ou compte compromis",
      body:
        "Tu as déjà payé ou partagé un code ? Bloque immédiatement ta carte/compte. En Belgique : Card Stop, 24h/24.",
      action: { label: "Appeler Card Stop (078 170 170)", icon: "call", url: "tel:078170170" },
    },
    {
      title: "Codes itsme partagés",
      body: "Bloque immédiatement ton application itsme depuis le menu de l'app, puis contacte ta banque.",
    },
    {
      title: "Déposer plainte",
      body: "Contacte la police locale ou rends-toi au commissariat. Conserve tous les messages et preuves.",
      action: { label: "Appeler la police (101)", icon: "call", url: "tel:101" },
    },
    {
      title: "Signaler le message suspect",
      body: "Transfère le SMS suspect au 8222 (Suspect SMS) ou signale-le sur safeonweb.be.",
      action: { label: "Ouvrir safeonweb.be", icon: "open-outline", url: "https://www.safeonweb.be" },
    },
  ],
  FR: [
    {
      title: "Carte ou compte compromis",
      body:
        "Fais opposition immédiatement auprès de ta banque (numéro au dos de la carte ou dans l'app), puis signale le cas sur 17Cyber, la plateforme officielle police/gendarmerie dédiée aux fraudes bancaires.",
      action: { label: "Ouvrir 17Cyber (aide officielle)", icon: "open-outline", url: "https://www.17cyber.gouv.fr" },
    },
    {
      title: "Identifiants ou codes partagés",
      body: "Change immédiatement tes mots de passe et contacte ta banque si des coordonnées bancaires ont été transmises.",
    },
    {
      title: "Déposer plainte",
      body: "Contacte la police ou la gendarmerie. Conserve tous les messages et preuves.",
      action: { label: "Appeler la police (17)", icon: "call", url: "tel:17" },
    },
    {
      title: "Signaler le message suspect",
      body: "Transfère le SMS suspect au 33700, le numéro national gratuit de lutte contre les SMS frauduleux.",
      action: {
        label: "En savoir plus (33700)",
        icon: "open-outline",
        url: "https://www.economie.gouv.fr/dgccrf/sms-et-appels-indesirables-le-33-700-facilite-le-signalement-des-numeros-frauduleux",
      },
    },
  ],
  NL: [
    {
      title: "Kaart of rekening gecompromitteerd",
      body: "Neem onmiddellijk contact op met je bank (nummer op je pas of in de app) om te blokkeren.",
    },
    {
      title: "Wachtwoorden of codes gedeeld",
      body: "Wijzig onmiddellijk je wachtwoorden en neem contact op met je bank.",
    },
    {
      title: "Aangifte doen",
      body: "Doe aangifte van fraude bij de politie.",
      action: { label: "Bel de politie (0900-8844)", icon: "call", url: "tel:0900-8844" },
    },
    {
      title: "Verdacht bericht melden",
      body: "Stuur het nepbericht door naar de Fraudehelpdesk voor onderzoek en waarschuwing van anderen.",
      action: { label: "Open fraudehelpdesk.nl", icon: "open-outline", url: "https://www.fraudehelpdesk.nl" },
    },
  ],
};

export default function EmergencyScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const insets = useSafeAreaInsets();
  const [country, setCountry] = useState<Country>("BE");

  useFocusEffect(
    useCallback(() => {
      getMyLocale()
        .then((locale) => setCountry(countryFromLocale(locale)))
        .catch((err) => console.warn("getMyLocale failed", err));
    }, []),
  );

  const STEPS = STEPS_BY_COUNTRY[country];

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + spacing.lg }]}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoBadge}>
            <Ionicons name="shield-checkmark" size={18} color="#fff" />
          </View>
          <View>
            <Text style={styles.appName}>Anti-Scam Family</Text>
            <Text style={styles.appSubtitle}>Urgence · {COUNTRY_LABELS[country]}</Text>
          </View>
        </View>
        <Pressable style={styles.avatarButton} onPress={() => navigation.navigate("Account")}>
          <Ionicons name="person" size={18} color={colors.ink} />
        </Pressable>
      </View>

      <Pressable style={styles.changeCountryLink} onPress={() => navigation.navigate("Account")}>
        <Ionicons name="earth-outline" size={13} color={colors.textMuted} />
        <Text style={styles.changeCountryText}>Changer de pays</Text>
      </Pressable>

      <View style={styles.alertBanner}>
        <View style={styles.alertIconWrap}>
          <Ionicons name="power" size={20} color={colors.urgentText} />
        </View>
        <Text style={styles.alertLabel}>CONTAINMENT PRIORITAIRE</Text>
        <Text style={styles.alertTitle}>Assistance arnaque en urgence</Text>
        <Text style={styles.alertBody}>
          Toi ou un proche avez cliqué sur un lien, partagé un code, ou envoyé de l'argent ?
          Agissez vite pour limiter les dégâts.
        </Text>
      </View>

      <Pressable style={styles.familyCard} onPress={() => navigation.navigate("CallFamily")}>
        <View style={styles.familyIconWrap}>
          <Ionicons name="people" size={18} color={colors.ink} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.familyCardTitle}>Appeler un proche</Text>
          <Text style={styles.familyCardSubtitle}>
            En cas de doute, le réflexe le plus sûr : appeler directement sur un numéro connu.
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Pressable>

      <View style={styles.stepsHeader}>
        <Text style={styles.stepsTitle}>Protocole en 4 étapes</Text>
        <View style={styles.stepByStepPill}>
          <Text style={styles.stepByStepText}>Étape par étape</Text>
        </View>
      </View>

      {STEPS.map((step, idx) => (
        <View key={idx} style={styles.stepCard}>
          <View style={styles.stepHeaderRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>{idx + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepBody}>{step.body}</Text>
            </View>
          </View>
          {step.action && (
            <Pressable
              style={styles.stepActionButton}
              onPress={() => Linking.openURL(step.action!.url).catch(() => undefined)}
            >
              <Ionicons name={step.action.icon} size={15} color="#fff" />
              <Text style={styles.stepActionText}>{step.action.label}</Text>
            </Pressable>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: spacing.xl, paddingBottom: 110 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.lg },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  logoBadge: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  appName: { fontSize: 15, fontWeight: "800", color: colors.text },
  appSubtitle: { fontSize: 11.5, color: colors.textMuted },
  avatarButton: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  changeCountryLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    marginBottom: spacing.lg,
  },
  changeCountryText: { fontSize: 11.5, color: colors.textMuted, textDecorationLine: "underline" },
  alertBanner: {
    backgroundColor: colors.urgentBg,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  alertIconWrap: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  alertLabel: { fontSize: 11.5, fontWeight: "800", color: colors.urgentText, letterSpacing: 0.5, marginBottom: spacing.xs },
  alertTitle: { fontSize: 20, fontWeight: "800", color: colors.text, marginBottom: spacing.xs, lineHeight: 25 },
  alertBody: { fontSize: 13, color: colors.text, lineHeight: 19, opacity: 0.8 },
  familyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    ...shadow.card,
  },
  familyIconWrap: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.pillInactive,
    alignItems: "center",
    justifyContent: "center",
  },
  familyCardTitle: { fontSize: 14.5, fontWeight: "800", color: colors.text },
  familyCardSubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2, lineHeight: 16 },
  stepsHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md },
  stepsTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
  stepByStepPill: { backgroundColor: colors.pillInactive, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 5 },
  stepByStepText: { fontSize: 11, fontWeight: "700", color: colors.textMuted },
  stepCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  stepHeaderRow: { flexDirection: "row", gap: spacing.md },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBadgeText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  stepTitle: { fontSize: 14.5, fontWeight: "800", color: colors.text, marginBottom: 3 },
  stepBody: { fontSize: 12.5, color: colors.textMuted, lineHeight: 18 },
  stepActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.danger,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    marginTop: spacing.md,
  },
  stepActionText: { color: "#fff", fontWeight: "700", fontSize: 12.5 },
});
