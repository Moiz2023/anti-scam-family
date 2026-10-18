-- Boucle de feedback : au lieu de corriger les erreurs de classification
-- une par une sur signalement manuel en conversation, les utilisateurs
-- peuvent signaler directement dans l'app qu'un resultat leur semble trop
-- severe (faux positif) ou pas assez (faux negatif). Permet une revue
-- systematique et l'amelioration continue du prompt/heuristiques, comme
-- prevu par le brief (section 10 : mesurer faux positifs/negatifs en continu).

create table public.analysis_feedback (
  id uuid primary key default gen_random_uuid(),
  analysis_event_id uuid not null references public.analysis_events (id) on delete cascade,
  reported_by uuid not null references auth.users (id) on delete cascade,
  feedback_type text not null check (feedback_type in ('too_strict', 'too_lenient')),
  comment text,
  created_at timestamptz not null default now()
);

alter table public.analysis_feedback enable row level security;

-- On ne peut signaler que sur un evenement qu'on peut deja voir (le sien,
-- ou celui d'une personne qu'on protege).
create policy "analysis_feedback_insert_own"
  on public.analysis_feedback for insert
  with check (
    reported_by = auth.uid()
    and exists (
      select 1 from public.analysis_events ae
      where ae.id = analysis_event_id
        and (
          ae.protected_id = auth.uid()
          or exists (
            select 1 from public.family_links fl
            where fl.status = 'active'
              and fl.protector_id = auth.uid()
              and fl.protected_id = ae.protected_id
          )
        )
    )
  );

create policy "analysis_feedback_select_own"
  on public.analysis_feedback for select
  using (reported_by = auth.uid());
