# Anti-Scam Family — Brief projet

> Le garde-fou financier de la famille.
> Une personne reçoit une demande d'argent suspecte : le système intervient AVANT qu'elle paie, pas après.

Propriétaire : Moiz (SBZ INFINITE BV, Bruxelles). Marché de départ : Belgique, puis Europe.

---

## 1. Problème

- Les fraudes évoluent : l'escroc veut que la victime fasse elle-même l'action (virement, validation itsme, partage de code, cartes-cadeaux, installation d'appli, crypto).
- L'IA aggrave le phénomène : voix clonée, messages personnalisés, imitation d'un proche.
- Safeonweb/BAPS = système de **signalement** (après coup). Notre produit = **prévention en temps réel** au moment de la réception de la demande.

## 2. Concept produit

Une couche de sécurité familiale entre une personne et une décision financière risquée. Trois composantes :

A. **App de la personne protégée** : ultra simple, 3 boutons seulement : CHECK / CALL FAMILY / HELP.
B. **App des proches** : un proche peut protéger plusieurs personnes (maman, papa, grand-mère...). Il voit UNIQUEMENT les événements de risque (« Risque de fraude détecté »), jamais conversations, comptes bancaires ni localisation.
C. **Bouton physique** (phase tardive) : bouton « CHECK » sans écran, pour les personnes âgées.

### Flux type (cas fils/maman)
1. Maman reçoit « Maman c'est moi, nouveau numéro, envoie-moi 2 800 € ».
2. Elle partage le message à l'app (ou appuie sur CHECK).
3. Le système analyse et renvoie un score + les raisons.
4. Alerte famille envoyée au fils : « Demande urgente de 2 800 € reçue par ta mère depuis un nouveau numéro, elle prétend venir de toi. C'est bien toi ? » → NON → fraude stoppée.

### Règle familiale (V2+)
« Aucun paiement inhabituel sans deuxième validation familiale » (FAMILY CHECK) : validation par un proche, pas une validation bancaire.

## 3. Moteur d'analyse

Entrées (MVP) : texte du message, lien/domaine, numéro d'expéditeur, contexte familial disponible.
Entrées (plus tard) : appels, QR code (vérif. domaine), IBAN (pays, nom, réputation, anomalies), WhatsApp avancé.

Signaux : numéro jamais vu, urgence, demande d'argent, nouveau bénéficiaire, montant inhabituel, identité prétendue vs numéro, domaine/lien suspect, caractéristiques linguistiques, rupture de comportement (ex. 3–5 SMS bancaires/mois puis soudain « carte compromise, appelez ce numéro »).

### Score, pas un oui/non
- 0–30 : Risque faible
- 31–70 : Attention
- 71–100 : Danger (« Ne payez pas avant vérification familiale »)

### Explication obligatoire (POURQUOI)
Toujours lister les raisons, par ex. : 1) numéro jamais utilisé par cette personne, 2) demande d'argent avec urgence, 3) bénéficiaire nouveau. Objectif : la personne apprend à reconnaître les arnaques.

### Faux positifs
Un SMS légitime de la banque ne doit pas déclencher « FRAUDE ». Mesurer et optimiser le taux de faux positifs dès le début.

### « Cerveau familial » (après ~6 mois d'usage)
Mémoire des contacts habituels, appareils, bénéficiaires, types de paiements, personnes de confiance. Usage : détecter les ruptures de comportement, pas espionner.

## 4. Positionnement juridique (IMPORTANT, à respecter dans le code et l'UI)

- NE JAMAIS afficher « SAFE » ni garantir qu'une transaction est sûre. Préférer « Aucun signal de risque détecté ».
- Formulation produit : « Nous détectons et signalons des signaux de risque. »
- Pas d'accès aux comptes bancaires au départ (évite PSD2, agréments, responsabilité fintech). On reste une « security layer » au-dessus du téléphone.
- En risque élevé : bloquer/avertir dans l'app, sans jamais présenter le score comme garantie financière.
- RGPD : minimisation des données, consentement explicite de la personne protégée, visibilité limitée des proches, durée de conservation courte, hébergement UE. À cadrer avec un juriste avant le lancement public.

## 5. MVP (V1)

