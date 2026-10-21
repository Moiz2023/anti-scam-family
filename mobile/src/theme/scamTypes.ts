import type { ScamType } from "../lib/api";

export const SCAM_TYPE_LABELS: Record<ScamType, string> = {
  fake_bank_advisor: "Faux conseiller bancaire",
  phishing_bank: "Phishing bancaire",
  itsme_phishing: "Faux itsme",
  parcel_bpost_dhl: "Faux colis",
  tax_government: "Faux SPF / administration",
  family_emergency: "Usurpation d'un proche",
  romance_scam: "Arnaque sentimentale",
  investment_crypto: "Faux investissement / crypto",
  tech_support: "Faux support technique",
  utilities_telecom: "Faux fournisseur / opérateur",
  health_mutuality: "Fausse mutualité",
  marketplace_scam: "Arnaque petites annonces",
  prize_lottery: "Faux gain / loterie",
  job_scam: "Fausse offre d'emploi",
  subscription_trap: "Faux abonnement",
  other_scam: "Autre arnaque",
  legitimate: "Légitime",
  unknown: "Indéterminé",
};
