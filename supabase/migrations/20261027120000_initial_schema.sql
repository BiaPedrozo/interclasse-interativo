-- Interclasse Interativo — esquema inicial para Supabase (PostgreSQL).
-- Dados inseridos por esta migração são apenas estruturais; não há dados reais de alunos.
-- Execute pelo Supabase CLI (supabase db push) ou pelo SQL Editor do projeto.

create extension if not exists pgcrypto;

create type public.user_role as enum ('admin', 'student');
create type public.match_status as enum ('scheduled', 'completed', 'cancelled');
create type public.publication_status as enum ('draft', 'published', 'archived');
create type public.image_status as enum ('pending', 'published', 'rejected');
create type public.poll_status as enum ('draft', 'open', 'closed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 2 and 100),
  role public.user_role not null default 'student',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.school_classes (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  year_label text not null check (char_length(btrim(year_label)) between 1 and 40),
  created_at timestamptz not null default now(),
  unique (name, year_label)
);

alter table public.profiles
  add column class_id uuid references public.school_classes(id) on delete restrict;

create table public.modalities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(btrim(name)) between 1 and 80),
  score_label text not null default 'pontos' check (char_length(btrim(score_label)) between 1 and 30),
  points_win smallint not null default 3 check (points_win >= 0),
  points_draw smallint not null default 1 check (points_draw >= 0),
  points_loss smallint not null default 0 check (points_loss >= 0),
  tie_breakers jsonb not null default '["points", "wins", "score_difference", "scores_for"]'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (jsonb_typeof(tie_breakers) = 'array')
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 100),
  class_id uuid not null references public.school_classes(id) on delete restrict,
  modality_id uuid not null references public.modalities(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (class_id, modality_id)
);

create table public.athletes (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 2 and 120),
  shirt_number smallint check (shirt_number between 0 and 999),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (team_id, name)
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  modality_id uuid not null references public.modalities(id) on delete restrict,
  home_team_id uuid not null references public.teams(id) on delete restrict,
  away_team_id uuid not null references public.teams(id) on delete restrict,
  starts_at timestamptz not null,
  duration_minutes smallint not null default 60 check (duration_minutes between 1 and 360),
  venue text not null check (char_length(btrim(venue)) between 1 and 120),
  status public.match_status not null default 'scheduled',
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (home_team_id <> away_team_id)
);

create unique index matches_venue_start_unique
  on public.matches (lower(venue), starts_at)
  where status <> 'cancelled';
create index matches_schedule_idx on public.matches (starts_at, status);
create index teams_modality_idx on public.teams (modality_id);

create table public.results (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null unique references public.matches(id) on delete restrict,
  home_score smallint not null check (home_score between 0 and 999),
  away_score smallint not null check (away_score between 0 and 999),
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.news (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  content text not null check (char_length(btrim(content)) between 1 and 10000),
  published_at timestamptz,
  featured boolean not null default false,
  status public.publication_status not null default 'draft',
  author_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'published' and published_at is not null) or status <> 'published')
);
create index news_publication_idx on public.news (status, published_at desc);

create table public.images (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique check (char_length(btrim(storage_path)) between 1 and 500),
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/avif')),
  byte_size integer not null check (byte_size between 1 and 5242880),
  caption text not null check (char_length(btrim(caption)) between 1 and 160),
  alt_text text not null check (char_length(btrim(alt_text)) between 1 and 200),
  consent_confirmed boolean not null default false,
  status public.image_status not null default 'pending',
  uploaded_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'published' or consent_confirmed)
);
create index images_publication_idx on public.images (status, created_at desc);

create table public.polls (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 160),
  category text not null check (char_length(btrim(category)) between 1 and 80),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.poll_status not null default 'draft',
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table public.candidates (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete restrict,
  athlete_id uuid not null references public.athletes(id) on delete restrict,
  description text not null default '' check (char_length(description) <= 500),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (poll_id, athlete_id)
);

