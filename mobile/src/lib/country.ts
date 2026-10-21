// Pays supportes pour les numeros d'urgence/organismes locaux. Derive du
// champ profiles.locale existant (ex: "fr-BE") plutot que d'ajouter une
// colonne dediee.

export type Country = "BE" | "FR" | "NL";

export const COUNTRY_LABELS: Record<Country, string> = {
  BE: "Belgique",
  FR: "France",
  NL: "Pays-Bas",
};

export const LOCALE_FOR_COUNTRY: Record<Country, string> = {
  BE: "fr-BE",
  FR: "fr-FR",
  NL: "nl-NL",
};

export function countryFromLocale(locale: string | null | undefined): Country {
  const region = locale?.split("-")[1]?.toUpperCase();
  if (region === "FR") return "FR";
  if (region === "NL") return "NL";
  return "BE";
}
