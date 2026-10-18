-- Autorise la source 'phone' pour les verifications de numero de telephone
-- (fonctionnalite "Verifier un numero"), en plus de 'manual' et 'share'.
alter table public.analysis_events drop constraint analysis_events_source_check;
alter table public.analysis_events add constraint analysis_events_source_check
  check (source in ('manual', 'share', 'phone'));
