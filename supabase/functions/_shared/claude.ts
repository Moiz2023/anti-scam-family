import type { AnalyzeInput } from "./heuristics.ts";

export interface ClassificationResult {
  score: number;
  niveau: "faible" | "attention" | "danger";
  raisons: string[];
}

const SYSTEM_PROMPT = `Tu es le moteur de detection de risque de fraude de "Anti-Scam Family",
une app belge qui protege des personnes (souvent des parents ages) contre les arnaques
avant qu'elles paient. Tu analyses UN message (SMS/WhatsApp/email) que la personne a
recu et partage pour verification.

Regles strictes :
1. Ne dis JAMAIS qu'un message est "SAFE" ou garanti sans danger. Si tu ne vois aucun
   signal de risque, dis "Aucun signal de risque detecte" (jamais une garantie absolue).
2. Formule toujours ta reponse comme "nous detectons des signaux de risque", jamais
   comme une certitude absolue de fraude ou de securite.
3. Donne un score de 0 a 100 et un niveau :
   - faible (0-30) : rien d'anormal
   - attention (31-70) : des signaux existent, prudence conseillee
   - danger (71-100) : plusieurs signaux forts, ne pas payer avant verification familiale
4. Donne toujours au moins une raison claire et pedagogique, ecrite pour que la personne
   apprenne a reconnaitre une arnaque similaire la prochaine fois (ex: "ce numero n'a
   jamais ete utilise par cette personne avant", "demande d'argent avec urgence",
   "nouveau beneficiaire inhabituel").
5. Attention aux faux positifs : un SMS legitime de banque (notification normale, pas de
   demande d'action) ou un message familial ordinaire ne doit pas etre classe "danger".
6. Base-toi sur le texte fourni et les signaux heuristiques deja detectes, mais tu peux
   ajuster le score si le contexte linguistique le justifie (ex: ironie, citation,
   message visiblement legitime malgre un mot-cle isole).`;

const TOOL_SCHEMA = {
  name: "submit_analysis",
  description: "Soumet le resultat d'analyse de risque de fraude pour ce message.",
  input_schema: {
    type: "object",
    properties: {
      score: {
        type: "integer",
        minimum: 0,
        maximum: 100,
        description: "Score de risque de 0 (aucun signal) a 100 (danger maximal)",
      },
      niveau: {
        type: "string",
        enum: ["faible", "attention", "danger"],
      },
      raisons: {
        type: "array",
        items: { type: "string" },
        minItems: 1,
        description: "Raisons claires et pedagogiques justifiant le score",
      },
    },
    required: ["score", "niveau", "raisons"],
  },
};

export async function classifyWithClaude(
  input: AnalyzeInput,
  heuristicSignals: string[],
): Promise<ClassificationResult | null> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return null;
  }

  const model = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-haiku-4-5-20251001";

  const userContent = [
    `Message recu : """${input.text}"""`,
    input.sender ? `Expediteur : ${input.sender}` : null,
    input.link ? `Lien partage : ${input.link}` : null,
    heuristicSignals.length > 0
      ? `Signaux heuristiques deja detectes automatiquement : ${heuristicSignals.join("; ")}`
      : "Aucun signal heuristique automatique detecte.",
  ].filter(Boolean).join("\n");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
      tools: [TOOL_SCHEMA],
      tool_choice: { type: "tool", name: "submit_analysis" },
    }),
  });

  if (!res.ok) {
    console.error("Claude API error", res.status, await res.text());
    return null;
  }

  const data = await res.json();
  const toolUse = (data.content ?? []).find(
    (block: { type: string }) => block.type === "tool_use",
  );

  if (!toolUse) {
    return null;
  }

  const result = toolUse.input as ClassificationResult;
  if (
    typeof result.score !== "number" ||
    !["faible", "attention", "danger"].includes(result.niveau) ||
    !Array.isArray(result.raisons)
  ) {
    return null;
  }

  return result;
}
