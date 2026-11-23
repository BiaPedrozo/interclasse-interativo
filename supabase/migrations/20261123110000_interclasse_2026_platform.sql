begin;

insert into public.school_classes (name, year_label)
values
  ('1º ano EM', '2026'),
  ('2º ano A', '2026'),
  ('2º ano B', '2026')
on conflict (name, year_label) do nothing;

create table public.competition_settings (
  id smallint primary key default 1 check (id = 1),
  event_name text not null default 'INTERCLASSE 2026',
  school_name text not null default 'Colégio Sinerge',
  tagline text not null default 'Três turmas. Uma competição. Uma história para contar.',
  starts_at timestamptz,
  updated_at timestamptz not null default now()
);

insert into public.competition_settings (id)
values (1)
on conflict (id) do nothing;

create table public.team_branding (
  class_id uuid primary key references public.school_classes(id) on delete cascade,
  display_color text not null default '#426de0'
    check (display_color ~ '^#[[:xdigit:]]{6}$'),
  slogan text not null default '',
  war_cry text not null default '',
  crest_path text,
  updated_at timestamptz not null default now()
);

insert into public.team_branding (class_id, display_color)
select id, case name
  when '1º ano EM' then '#ff7a35'
  when '2º ano A' then '#426de0'
  else '#8a62c7'
end
from public.school_classes
where year_label = '2026' and name in ('1º ano EM', '2º ano A', '2º ano B')
on conflict (class_id) do nothing;

alter table public.candidates alter column athlete_id drop not null;
alter table public.candidates add column label text;
alter table public.candidates add constraint candidates_name_required
  check (athlete_id is not null or nullif(btrim(label), '') is not null);
create unique index candidates_poll_label_unique
  on public.candidates (poll_id, lower(label))
  where label is not null;

create table public.match_predictions (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  predicted_team_id uuid references public.teams(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (match_id, student_id)
);

create table public.athlete_match_stats (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  athlete_id uuid not null references public.athletes(id) on delete restrict,
  score_count smallint not null check (score_count between 0 and 999),
  updated_by uuid not null references public.profiles(id) on delete restrict,
  updated_at timestamptz not null default now(),
  unique (match_id, athlete_id)
);

create table public.wall_messages (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  class_id uuid not null references public.school_classes(id) on delete restrict,
  message text not null check (char_length(btrim(message)) between 1 and 280),
  status text not null default 'pending'
    check (status in ('pending', 'published', 'rejected')),
  created_at timestamptz not null default now()
);
create index wall_messages_publication_idx on public.wall_messages (status, created_at desc);

create table public.media_items (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  media_type text not null check (media_type in ('image', 'video')),
  category text not null check (category in ('partida', 'torcida', 'bastidores', 'premiacao', 'outro')),
  caption text not null check (char_length(btrim(caption)) between 1 and 160),
  consent_confirmed boolean not null default false check (consent_confirmed),
  class_id uuid references public.school_classes(id) on delete set null,
  modality_id uuid references public.modalities(id) on delete set null,
  match_id uuid references public.matches(id) on delete set null,
  status text not null default 'published' check (status in ('pending', 'published', 'rejected')),
  uploaded_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index media_items_publication_idx on public.media_items (status, created_at desc);

create table public.spotlights (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in (
    'clique_rodada', 'revelacao', 'meme', 'entrevista',
    'hall_fama', 'bastidores', 'curiosidade'
  )),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  content text not null check (char_length(btrim(content)) between 1 and 2000),
  class_id uuid references public.school_classes(id) on delete set null,
  media_path text,
  status text not null default 'published' check (status in ('draft', 'published')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index spotlights_publication_idx on public.spotlights (status, created_at desc);

alter table public.competition_settings enable row level security;
alter table public.team_branding enable row level security;
alter table public.match_predictions enable row level security;
alter table public.athlete_match_stats enable row level security;
alter table public.wall_messages enable row level security;
alter table public.media_items enable row level security;
alter table public.spotlights enable row level security;

create policy "competition_settings_public_read" on public.competition_settings
  for select using (true);
create policy "competition_settings_admin_write" on public.competition_settings
  for all using (public.is_admin()) with check (public.is_admin());
create policy "team_branding_public_read" on public.team_branding
  for select using (true);
create policy "team_branding_admin_write" on public.team_branding
  for all using (public.is_admin()) with check (public.is_admin());

create policy "predictions_own_or_admin_read" on public.match_predictions
  for select using (student_id = auth.uid() or public.is_admin());
create policy "predictions_own_insert" on public.match_predictions
  for insert with check (student_id = auth.uid());
create policy "predictions_admin_manage" on public.match_predictions
  for all using (public.is_admin()) with check (public.is_admin());
create policy "athlete_stats_public_read" on public.athlete_match_stats
  for select using (true);
create policy "athlete_stats_admin_manage" on public.athlete_match_stats
  for all using (public.is_admin()) with check (public.is_admin());

create policy "wall_published_or_own_read" on public.wall_messages
  for select using (status = 'published' or author_id = auth.uid() or public.is_admin());
create policy "wall_authenticated_submit" on public.wall_messages
  for insert with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'student' and p.active
        and p.class_id = wall_messages.class_id
    )
  );
create policy "wall_admin_moderate" on public.wall_messages
  for update using (public.is_admin()) with check (public.is_admin());
create policy "wall_admin_delete" on public.wall_messages
  for delete using (public.is_admin());

create policy "media_published_or_admin_read" on public.media_items
  for select using (status = 'published' or public.is_admin());
create policy "media_admin_manage" on public.media_items
  for all using (public.is_admin()) with check (public.is_admin());
create policy "spotlights_published_or_admin_read" on public.spotlights
  for select using (status = 'published' or public.is_admin());
create policy "spotlights_admin_manage" on public.spotlights
  for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, class_id)
  select
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''), 'Aluno'),
    sc.id
  from (select 1) seed
  left join public.school_classes sc
    on sc.id::text = new.raw_user_meta_data ->> 'class_id'
   and sc.year_label = '2026'
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.validate_match_prediction()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  target_match public.matches%rowtype;
begin
  if new.student_id <> auth.uid() then
    raise exception 'O palpite deve pertencer ao usuário autenticado';
  end if;
  if not exists (
    select 1 from public.profiles
    where id = new.student_id and role = 'student' and active
      and class_id is not null
  ) then
    raise exception 'Apenas estudantes ativos vinculados a uma turma podem palpitar';
  end if;
  select * into target_match from public.matches where id = new.match_id;
  if not found or target_match.status <> 'scheduled' or now() >= target_match.starts_at then
    raise exception 'Palpites só podem ser registrados antes do início da partida';
  end if;
  if new.predicted_team_id is not null
    and new.predicted_team_id not in (target_match.home_team_id, target_match.away_team_id) then
    raise exception 'A turma escolhida não participa desta partida';
  end if;
  return new;
