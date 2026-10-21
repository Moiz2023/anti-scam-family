-- Rate limiting sur les endpoints couteux (cahier des charges section 5 :
-- "Securite : ... rate limiting"). Protege a la fois contre l'abus et
-- contre une facture Claude incontrolee en cas de script malveillant.
--
-- Fonction atomique (un seul UPSERT) pour eviter les conditions de course
-- d'un cycle lecture-puis-ecriture classique sous charge concurrente.

create table public.rate_limits (
  key text primary key,
  count int not null default 0,
  window_start timestamptz not null default now()
);

alter table public.rate_limits enable row level security;
-- Aucune policy : seul le service_role (utilise cote edge function) y accede.

create or replace function public.check_rate_limit(p_key text, p_limit int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  insert into public.rate_limits (key, count, window_start)
  values (p_key, 1, now())
  on conflict (key) do update
    set count = case
        when rate_limits.window_start < now() - make_interval(secs => p_window_seconds)
          then 1
        else rate_limits.count + 1
      end,
      window_start = case
        when rate_limits.window_start < now() - make_interval(secs => p_window_seconds)
          then now()
        else rate_limits.window_start
      end
  returning count into v_count;

  return v_count <= p_limit;
end;
$$;