Pas de hardware, pas de banque, pas d'intégration complexe.

- App mobile avec **Partager → Anti-Scam** depuis Messages, WhatsApp, Mail, navigateur.
- Analyse texte + lien + numéro + contexte.
- Résultat : SAFE-équivalent (« aucun signal »), SUSPICIOUS, DANGER, avec raisons.
- Bouton « Vérifier avec ma famille » : un proche reçoit immédiatement l'alerte (push) et répond OUI/NON.
- Contraintes plateforme : iOS limite fortement l'accès aux SMS et aux appels, donc le partage manuel est le chemin réaliste pour V1.

### Stack proposée (à confirmer par Moiz)
- Mobile : React Native / Expo
- Backend : Node.js + TypeScript, Postgres, push notifications
- Analyse : règles + heuristiques (domaine, numéro, urgence) + LLM pour classification et explications, sortie JSON structurée {score, niveau, raisons[]}
- Sources de données : listes d'URL/domaines signalés (ex. Safeonweb/BAPS, à vérifier : conditions d'accès et d'usage), réputation de domaine, base de motifs d'arnaques locales.

## 6. Roadmap

- V1 : app + partage + score expliqué + alerte famille
- V2 : appels
- V3 : WhatsApp avancé
- V4 : bouton physique (bouton ~39–59 €, hub ~79–99 €)
- V5 : protection des transactions
- V6 : B2B2C (banques, assurances, mutuelles, opérateurs télécom, maisons de retraite, communes, employeurs)

## 7. Modèle économique

- FREE : 1 personne, analyse limitée
- FAMILY : 7,99 €/mois : 3 personnes protégées, analyse SMS/liens, alertes, historique, bouton CHECK
- FAMILY PRO : 14,99 €/mois : 6 personnes, appels, analyse avancée, surveillance 24/7, assistance après incident
- Le payeur cible est l'enfant adulte (~40 ans) qui protège ses parents. Message : « Je protège mes parents contre les arnaques. »
- Ne pas démarrer uniquement par les seniors : « Family Protection » (parent→enfant ET enfant→parent).

## 8. Localisation

Moteur de détection européen, données de contexte locales :
- Belgique : itsme, bpost, banques belges, SPF, Proximus, Telenet, Card Stop
- France : Ameli, La Poste, CAF, impôts, banques françaises
- Puis NL, DE, LU, ES, IT, PT

## 9. Chiffres de contexte (à re-vérifier avant tout usage externe)

- Safeonweb : près de 10 millions de messages suspects signalés en 2025 ; BAPS : 200 millions de redirections vers des avertissements.
- Febelfin 2024 : ~49 M€ volés par phishing en Belgique ; ~75 % des virements frauduleux liés au phishing détectés/bloqués/récupérés par les banques ; 23 % des jeunes interrogés pourraient partager des codes bancaires si la demande semble crédible.
- Europe : 4,2 Md€ de pertes de fraude aux paiements en 2024, hausse marquée des fraudes où la victime autorise elle-même la transaction (manipulation du payeur).

## 10. Validation avant de scaler

Pilote : 100 familles belges, 1 000–5 000 messages analysés, vrais cas d'arnaque. Mesurer :
1. Taux de détection
2. Taux de faux positifs
3. Familles qui paient 7,99 €
4. Familles qui ajoutent leurs parents
5. Utilisation réelle du bouton CHECK
6. Signal de comportement : « Je ne fais plus de paiement inhabituel sans passer par Anti-Scam. »

## 11. Décisions ouvertes

- Nom définitif du produit et du domaine
- Stack finale et hébergement UE
- Accès aux données Safeonweb/BAPS et autres listes de réputation
- Stratégie de collecte de données de test (consentement, anonymisation)
- Cadrage RGPD et conditions d'utilisation (clause de non-garantie)

---

## Première tâche suggérée pour Claude Code

Initialiser le repo (mobile + backend), définir le schéma JSON de la réponse d'analyse {score, niveau, raisons[]}, implémenter un endpoint `/analyze` (règles + appel LLM) avec un jeu de 30 messages de test (arnaques belges + messages légitimes) pour mesurer faux positifs et faux négatifs dès le départ.
