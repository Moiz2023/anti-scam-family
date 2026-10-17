-- Anti-Scam Family — schema initial (MVP V1)
-- Principe RGPD : minimisation des donnees. On ne stocke jamais de compte
-- bancaire, de localisation ni de contenu de conversation au-dela de ce qui
-- est necessaire pour expliquer un score de risque.

create extension if not exists "pgcrypto";

-- Profil public lie a auth.users (1:1)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  locale text not null default 'fr-BE',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles_upsert_own"
  on public.profiles for insert
  with check (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid());

-- Codes d'invitation : la personne protegee genere un code court, le proche
-- l'utilise pour creer le lien. Evite d'exposer des UUIDs ou emails.
create table public.invite_codes (
  code text primary key,
  protected_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_by uuid references auth.users (id),
  used_at timestamptz
);

alter table public.invite_codes enable row level security;

create policy "invite_codes_owner_all"
  on public.invite_codes for all
  using (protected_id = auth.uid())
  with check (protected_id = auth.uid());

-- Lien famille : protecteur <-> protege. Plusieurs proches peuvent proteger
-- la meme personne ; un proche peut proteger plusieurs personnes.
create table public.family_links (
  id uuid primary key default gen_random_uuid(),
  protector_id uuid not null references auth.users (id) on delete cascade,
  protected_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'revoked')),
  created_at timestamptz not null default now(),
  unique (protector_id, protected_id)
);

alter table public.family_links enable row level security;

create policy "family_links_select_participant"
  on public.family_links for select
  using (protector_id = auth.uid() or protected_id = auth.uid());

create policy "family_links_update_participant"
  on public.family_links for update
  using (protector_id = auth.uid() or protected_id = auth.uid());

-- Un proche (protecteur) peut voir le profil des personnes qu'il protege, et
-- inversement. Definie ici (apres family_links) car elle en depend.
create policy "profiles_select_linked"
  on public.profiles for select
  using (
    exists (
      select 1 from public.family_links fl
      where fl.status = 'active'
        and (
          (fl.protector_id = auth.uid() and fl.protected_id = profiles.id)
          or (fl.protected_id = auth.uid() and fl.protector_id = profiles.id)
        )
    )
  );

-- Fonction securisee pour accepter un code d'invitation (le proche l'appelle).
-- Evite de donner un droit d'insertion libre sur family_links.
create or replace function public.redeem_invite_code(p_code text)
returns public.family_links
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.invite_codes;
  v_link public.family_links;
begin
  select * into v_invite from public.invite_codes
    where code = p_code and used_by is null and expires_at > now()
    for update;

  if not found then
    raise exception 'invite_code_invalid_or_expired';
  end if;

  if v_invite.protected_id = auth.uid() then
    raise exception 'cannot_link_to_self';
  end if;

  insert into public.family_links (protector_id, protected_id)
    values (auth.uid(), v_invite.protected_id)
    on conflict (protector_id, protected_id) do update set status = 'active'
    returning * into v_link;

  update public.invite_codes
    set used_by = auth.uid(), used_at = now()
    where code = p_code;

  return v_link;
end;
$$;

-- Evenements d'analyse : resultat du moteur /analyze pour un message partage.
create table public.analysis_events (
  id uuid primary key default gen_random_uuid(),
  protected_id uuid not null references auth.users (id) on delete cascade,
  input_text text,
  input_sender text,
  input_link text,
  score int not null check (score between 0 and 100),
  niveau text not null check (niveau in ('faible', 'attention', 'danger')),
  raisons jsonb not null default '[]'::jsonb,
  source text not null default 'manual' check (source in ('manual', 'share')),
  created_at timestamptz not null default now()
);

alter table public.analysis_events enable row level security;

create policy "analysis_events_owner_all"
  on public.analysis_events for all
  using (protected_id = auth.uid())
  with check (protected_id = auth.uid());

create policy "analysis_events_family_select"
  -- un proche ne voit QUE les evenements de risque (attention/danger), jamais
  -- le detail brut du message si le score est faible
  on public.analysis_events for select
  using (
    niveau in ('attention', 'danger')
    and exists (
      select 1 from public.family_links fl
      where fl.status = 'active'
        and fl.protector_id = auth.uid()
        and fl.protected_id = analysis_events.protected_id
    )
  );

-- Verification familiale (FAMILY CHECK) : un proche repond OUI/NON a une
-- alerte de risque.
create table public.family_checks (
  id uuid primary key default gen_random_uuid(),
  analysis_event_id uuid not null references public.analysis_events (id) on delete cascade,
  protector_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'denied')),
  responded_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.family_checks enable row level security;

create policy "family_checks_protector_all"
  on public.family_checks for all
  using (protector_id = auth.uid())
  with check (protector_id = auth.uid());

create policy "family_checks_protected_select"
  on public.family_checks for select
  using (
    exists (
      select 1 from public.analysis_events ae
      where ae.id = family_checks.analysis_event_id
        and ae.protected_id = auth.uid()
    )
  );

-- Jetons push Expo, un par appareil.
create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  expo_push_token text not null unique,
  device_name text,
  created_at timestamptz not null default now()
);

alter table public.push_tokens enable row level security;

create policy "push_tokens_owner_all"
  on public.push_tokens for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
