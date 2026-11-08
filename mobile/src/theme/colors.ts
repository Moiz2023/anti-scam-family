// Systeme de design Anti-Scam Family. Theme sombre (demande explicite :
// reprendre la palette d'une maquette de reference). Convention dark-mode
// standard : l'elevation se fait par des surfaces plus CLAIRES que le fond
// (pas par assombrissement comme en theme clair).
//
// "ink" est l'accent clair utilise comme COULEUR DE PREMIER PLAN (icones,
// liens, etats actifs) sur les fonds sombres. "onInk" est son complement :
// la couleur de texte/icone a utiliser PAR-DESSUS un fond de la couleur
// "ink" (boutons pleins, pastilles actives) — les deux ne peuvent pas
// partager la meme valeur des qu'on est en theme sombre.

export const colors = {
  background: "#0B0C10",
  surface: "#17181F",
  surfaceAlt: "#1F212B",
  text: "#F3F4F8",
  textMuted: "#9598AA",
  border: "#2A2C38",

  brand: "#4C3DF2",
  brandDark: "#2E1FB8",
  brandSoft: "#EDEAFF",

  faible: "#34D399",
  faibleSoft: "#123524",
  attention: "#F2A33D",
  attentionSoft: "#3A2A12",
  danger: "#F2495F",
  dangerSoft: "#3A141C",
  help: "#7A4DF2",
  helpSoft: "#F0E9FF",

  // Navy distinct et plus clair que "background" : sert de carte "heros"
  // mise en avant (ex: carte "Verification rapide" du Dashboard).
  dark: "#17152B",
  darkAlt: "#201D3C",

  white: "#FFFFFF",

  // Palette "KinShield" (maquette) : utilisee par les ecrans a onglets
  // (Dashboard / Scan / Activite / Urgence). La couleur de risque reste le
  // seul signal decoratif — jamais de decor gratuit.
  ink: "#F3F4F8",
  onInk: "#0E0F14",
  inkSoft: "rgba(243,244,248,0.08)",
  pillInactive: "#1F212B",
  urgentBg: "#3A141C",
  urgentText: "#FF6B81",
  safeBg: "#123524",
  safeText: "#4ADE80",
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
