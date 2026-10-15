# Anti-Scam Family

> Le garde-fou financier de la famille. Voir [anti-scam-family-brief.md](./anti-scam-family-brief.md)
> pour le contexte produit complet.

Avertissement produit (a respecter partout, code + UI) : **nous detectons et signalons des
signaux de risque de fraude, nous ne garantissons jamais qu'un message est "SAFE"**.

## Structure du repo

```
mobile/              App Expo (React Native + TypeScript)
supabase/
  migrations/        Schema Postgres (profiles, family_links, analysis_events, family_checks, push_tokens, invite_codes)
  functions/
    analyze/              POST /analyze — moteur de detection (heuristiques + Claude)
    family-check/          POST /family-check — cree les FAMILY CHECK + push aux proches
    register-push-token/   POST /register-push-token — enregistre un token Expo push
    _shared/               code partage (cors, heuristiques, client Claude, expo push)
test-data/messages.json    30 messages belges (arnaques FR/NL + messages legitimes), labellises
scripts/eval.mjs           script d'evaluation : appelle /analyze sur les 30 messages et mesure
                           le taux de detection et le taux de faux positifs
```

## Prerequis

- Node.js 20+
- Docker Desktop (pour faire tourner Supabase en local)
- Un telephone ou simulateur avec l'app **Expo Go**, ou Android Studio / Xcode
- Une cle API Anthropic (optionnelle au depart, voir plus bas)

## 1. Configurer les variables d'environnement

```bash
cp .env.example .env
cp .env.example mobile/.env
```

Remplis les deux fichiers (memes valeurs). `.env` a la racine est utilise par les scripts
CLI (`scripts/eval.mjs`, `supabase functions serve`) ; `mobile/.env` est necessaire car Expo
CLI charge les `EXPO_PUBLIC_*` depuis le dossier du projet mobile, pas depuis la racine du
repo. En local, lance d'abord Supabase (etape 2) : les valeurs `SUPABASE_URL` /
`EXPO_PUBLIC_SUPABASE_URL`, `SUPABASE_ANON_KEY` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` et
`SUPABASE_SERVICE_ROLE_KEY` sont affichees dans le terminal par `supabase start`
(ne jamais mettre la `service_role` key dans une variable `EXPO_PUBLIC_*`, elle serait
visible cote client).

## 2. Lancer Supabase en local

```bash
npx supabase start
```

Applique le schema SQL automatiquement (dossier `supabase/migrations`). Pour re-appliquer
apres une modification :

```bash
npx supabase db reset
```

Pour servir les Edge Functions en local (avec rechargement a chaud) :

```bash
npx supabase functions serve --env-file .env
```

`supabase start` necessite Docker Desktop demarre (le moteur Postgres/Auth/Storage tourne
dans des conteneurs). Sans Docker disponible, voir la section 4bis ci-dessous pour tester le
moteur de detection sans dependance a Supabase.

## 3. Cle Claude (Anthropic) — moteur d'analyse

La fonction `/analyze` fonctionne **sans** cle API : elle retombe alors sur les
heuristiques seules (regles de mots-cles, domaines suspects...). Pour activer la
classification + explications par Claude, ajoute `ANTHROPIC_API_KEY` dans `.env` (utilise
automatiquement par `supabase functions serve --env-file .env` en local).

En production (apres `supabase link`) :

```bash
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

## 4. Tester le moteur de detection (jeu de 30 messages)

Avec Supabase lance (etape 2) et les fonctions servies (etape 2, commande `functions serve`) :

```bash
node scripts/eval.mjs
```

Le script affiche, pour chacun des 30 messages de `test-data/messages.json`, le score/niveau
obtenu vs attendu, puis un recapitulatif : taux de detection sur les messages a risque et
taux de faux positifs sur les messages legitimes. Objectif (section 10 du brief) : mesurer
ces deux taux des le depart, avant d'investir dans l'UI ou de scaler.

### 4bis. Tester le moteur sans Docker/Supabase

`scripts/eval-local.mjs` importe directement le code du moteur
(`supabase/functions/_shared/heuristics.ts` + `claude.ts`, sans modification) et simule
l'environnement Deno, donc ne necessite ni Docker ni `supabase start` :

```bash
node scripts/eval-local.mjs
```

Resultats obtenus lors du dev de ce repo (heuristiques seules, sans cle Anthropic) :
**taux de detection 94,1 % (16/17 messages a risque), faux positifs 0 % (0/13 messages
legitimes)**. Avec une cle `ANTHROPIC_API_KEY` dans `.env`, le script utilise Claude en plus
des heuristiques (meme chemin de code que la fonction `/analyze` deployee).

## 5. Lancer l'app mobile

```bash
cd mobile
npm install
npm run start
```

Scanne le QR code avec Expo Go (Android) ou l'app Camera (iOS). L'app lit
`EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` depuis `mobile/.env` (voir
etape 1 — ne pas oublier de le creer, c'est different du `.env` racine).

Previsualisation rapide dans un navigateur (sans telephone, utile pour verifier l'UI) :

```bash
cd mobile
npx expo start --web
```

Flux a tester :
1. Creer un compte (Register) — deux ecrans Login/Register, Supabase Auth email+mdp.
2. Ecran d'accueil : 3 boutons CHECK / CALL FAMILY / HELP.
3. CHECK : coller un message suspect (voir `test-data/messages.json` pour des exemples) →
   ecran Resultat avec score, niveau et raisons.
4. Sur un resultat a risque (ATTENTION/DANGER) : bouton "Verifier avec ma famille" — necessite
   d'avoir lie un proche au prealable (ecran "Ma famille" → generer un code d'invitation sur
   un 2e compte, le rediger sur le 1er compte).
5. Sur le compte du proche (protecteur) : l'ecran "Ma famille" affiche l'alerte en attente
   avec boutons OUI (legitime) / NON (bloquer).

Notifications push : necessitent un appareil physique (Expo Go ne fonctionne pas en
simulateur iOS pour les push). Sans appareil physique, le flux "Verifier avec ma famille"
fonctionne quand meme (le `family_checks` est bien cree et visible dans l'app du proche au
prochain rafraichissement), seule la notification push ne sera pas recue.

## Contraintes produit a respecter dans tout le code (voir brief section 4)

- Ne jamais afficher "SAFE" ou garantir une transaction sans danger.
- Toujours formuler "nous detectons des signaux de risque", jamais une certitude absolue.
- Pas d'acces aux comptes bancaires, pas d'IBAN stocke, pas de localisation.
- RGPD : minimisation des donnees (voir policies RLS dans les migrations), un proche ne voit
  que les evenements classes `attention`/`danger`, jamais un evenement `faible` ni le contenu
  brut d'un message sans risque.

## Prochaines etapes (voir brief section 6 "Roadmap")

- Integration appels (V2), WhatsApp avance (V3)
- Bouton physique (V4)
- Cadrage RGPD / CGU avec un juriste avant tout lancement public
- Pilote 100 familles belges (brief section 10) pour valider taux de detection / faux
  positifs / conversion payante avant de scaler
