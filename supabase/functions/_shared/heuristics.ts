// Regles/heuristiques independantes du LLM. Objectif : un signal explicable,
// deterministe, qui fonctionne meme si l'appel LLM echoue ou n'est pas
// configure (pas de cle API en dev).

export interface AnalyzeInput {
  text: string;
  sender?: string;
  link?: string;
}

export interface HeuristicResult {
  heuristicScore: number; // 0-100
  raisons: string[];
}

const URGENCY_WORDS = [
  "urgent", "urgence", "immediatement", "immédiatement", "aujourd'hui meme",
  "aujourd'hui même", "maintenant", "vite", "tres vite", "très vite",
  "dans l'heure", "derniere chance", "dernière chance",
  "dringend", "onmiddellijk", "nu meteen",
];

// Demandes d'argent intrinsequement a risque : une facture legitime ne les
// contient jamais (contrairement a "virement"/"IBAN", voir TRANSFER_WORDS).
const MONEY_WORDS = [
  "vire-moi", "vire moi", "envoie-moi", "envoie moi",
  "carte cadeau", "carte-cadeau", "cartes cadeaux", "cartes-cadeaux",
  "gift card", "bitcoin", "crypto", "cryptomonnaie", "western union",
  "mandat cash", "stortkaart", "cadeaukaart",
];

// Simple mention d'un virement/IBAN : neutre en soi (toute facture legitime
// d'un fournisseur en parle). Sert uniquement a renforcer un autre signal
// deja present (changement de beneficiaire, urgence...), jamais seul.
const TRANSFER_WORDS = [
  "virement", "iban", "overschrijving", "numero de compte",
  "numéro de compte",
];

const CREDENTIAL_WORDS = [
  "code itsme", "code de confirmation", "code secret", "ton code",
  "votre code", "numero de carte", "numéro de carte", "cvv", "cvv-code",
  "mot de passe", "wachtwoord", "pincode", "code pin", "kaartgegevens",
  "coordonnees bancaires", "coordonnées bancaires", "informations bancaires",
  "donnees bancaires", "données bancaires", "numero de compte complet",
];

const IDENTITY_DOCUMENT_WORDS = [
  "carte d'identite", "carte d'identité", "copie de votre carte",
  "copie de passeport", "copie du passeport", "scan de votre carte",
];

const BENEFICIARY_CHANGE_WORDS = [
  "nouveau compte", "nouveau beneficiaire", "nouveau bénéficiaire",
  "changement de compte", "nouvelles coordonnees bancaires",
  "nouvelles coordonnées bancaires", "nouveau iban",
  "modifie nos coordonnees", "modifie nos coordonnées",
];

const IMPERSONATION_WORDS = [
  "nouveau numero", "nouveau numéro", "c'est moi", "ne me reconnais pas",
  "j'ai change de numero", "j'ai changé de numéro", "nieuw nummer",
  "mon telephone est casse", "mon téléphone est cassé", "mon tel est tombe",
  "mon tél est tombé", "telefoon kapot", "nieuw gsm-nummer",
];

// Signature du "faux policier" : un agent pretend proteger l'argent/bijoux de
// la victime d'un blanchiment ou de billets contrefaits et demande de les
// remettre en main propre ou de les deposer. Tres cible sur les personnes
// agees en Belgique/France.
const FAKE_OFFICER_WORDS = [
  "agent va passer", "un collegue va passer", "un collègue va passer",
  "remettre l'argent", "remettre vos bijoux", "remettre votre argent",
  "garde a vue", "garde à vue", "operation de police", "opération de police",
  "verification de billets", "vérification de billets", "blanchiment",
  "faux-monnayage", "faux monnayage", "mettre en securite", "mettre en sécurité",
];

const SECRECY_WORDS = [
  "ne dis a personne", "ne dis à personne", "garde ca secret",
  "garde ça secret", "ne previens pas", "ne préviens pas",
  "niet vertellen", "geheim houden",
];

// Marques/organismes couramment usurpes en Belgique et pays voisins (ordre
// d'expansion prevu : BE -> FR -> NL). Citer une marque est neutre en soi
// (voir plus bas) — ca ne sert qu'a renforcer un signal deja suspect.
const AUTHORITY_IMPERSONATION_WORDS = [
  // Belgique
  "spf finances", "impots", "impôts", "carte stop", "card stop",
  "votre banque", "service fraude", "bpost", "itsme support",
  "fraudedienst", "fod financien", "proximus", "telenet",
  "bnp paribas fortis", "bnp paribas", "ing bank", "mijn ing",
  "belfius", "federale politie", "police federale", "police fédérale",
  "europol",
  // Paiement / marketplace / livraison (BE + FR + NL)
  "paypal", "vinted", "dhl",
  // France
  "la poste", "colissimo", "ameli.fr", "impots.gouv",
  // Pays-Bas
  "postnl", "ing belgie", "belastingdienst",
];

