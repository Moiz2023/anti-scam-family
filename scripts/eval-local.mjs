#!/usr/bin/env node
// Variante de scripts/eval.mjs qui n'a besoin ni de Docker ni de Supabase
// demarre : elle importe directement le code du moteur de detection
// (supabase/functions/_shared/heuristics.ts + claude.ts, inchange) et simule
// l'appel Deno.env via un shim minimal. Utile pour iterer vite sur les
// heuristiques/prompt, ou quand Docker n'est pas disponible dans l'environnement.
//
// Usage : node scripts/eval-local.mjs

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

function loadDotEnv(file) {
  if (!existsSync(file)) return;
  const content = readFileSync(file, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadDotEnv(path.join(rootDir, ".env"));

// Shim minimal de l'API Deno utilisee par supabase/functions/_shared/claude.ts
globalThis.Deno = { env: { get: (key) => process.env[key] } };

const { computeHeuristics } = await import(
  "../supabase/functions/_shared/heuristics.ts"
);
const { classifyWithClaude } = await import(
  "../supabase/functions/_shared/claude.ts"
);

function niveauFromScore(score) {
  if (score >= 71) return "danger";
  if (score >= 31) return "attention";
  return "faible";
}

const messages = JSON.parse(
  readFileSync(path.join(rootDir, "test-data", "messages.json"), "utf-8"),
);

const NIVEAU_RANK = { faible: 0, attention: 1, danger: 2 };

async function analyzeOne(msg) {
  const heuristics = computeHeuristics(msg);
  const claudeResult = await classifyWithClaude(msg, heuristics.raisons);

  if (claudeResult) {
    return { score: claudeResult.score, niveau: claudeResult.niveau, raisons: claudeResult.raisons, viaClaude: true };
  }

  const score = heuristics.heuristicScore;
  return {
    score,
    niveau: niveauFromScore(score),
    raisons: heuristics.raisons.length > 0 ? heuristics.raisons : ["Aucun signal de risque detecte"],
    viaClaude: false,
  };
}

async function main() {
  const usingClaude = Boolean(process.env.ANTHROPIC_API_KEY);
  console.log(
    usingClaude
      ? "Mode: heuristiques + Claude API\n"
      : "Mode: heuristiques seules (ANTHROPIC_API_KEY non defini)\n",
  );

  const results = [];
  for (const msg of messages) {
    const result = await analyzeOne(msg);
    results.push({ msg, result });
  }

  let exactMatches = 0;
  let detected = 0;
  let expectedRisky = 0;
  let falsePositives = 0;
  let expectedSafe = 0;

  console.log("id".padEnd(14) + "attendu".padEnd(10) + "obtenu".padEnd(10) + "score".padEnd(7) + "ok?");
  console.log("-".repeat(55));

  for (const { msg, result } of results) {
    const expected = msg.expectedNiveau;
    const actual = result.niveau;
    const match = expected === actual;
    if (match) exactMatches++;

    if (expected !== "faible") {
      expectedRisky++;
      if (NIVEAU_RANK[actual] >= NIVEAU_RANK["attention"]) detected++;
    } else {
      expectedSafe++;
      if (NIVEAU_RANK[actual] >= NIVEAU_RANK["attention"]) falsePositives++;
    }

    console.log(
      `${msg.id.padEnd(14)}${expected.padEnd(10)}${actual.padEnd(10)}${String(result.score).padEnd(7)}${match ? "OK" : "<>"}`,
    );
  }

  console.log("-".repeat(55));
  console.log(`Total messages           : ${messages.length}`);
  console.log(`Correspondance exacte     : ${exactMatches}/${messages.length}`);
  console.log(
    `Taux de detection (risque): ${detected}/${expectedRisky} (${((detected / expectedRisky) * 100).toFixed(1)}%)`,
  );
  console.log(
    `Faux positifs (legit)     : ${falsePositives}/${expectedSafe} (${((falsePositives / expectedSafe) * 100).toFixed(1)}%)`,
  );
}

main();
