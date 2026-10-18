// Heuristiques pour un numero de telephone (pas un message). Pas de base de
// reputation en temps reel pour l'instant (V1) : on se limite a des motifs
// connus et documentes publiquement (indicatifs frequemment utilises pour le
// "Wangiri" / rappel surtaxe, numeros surtaxes belges). A traiter comme un
// signal d'attention, jamais comme une preuve.

export interface PhoneHeuristicResult {
  heuristicScore: number;
  raisons: string[];
  normalized: string;
}

// Indicatifs internationaux frequemment cites dans les campagnes "Wangiri"
// (appel manque + rappel surtaxe) visant l'Europe. Liste non exhaustive.
const WANGIRI_PREFIXES = [
  "216", // Tunisie
  "371", // Lettonie
  "373", // Moldavie
  "252", // Somalie
  "245", // Guinee-Bissau
  "232", // Sierra Leone
  "231", // Liberia
  "239", // Sao Tome
  "881", // Reseaux satellites globaux
  "882", // Reseaux internationaux
  "500", // Falkland
];

// Numeros surtaxes belges (0900-0909).
const BE_PREMIUM_PATTERN = /^32?0?90[0-9]/;

function onlyDigits(input: string): string {
  return input.replace(/[^\d]/g, "");
}

export function computePhoneHeuristics(rawNumber: string): PhoneHeuristicResult {
  const raisons: string[] = [];
  let score = 0;

  const digits = onlyDigits(rawNumber);
  const normalized = rawNumber.trim();

  if (digits.length < 6) {
    return { heuristicScore: 0, raisons: ["Numero trop court pour etre analyse"], normalized };
  }

  // Numero surtaxe belge (0900-0909 / +32 900-909...)
  const beLocal = digits.startsWith("0") ? digits.slice(1) : digits.startsWith("32") ? digits.slice(2) : digits;
  if (/^90[0-9]/.test(beLocal)) {
    score += 60;
    raisons.push(
      "Numero surtaxe belge (serie 0900) : vous rappeler coute cher, signal classique d'arnaque au rappel",
    );
  }

  // Indicatif international frequemment associe au Wangiri (appel manque,
  // rappel surtaxe).
  const intlPrefix = digits.startsWith("00")
    ? digits.slice(2)
    : digits.startsWith("+")
      ? digits.slice(1)
      : !digits.startsWith("0")
        ? digits
        : null;

  if (intlPrefix) {
    const matchedPrefix = WANGIRI_PREFIXES.find((p) => intlPrefix.startsWith(p));
    if (matchedPrefix) {
      score += 45;
      raisons.push(
        `Indicatif international (+${matchedPrefix}) frequemment utilise dans des arnaques "Wangiri" ` +
          "(appel manque puis rappel surtaxe) — ne rappelez pas un numero inconnu que vous n'attendiez pas",
      );
    }
  }

  if (raisons.length === 0) {
    raisons.push("Aucun motif connu d'arnaque telephonique detecte sur ce numero");
  }

  return { heuristicScore: Math.min(100, score), raisons, normalized };
}