// "confirm" volontairement exclu : trop generique, present dans la quasi
// totalite des liens de confirmation legitimes (rendez-vous, commandes...).
const SUSPICIOUS_LINK_WORDS = [
  "secure", "verify", "update", "account", "login",
  "remboursement", "douane", "frais", "amende", "facture", "betaling",
  "paiement", "regul",
];

const SUSPICIOUS_LINK_PATTERNS = [
  /bit\.ly/i, /tinyurl/i, /t\.co\//i, /is\.gd/i, /goo\.gl/i,
  /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/, // IP address as host
  /\.(top|xyz|work|click|quest|support|live|gq|tk|cf|ml|ga)(\/|$)/i,
];

function containsAny(haystack: string, needles: string[]): string[] {
  const lower = haystack.toLowerCase();
  return needles.filter((n) => lower.includes(n.toLowerCase()));
}

function isSuspiciousLink(link: string): boolean {
  const lower = link.toLowerCase();
  if (SUSPICIOUS_LINK_PATTERNS.some((p) => p.test(lower))) return true;
  return SUSPICIOUS_LINK_WORDS.some((w) => lower.includes(w));
}

export function computeHeuristics(input: AnalyzeInput): HeuristicResult {
  const raisons: string[] = [];
  let score = 0;

  const text = input.text ?? "";

  const urgency = containsAny(text, URGENCY_WORDS);
  if (urgency.length > 0) {
    score += 20;
    raisons.push("Le message insiste sur l'urgence (\"" + urgency[0] + "\")");
  }

  const money = containsAny(text, MONEY_WORDS);
  if (money.length > 0) {
    score += 25;
    raisons.push("Demande d'argent, de carte-cadeau ou de cryptomonnaie detectee");
  }

  const transferMention = containsAny(text, TRANSFER_WORDS);

  const credentials = containsAny(text, CREDENTIAL_WORDS);
  if (credentials.length > 0) {
    score += 30;
    raisons.push("Demande de code, mot de passe ou coordonnees bancaires : aucune banque ne demande ca par message");
  }

  const identityDoc = containsAny(text, IDENTITY_DOCUMENT_WORDS);
  if (identityDoc.length > 0) {
    score += 20;
    raisons.push("Demande d'une copie de piece d'identite : signal frequent d'usurpation");
  }

  const beneficiaryChange = containsAny(text, BENEFICIARY_CHANGE_WORDS);
  if (beneficiaryChange.length > 0) {
    score += 20;
    raisons.push("Changement de compte/beneficiaire annonce par message : a verifier par un autre canal");
  }

  const impersonation = containsAny(text, IMPERSONATION_WORDS);
  if (impersonation.length > 0) {
    score += 25;
    raisons.push("Le message pretend venir d'un proche avec un nouveau numero inconnu");
  }

  const secrecy = containsAny(text, SECRECY_WORDS);
  if (secrecy.length > 0) {
    score += 20;
    raisons.push("Le message demande de garder la demande secrete : signal classique de manipulation");
  }

  const fakeOfficer = containsAny(text, FAKE_OFFICER_WORDS);
  if (fakeOfficer.length > 0) {
    score += 30;
    raisons.push("Signature du \"faux policier\" : un agent demande de remettre de l'argent/bijoux en main propre — la police ne fait jamais ca");
  }

  // Citer une marque connue (banque, bpost, operateur...) est neutre en soi —
  // un vrai message DE cette marque la cite aussi. Ne compte que combine a un
  // autre signal deja suspect (voir combinaisons plus bas).
  const authority = containsAny(text, AUTHORITY_IMPERSONATION_WORDS);

  const suspiciousLink = Boolean(input.link) && isSuspiciousLink(input.link!);
  if (suspiciousLink) {
    score += 25;
    raisons.push("Le lien partage utilise un domaine ou format suspect (raccourcisseur, mots-cles de verification, extension inhabituelle)");
  }

  if (urgency.length > 0 && credentials.length > 0) {
    score += 20;
    raisons.push("Combinaison urgence + demande de code/coordonnees : signature classique de phishing");
  }

  if (urgency.length > 0 && money.length > 0) {
    score += 15;
    raisons.push("Combinaison urgence + demande d'argent : signature classique d'arnaque");
  }

  if (authority.length > 0 && suspiciousLink) {
    score += 30;
    raisons.push("Message pretendant venir d'une marque/administration connue avec un lien non officiel");
  }

  if (authority.length > 0 && credentials.length > 0) {
    score += 10;
    raisons.push("Message pretendant venir d'une marque/administration connue qui demande un code ou des coordonnees bancaires");
  }

  if (beneficiaryChange.length > 0 && transferMention.length > 0) {
    score += 20;
    raisons.push("Changement de compte annonce avec mention d'un virement/IBAN : signature classique de fraude au faux fournisseur");
  }

  if (input.sender && /^\+?\d[\d\s]{6,}$/.test(input.sender) && impersonation.length > 0) {
    raisons.push("Le numero d'expediteur ne correspond a aucun contact connu");
    score += 10;
  }

  return { heuristicScore: Math.min(100, score), raisons };
}
