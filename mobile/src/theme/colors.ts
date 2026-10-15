export const colors = {
  background: "#F7F8FA",
  surface: "#FFFFFF",
  text: "#1A1D23",
  textMuted: "#6B7280",
  primary: "#2457C5",
  border: "#E3E6EB",
  faible: "#2E9E5B",
  attention: "#E39A1F",
  danger: "#D23A3A",
  help: "#6B46C1",
};

export function colorForNiveau(niveau: "faible" | "attention" | "danger"): string {
  if (niveau === "danger") return colors.danger;
  if (niveau === "attention") return colors.attention;
  return colors.faible;
}

export function labelForNiveau(niveau: "faible" | "attention" | "danger"): string {
  if (niveau === "danger") return "DANGER";
  if (niveau === "attention") return "ATTENTION";
  return "Risque faible";
}
