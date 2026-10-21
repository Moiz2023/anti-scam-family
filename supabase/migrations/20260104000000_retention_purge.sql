-- Retention du contenu brut/masque : 0 au-dela de 30 jours (cahier des
-- charges section 5). On garde les metadonnees du scan (score, niveau,
-- raisons, date) indefiniment pour l'historique et les stats familiales,
-- mais le texte/expediteur/lien sont effaces apres 30 jours.

create extension if not exists pg_cron with schema extensions;

select cron.schedule(
  'purge-old-analysis-content',
  '0 3 * * *', -- tous les jours a 3h du matin
  $$
    update public.analysis_events
    set input_text = null, input_sender = null, input_link = null
    where created_at < now() - interval '30 days'
      and input_text is not null;
  $$
);