create table public.votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete restrict,
  candidate_id uuid not null references public.candidates(id) on delete restrict,
  student_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (poll_id, student_id)
);
create index votes_poll_candidate_idx on public.votes (poll_id, candidate_id);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null check (char_length(btrim(action)) between 1 and 100),
  entity_type text not null check (char_length(btrim(entity_type)) between 1 and 80),
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Ao criar uma conta no Supabase Auth, cria seu perfil de estudante.
-- A elevação para administrador deve ser feita somente no SQL Editor por responsável autorizado.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''), 'Aluno'));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
create trigger matches_set_updated_at before update on public.matches for each row execute procedure public.set_updated_at();
create trigger results_set_updated_at before update on public.results for each row execute procedure public.set_updated_at();
create trigger news_set_updated_at before update on public.news for each row execute procedure public.set_updated_at();
create trigger images_set_updated_at before update on public.images for each row execute procedure public.set_updated_at();
create trigger polls_set_updated_at before update on public.polls for each row execute procedure public.set_updated_at();

-- Estudantes podem corrigir apenas o nome de exibição. Papel, turma e situação
-- são controlados por administrador ou pelo serviço administrativo do Supabase.
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if old.id = auth.uid() and not public.is_admin() and (
    new.role is distinct from old.role
    or new.class_id is distinct from old.class_id
    or new.active is distinct from old.active
  ) then
    raise exception 'Apenas administradores podem alterar papel, turma ou situação';
  end if;
  return new;
end;
$$;
create trigger profiles_protect_fields before update on public.profiles
  for each row execute procedure public.protect_profile_fields();

-- Garante que as equipes de uma partida pertençam à modalidade selecionada.
create or replace function public.validate_match_teams()
returns trigger language plpgsql as $$
begin
  if not exists (select 1 from public.teams where id = new.home_team_id and modality_id = new.modality_id)
     or not exists (select 1 from public.teams where id = new.away_team_id and modality_id = new.modality_id) then
    raise exception 'As equipes devem pertencer à modalidade da partida';
  end if;
  return new;
end;
$$;
create trigger matches_validate_teams before insert or update on public.matches
  for each row execute procedure public.validate_match_teams();

-- Valida a votação no banco, inclusive em chamadas concorrentes ou fora da interface.
create or replace function public.validate_vote()
returns trigger language plpgsql as $$
begin
  if new.student_id <> auth.uid() then
    raise exception 'O voto deve pertencer ao usuário autenticado';
  end if;
  if not exists (
    select 1 from public.profiles
    where id = new.student_id and role = 'student' and active
  ) then
    raise exception 'Apenas estudantes ativos podem votar';
  end if;
  if not exists (
    select 1 from public.polls p
    join public.candidates c on c.poll_id = p.id
    where p.id = new.poll_id and c.id = new.candidate_id and c.active
      and p.status = 'open' and now() >= p.starts_at and now() < p.ends_at
  ) then
    raise exception 'Votação indisponível ou candidato inválido';
  end if;
  return new;
end;
$$;
create trigger votes_validate before insert on public.votes
  for each row execute procedure public.validate_vote();

create or replace function public.mark_match_completed()
returns trigger language plpgsql as $$
begin
  update public.matches set status = 'completed' where id = new.match_id;
  return new;
end;
$$;
create trigger results_mark_match_completed after insert or update on public.results
  for each row execute procedure public.mark_match_completed();

-- Função usada nas políticas RLS. SECURITY DEFINER impede recursão ao consultar profiles.
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and active
  );
$$;

-- Classificação por modalidade. Pontos e saldo usam as regras configuradas em modalities.
create or replace view public.standings as
with appearances as (
  select m.modality_id, m.home_team_id as team_id, r.home_score as scored, r.away_score as conceded
  from public.matches m join public.results r on r.match_id = m.id
  where m.status = 'completed'
  union all
  select m.modality_id, m.away_team_id, r.away_score, r.home_score
  from public.matches m join public.results r on r.match_id = m.id
  where m.status = 'completed'
)
select
  t.id as team_id, t.name as team_name, t.class_id, t.modality_id,
  count(a.team_id)::integer as matches_played,
  count(*) filter (where a.scored > a.conceded)::integer as wins,
  count(*) filter (where a.scored = a.conceded)::integer as draws,
  count(*) filter (where a.scored < a.conceded)::integer as losses,
  coalesce(sum(a.scored), 0)::integer as scores_for,
  coalesce(sum(a.conceded), 0)::integer as scores_against,
  coalesce(sum(a.scored - a.conceded), 0)::integer as score_difference,
  coalesce(sum(case when a.scored > a.conceded then mo.points_win when a.scored = a.conceded then mo.points_draw else mo.points_loss end), 0)::integer as points
