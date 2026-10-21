-- Consentement explicite du protege avant tout partage avec un proche
-- (cahier des charges section 5 : "Consentement explicite du protege avant
-- tout partage avec un gardien, avec ecran de transparence"). Sans ce
-- consentement enregistre, un proche ne peut voir aucune alerte, meme s'il
-- est deja lie via family_links.

alter table public.profiles add column consent_sharing_at timestamptz;

drop policy "analysis_events_family_select" on public.analysis_events;

create policy "analysis_events_family_select"
  on public.analysis_events for select
  using (
    niveau in ('attention', 'danger')
    and exists (
      select 1
      from public.family_links fl
      join public.profiles p on p.id = analysis_events.protected_id
      where fl.status = 'active'
        and fl.protector_id = auth.uid()
        and fl.protected_id = analysis_events.protected_id
        and p.consent_sharing_at is not null
    )
  );