end;
$$;
create trigger match_predictions_validate before insert on public.match_predictions
  for each row execute procedure public.validate_match_prediction();

create or replace function public.validate_athlete_match_stat()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.matches m
    join public.teams home_team on home_team.id = m.home_team_id
    join public.teams away_team on away_team.id = m.away_team_id
    join public.athletes a on a.id = new.athlete_id and a.active
    where m.id = new.match_id and m.status = 'completed'
      and m.modality_id = (
        select team.modality_id from public.teams team where team.id = a.team_id
      )
      and a.team_id in (home_team.id, away_team.id)
  ) then
    raise exception 'O atleta precisa pertencer a uma das equipes da partida encerrada';
  end if;
  return new;
end;
$$;
create trigger athlete_match_stats_validate before insert or update on public.athlete_match_stats
  for each row execute procedure public.validate_athlete_match_stat();

create or replace function public.validate_vote()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.student_id <> auth.uid() then
    raise exception 'O voto deve pertencer ao usuário autenticado';
  end if;
  if not exists (
    select 1 from public.profiles
    where id = new.student_id and role = 'student' and active
      and class_id is not null
  ) then
    raise exception 'Apenas estudantes ativos vinculados a uma turma podem votar';
  end if;
  if not exists (
    select 1 from public.polls p
    join public.candidates c on c.poll_id = p.id
    where p.id = new.poll_id and c.id = new.candidate_id and c.active
      and p.status = 'open' and now() >= p.starts_at and now() < p.ends_at
  ) then
    raise exception 'Enquete indisponível ou opção inválida';
  end if;
  return new;
end;
$$;

create or replace function public.get_poll_results(target_poll_id uuid)
returns table (candidate_id uuid, candidate_label text, vote_count bigint, poll_votes bigint)
language plpgsql
stable
security definer set search_path = public
as $$
declare
  target_status public.poll_status;
