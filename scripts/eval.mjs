#!/usr/bin/env node
// Jeu de test : appelle /analyze pour chaque message et mesure
// taux de detection / faux positifs. Usage :
//   node scripts/eval.mjs
// Variables d'env requises (ou dans ../.env) : SUPABASE_URL, SUPABASE_ANON_KEY

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

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    "Erreur: SUPABASE_URL et SUPABASE_ANON_KEY doivent etre definis (dans .env a la racine ou en variables d'env).\n" +
    "Pour du dev local avec `supabase start`, ce sont les valeurs affichees par la commande.",
  );
  process.exit(1);
}

const ENDPOINT = `${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/analyze`;

const messages = JSON.parse(
  readFileSync(path.join(rootDir, "test-data", "messages.json"), "utf-8"),
);

const NIVEAU_RANK = { faible: 0, attention: 1, danger: 2 };

async function analyzeOne(msg) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ text: msg.text, sender: msg.sender, link: msg.link }),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

async function main() {
  const results = [];

  for (const msg of messages) {
    try {
      const result = await analyzeOne(msg);
      results.push({ msg, result });
    } catch (err) {
      results.push({ msg, error: String(err) });
    }
  }

  let exactMatches = 0;
  let detected = 0;
  let expectedRisky = 0;
  let falsePositives = 0;
  let expectedSafe = 0;
  let errors = 0;

  console.log(
    "\nid".padEnd(14) + "attendu".padEnd(10) + "obtenu".padEnd(10) + "score".padEnd(7) + "ok?",
  );
  console.log("-".repeat(55));

  for (const { msg, result, error } of results) {
    if (error) {
      errors++;
      console.log(`${msg.id.padEnd(14)} ERREUR: ${error}`);
      continue;
    }

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
  console.log(`Erreurs d'appel           : ${errors}`);
  console.log(`Correspondance exacte     : ${exactMatches}/${messages.length - errors}`);
  console.log(
    `Taux de detection (risque): ${detected}/${expectedRisky} (${expectedRisky ? ((detected / expectedRisky) * 100).toFixed(1) : "n/a"}%)`,
  );
  console.log(
    `Faux positifs (legit)     : ${falsePositives}/${expectedSafe} (${expectedSafe ? ((falsePositives / expectedSafe) * 100).toFixed(1) : "n/a"}%)`,
  );
}

main();