from public.teams t
join public.modalities mo on mo.id = t.modality_id
left join appearances a on a.team_id = t.id and a.modality_id = t.modality_id
group by t.id, t.name, t.class_id, t.modality_id, mo.points_win, mo.points_draw, mo.points_loss;

-- Row Level Security: visitantes veem somente conteúdo publicado e placares; admins gerenciam dados.
alter table public.profiles enable row level security;
alter table public.school_classes enable row level security;
alter table public.modalities enable row level security;
alter table public.teams enable row level security;
alter table public.athletes enable row level security;
alter table public.matches enable row level security;
alter table public.results enable row level security;
alter table public.news enable row level security;
alter table public.images enable row level security;
alter table public.polls enable row level security;
alter table public.candidates enable row level security;
alter table public.votes enable row level security;
alter table public.audit_log enable row level security;

create policy "profiles_select_own_or_admin" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "profiles_update_own_name_or_admin" on public.profiles for update using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

create policy "classes_read" on public.school_classes for select using (true);
create policy "classes_admin_write" on public.school_classes for all using (public.is_admin()) with check (public.is_admin());
create policy "modalities_read" on public.modalities for select using (true);
create policy "modalities_admin_write" on public.modalities for all using (public.is_admin()) with check (public.is_admin());
create policy "teams_read" on public.teams for select using (true);
create policy "teams_admin_write" on public.teams for all using (public.is_admin()) with check (public.is_admin());
create policy "athletes_read" on public.athletes for select using (true);
create policy "athletes_admin_write" on public.athletes for all using (public.is_admin()) with check (public.is_admin());
create policy "matches_read" on public.matches for select using (true);
create policy "matches_admin_write" on public.matches for all using (public.is_admin()) with check (public.is_admin());
create policy "results_read" on public.results for select using (true);
create policy "results_admin_write" on public.results for all using (public.is_admin()) with check (public.is_admin());
create policy "news_public_read" on public.news for select using (status = 'published' or public.is_admin());
create policy "news_admin_write" on public.news for all using (public.is_admin()) with check (public.is_admin());
create policy "images_public_read" on public.images for select using (status = 'published' or public.is_admin());
create policy "images_admin_write" on public.images for all using (public.is_admin()) with check (public.is_admin());
create policy "polls_read" on public.polls for select using (status in ('open', 'closed') or public.is_admin());
create policy "polls_admin_write" on public.polls for all using (public.is_admin()) with check (public.is_admin());
create policy "candidates_read" on public.candidates for select using (true);
create policy "candidates_admin_write" on public.candidates for all using (public.is_admin()) with check (public.is_admin());
create policy "votes_read_own_or_admin" on public.votes for select using (student_id = auth.uid() or public.is_admin());
create policy "votes_insert_own" on public.votes for insert with check (student_id = auth.uid());
create policy "audit_admin_read" on public.audit_log for select using (public.is_admin());
create policy "audit_admin_insert" on public.audit_log for insert with check (public.is_admin());

-- Bucket privado: imagens publicadas devem ser entregues por URL assinada após consulta à tabela images.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gallery', 'gallery', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "gallery_admin_read" on storage.objects for select using (bucket_id = 'gallery' and public.is_admin());
create policy "gallery_admin_upload" on storage.objects for insert with check (bucket_id = 'gallery' and public.is_admin());
create policy "gallery_admin_update" on storage.objects for update using (bucket_id = 'gallery' and public.is_admin()) with check (bucket_id = 'gallery' and public.is_admin());
create policy "gallery_admin_delete" on storage.objects for delete using (bucket_id = 'gallery' and public.is_admin());

-- Privilégios SQL complementam RLS. Escritas seguem bloqueadas pelas políticas
-- para qualquer usuário que não seja administrador, exceto o voto do próprio estudante.
grant usage on schema public to anon, authenticated;
grant select on public.profiles, public.school_classes, public.modalities, public.teams,
  public.athletes, public.matches, public.results, public.news, public.images,
  public.polls, public.candidates, public.votes, public.audit_log, public.standings
  to anon, authenticated;
grant insert, update, delete on public.profiles, public.school_classes, public.modalities,
  public.teams, public.athletes, public.matches, public.results, public.news,
  public.images, public.polls, public.candidates, public.votes, public.audit_log
  to authenticated;
grant usage, select on sequence public.audit_log_id_seq to authenticated;

