-- Droit a l'effacement (cahier des charges US8 : "supprimer mes donnees" ->
-- suppression compte + scans). La suppression de auth.users cascade deja
-- vers toutes les tables (profiles, family_links, analysis_events,
-- family_checks, push_tokens, analysis_feedback) sauf une, corrigee ici :
-- invite_codes.used_by n'avait pas d'action "on delete", ce qui aurait
-- empeche de supprimer le compte d'un proche ayant deja utilise un code
-- (erreur de contrainte de cle etrangere).

alter table public.invite_codes drop constraint invite_codes_used_by_fkey;

alter table public.invite_codes
  add constraint invite_codes_used_by_fkey
  foreign key (used_by) references auth.users (id) on delete set null;