begin
  select p.status into target_status from public.polls p where p.id = target_poll_id;
  if target_status is null then
    raise exception 'Enquete não encontrada';
  end if;
  if target_status <> 'closed' and not public.is_admin() then
    raise exception 'Os resultados são exibidos após o encerramento da enquete';
  end if;
  return query
    select c.id, coalesce(c.label, a.name, 'Candidato'), count(v.id),
      (select count(*) from public.votes all_votes where all_votes.poll_id = target_poll_id)
    from public.candidates c
    left join public.athletes a on a.id = c.athlete_id
    left join public.votes v on v.candidate_id = c.id and v.poll_id = target_poll_id
    where c.poll_id = target_poll_id
    group by c.id, c.label, a.name
    order by count(v.id) desc, coalesce(c.label, a.name, 'Candidato');
end;
$$;

create or replace function public.get_prediction_results(target_match_id uuid)
returns table (
  predicted_team_id uuid,
  predicted_label text,
  prediction_count bigint,
  correct_count bigint
)
language plpgsql
stable
security definer set search_path = public
as $$
declare
  target_status public.match_status;
  winning_team_id uuid;
begin
  select m.status into target_status from public.matches m where m.id = target_match_id;
  if target_status is null then
    raise exception 'Partida não encontrada';
  end if;
  if target_status <> 'completed' and not public.is_admin() then
    raise exception 'Os palpites são revelados após o encerramento da partida';
  end if;
  select case
    when r.home_score > r.away_score then m.home_team_id
    when r.home_score < r.away_score then m.away_team_id
    else null
  end into winning_team_id
  from public.matches m join public.results r on r.match_id = m.id
  where m.id = target_match_id;

  return query
    select p.predicted_team_id,
      case
        when p.predicted_team_id = m.home_team_id then ht.name
        when p.predicted_team_id = m.away_team_id then at.name
        else 'Empate'
      end,
      count(*),
      count(*) filter (
        where p.predicted_team_id is not distinct from winning_team_id
      )
    from public.match_predictions p
    join public.matches m on m.id = p.match_id
    join public.teams ht on ht.id = m.home_team_id
    join public.teams at on at.id = m.away_team_id
    where p.match_id = target_match_id
    group by p.predicted_team_id, ht.name, at.name
    order by count(*) desc;
end;
$$;

create or replace function public.get_competition_stats()
returns table (
  completed_matches bigint,
  scheduled_matches bigint,
  total_scores bigint,
  registered_athletes bigint,
  registered_students bigint,
  poll_votes bigint,
  total_predictions bigint
)
language sql
stable
security definer set search_path = public
as $$
  select
    (select count(*) from public.matches where status = 'completed'),
    (select count(*) from public.matches where status = 'scheduled'),
    coalesce((select sum(r.home_score + r.away_score) from public.results r), 0),
    (select count(*) from public.athletes where active),
    (select count(*) from public.profiles
      where role = 'student' and active and class_id is not null),
    (select count(*) from public.votes),
    (select count(*) from public.match_predictions);
$$;

create or replace view public.competition_standings as
select
  sc.id as class_id,
  sc.name as class_name,
  coalesce(sum(s.matches_played), 0)::integer as matches_played,
  coalesce(sum(s.wins), 0)::integer as wins,
  coalesce(sum(s.draws), 0)::integer as draws,
  coalesce(sum(s.losses), 0)::integer as losses,
  coalesce(sum(s.scores_for), 0)::integer as scores_for,
  coalesce(sum(s.scores_against), 0)::integer as scores_against,
  coalesce(sum(s.score_difference), 0)::integer as score_difference,
  coalesce(sum(s.points), 0)::integer as points
from public.school_classes sc
left join public.standings s on s.class_id = sc.id
where sc.year_label = '2026'
  and sc.name in ('1º ano EM', '2º ano A', '2º ano B')
group by sc.id, sc.name;

create or replace function public.can_read_gallery_object(object_path text)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.media_items
    where storage_path = object_path and status = 'published'
  ) or exists (
    select 1 from public.team_branding
    where crest_path = object_path
  );
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'gallery', 'gallery', false, 52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'video/mp4', 'video/webm']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "gallery_public_published_read" on storage.objects
  for select using (
    bucket_id = 'gallery'
    and (public.is_admin() or public.can_read_gallery_object(name))
  );

grant select, insert, update, delete on public.competition_settings,
  public.team_branding, public.match_predictions, public.athlete_match_stats, public.wall_messages,
  public.media_items, public.spotlights to anon, authenticated;
grant select on public.competition_standings to anon, authenticated;
grant execute on function public.get_poll_results(uuid) to anon, authenticated;
grant execute on function public.get_prediction_results(uuid) to anon, authenticated;
grant execute on function public.get_competition_stats() to anon, authenticated;
grant execute on function public.can_read_gallery_object(text) to anon, authenticated;

commit;
