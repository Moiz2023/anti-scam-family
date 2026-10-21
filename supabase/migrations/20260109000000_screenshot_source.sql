-- Autorise la source 'screenshot' (analyse de capture d'ecran via la vision
-- de Claude), en plus de 'manual', 'share', 'phone'.
alter table public.analysis_events drop constraint analysis_events_source_check;
alter table public.analysis_events add constraint analysis_events_source_check
  check (source in ('manual', 'share', 'phone', 'screenshot'));
