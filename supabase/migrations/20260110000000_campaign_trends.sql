-- "Nouvelle campagne" : detecte les vagues d'arnaques en cours en agregeant
-- les analyses de TOUS les utilisateurs par categorie, sur une fenetre
-- recente. Ne renvoie jamais de contenu individuel (texte, expediteur,
-- identite) : uniquement des compteurs par categorie, jamais assez precis
-- pour reidentifier qui que ce soit (compte de personnes distinctes
-- touchees, pas d'evenements bruts).

create index if not exists analysis_events_trend_idx
  on public.analysis_events (created_at, niveau, scam_type)
  where niveau in ('attention', 'danger');

create or replace function public.get_campaign_trends(
  hours_window int default 48,
  min_affected int default 3
)
returns table (
  scam_type text,
  niveau text,
  affected_count bigint,
  first_seen timestamptz,
  last_seen timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    scam_type,
    niveau,
    count(distinct protected_id) as affected_count,
    min(created_at) as first_seen,
    max(created_at) as last_seen
  from analysis_events
  where created_at > now() - (greatest(hours_window, 1) || ' hours')::interval
    and niveau in ('attention', 'danger')
    and scam_type is not null
    and scam_type not in ('legitimate', 'unknown')
  group by scam_type, niveau
  having count(distinct protected_id) >= greatest(min_affected, 1)
  order by affected_count desc, last_seen desc
  limit 10;
$$;

-- Lisible par tout utilisateur authentifie : le resultat est purement
-- agrege (pas de RLS pertinente a appliquer, la fonction ne retourne jamais
-- de ligne individuelle).
grant execute on function public.get_campaign_trends(int, int) to authenticated;
