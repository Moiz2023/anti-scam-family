// Masquage des donnees personnelles AVANT tout envoi a l'IA et avant tout
// stockage (cahier des charges section 5 "Vie privee / RGPD" : masquage
// IBAN/telephone/e-mail obligatoire, retention du contenu brut = 0).
//
// On masque uniquement le texte libre (`text`), jamais les champs
// structures `sender`/`link` fournis deliberement pour l'analyse de
// format/domaine (sinon on casse les heuristiques qui en ont besoin).

export interface MaskResult {
  masked: string;
  foundTypes: string[];
}

const EMAIL_PATTERN = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;

// IBAN generique (2 lettres pays + 2 chiffres + 10-30 alphanumerique),
// suffisant pour BE (16) et les IBAN europeens courants.
const IBAN_PATTERN = /\b[A-Z]{2}\d{2}[ ]?[A-Z0-9]{4}[ ]?[A-Z0-9]{4}[ ]?[A-Z0-9]{4}[ ]?[A-Z0-9]{0,6}\b/g;

// Numeros de telephone belges/internationaux courants : +32..., 0032...,
// ou format local 0X XX XX XX XX. Volontairement specifique (pas juste
// "toute suite de chiffres") pour ne pas avaler les montants d'argent
// ("2800e") ou les codes postaux.
const PHONE_PATTERNS = [
  /\+32\s?\d(?:[\s./-]?\d){7,8}/g,
  /\b00\s?32\s?\d(?:[\s./-]?\d){7,8}/g,
  /\b0\d(?:[\s./-]?\d){7,8}\b/g,
];

export function maskPII(text: string): MaskResult {
  let masked = text;
  const foundTypes: string[] = [];

  if (EMAIL_PATTERN.test(masked)) foundTypes.push("email");
  masked = masked.replace(EMAIL_PATTERN, "[EMAIL]");

  if (IBAN_PATTERN.test(masked)) foundTypes.push("iban");
  masked = masked.replace(IBAN_PATTERN, "[IBAN]");

  for (const pattern of PHONE_PATTERNS) {
    if (pattern.test(masked)) foundTypes.push("tel");
    masked = masked.replace(pattern, "[TEL]");
  }

  return { masked, foundTypes: [...new Set(foundTypes)] };
}
