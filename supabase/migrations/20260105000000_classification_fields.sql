-- Champs supplementaires de la sortie de classification, alignes sur le
-- schema du prompt (PROMPT_CLASSIFICATION.md) : confiance, categorie
-- d'arnaque, question de clarification si confiance basse.

alter table public.analysis_events
  add column confidence numeric(3, 2) check (confidence between 0 and 1),
  add column scam_type text,
  add column needs_more_info text;
