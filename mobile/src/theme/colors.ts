// Systeme de design Anti-Scam Family. Palette plus chaleureuse/distinctive
// qu'un simple bleu/orange/rouge plats : un indigo profond comme couleur de
// marque, des degrades pour les zones heros/CTA, et une echelle d'espacement
// coherente reutilisee par tous les ecrans.

export const colors = {
  background: "#F4F5FA",
  surface: "#FFFFFF",
  surfaceAlt: "#EEF0FA",
  text: "#161A2E",
  textMuted: "#6B7088",
  border: "#E4E6F2",

  brand: "#4C3DF2",
  brandDark: "#2E1FB8",
  brandSoft: "#EDEAFF",

  faible: "#1F9D6B",
  faibleSoft: "#E3F7EE",
  attention: "#E08A1E",
  attentionSoft: "#FDF1DD",
  danger: "#E13B5C",
  dangerSoft: "#FCE4EA",
  help: "#7A4DF2",
  helpSoft: "#F0E9FF",

  white: "#FFFFFF",
};

export const gradients = {
  brand: ["#5B4CF5", "#8B3DF2"] as const,
  check: ["#4C3DF2", "#7A4DF2"] as const,
  callFamily: ["#F2A33D", "#E08A1E"] as const,
  help: ["#8B5CF6", "#6D3DF2"] as const,
  danger: ["#E13B5C", "#C22347"] as const,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999,
};

export const shadow = {
  card: {
    shadowColor: "#1A1033",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  button: {
    shadowColor: "#1A1033",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 6,
  },
};

export function colorForNiveau(niveau: "faible" | "attention" | "danger"): string {
  if (niveau === "danger") return colors.danger;
  if (niveau === "attention") return colors.attention;
  return colors.faible;
}

export function softColorForNiveau(niveau: "faible" | "attention" | "danger"): string {
  if (niveau === "danger") return colors.dangerSoft;
  if (niveau === "attention") return colors.attentionSoft;
  return colors.faibleSoft;
}

export function labelForNiveau(niveau: "faible" | "attention" | "danger"): string {
  if (niveau === "danger") return "DANGER";
  if (niveau === "attention") return "ATTENTION";
  return "Risque faible";
}
