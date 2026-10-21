// Detection d'injection de prompt independante de Claude (defense en
// profondeur) : meme si l'appel LLM echoue, est indisponible, ou se fait
// manipuler malgre les instructions systeme, cette detection cote serveur
// force quand meme un score de risque eleve. Ne doit jamais dependre
// uniquement du bon comportement du modele.

const INJECTION_PATTERNS = [
  /ignor[ez]?\s+(tes|ces|vos|les|previous|all)\s+(instructions?|regles?)/i,
  /oubli[ez]?\s+(tes|ces|vos)\s+(instructions?|regles?)/i,
  /disregard\s+(the\s+)?(above|previous)\s+instructions?/i,
  /repond[sz]?\s+(que\s+)?(c'est\s+)?(safe|s[uû]r|legitime|sans\s+danger|aucun\s+risque)/i,
  /tu\s+es\s+maintenant\s+/i,
  /nouvelles?\s+instructions?\s*[:.]?/i,
  /system\s*prompt/i,
  /\bact\s+as\b/i,
  /ignore\s+previous/i,
];

export function detectPromptInjection(text: string): boolean {
  return INJECTION_PATTERNS.some((p) => p.test(text));
}
