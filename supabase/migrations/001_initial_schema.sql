-- Prof Bee Copywriting Agent — Initial Schema
-- v2.0

create table if not exists users (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz default now(),
  nickname     text not null,
  role         text check (role in ('owner','invited','anonymous')) default 'anonymous',
  vote_weight  numeric default 1.0
);

-- owner = 5.0, invited = 2.0, anonymous = 0.5, agent = 1.0
-- Update your own row manually in the Supabase dashboard after first login:
--   UPDATE users SET role='owner', vote_weight=5.0 WHERE id='<your-user-id>';

create table if not exists generations (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz default now(),
  brand               text not null,
  task_type           text not null,
  brief               text not null,
  output              text not null,
  model               text not null,
  temperature         numeric,
  system_prompt_hash  text,
  user_id             uuid references users(id),
  focus_dimension     text
);

create table if not exists ratings (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz default now(),
  generation_id     uuid references generations(id) on delete cascade,
  rater_id          uuid references users(id),
  rater_type        text check (rater_type in ('human','agent')) default 'human',
  agent_name        text,
  score_hook        numeric,
  score_specificity numeric,
  score_voice_fit   numeric,
  score_tension     numeric,
  score_originality numeric,
  overall           numeric,
  notes             text
);

create table if not exists exemplars (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz default now(),
  generation_id     uuid references generations(id),
  brand             text not null,
  task_type         text not null,
  brief             text not null,
  output            text not null,
  weighted_overall  numeric not null,
  score_hook        numeric,
  score_specificity numeric,
  score_voice_fit   numeric,
  score_tension     numeric,
  score_originality numeric,
  notes             text,
  embedding         vector(1536)
);

create table if not exists anti_exemplars (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz default now(),
  generation_id     uuid references generations(id),
  brand             text not null,
  task_type         text not null,
  brief             text not null,
  output            text not null,
  weighted_overall  numeric not null,
  worst_dimension   text,
  score_hook        numeric,
  score_specificity numeric,
  score_voice_fit   numeric,
  score_tension     numeric,
  score_originality numeric,
  why_bad           text,
  embedding         vector(1536)
);

create table if not exists rules (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz default now(),
  scope       text check (scope in ('always','brand','task')) not null,
  brand       text,
  task_type   text,
  text        text not null,
  source      text check (source in ('manual','correction','agent_derived')) default 'manual',
  active      boolean default true
);

create table if not exists agent_raters (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  persona             text not null,
  model               text not null,
  weight_hook         numeric default 1.0,
  weight_specificity  numeric default 1.0,
  weight_voice_fit    numeric default 1.0,
  weight_tension      numeric default 1.0,
  weight_originality  numeric default 1.0,
  system_prompt       text not null,
  active              boolean default true
);

create table if not exists briefs (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz default now(),
  brand       text not null,
  task_type   text not null,
  text        text not null,
  source      text check (source in ('manual','generated','revenue_derived')),
  priority    integer default 5,
  segment     text,
  content_job text,
  times_used  integer default 0
);

create table if not exists review_queue (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz default now(),
  generation_id  uuid references generations(id),
  queue_type     text check (queue_type in ('exemplar','anti_exemplar')),
  agent_votes    jsonb,
  status         text check (status in ('pending','approved','rejected')) default 'pending',
  reviewed_at    timestamptz,
  reviewed_by    uuid references users(id)
);

-- kv_store for legacy keys (rules, version_log, etc.) until migrated to proper tables
create table if not exists kv_store (
  key    text primary key,
  value  text not null
);

-- ── Computed view: weighted_overall per generation ───────────────────────────
create or replace view generation_weighted_scores as
select
  g.id as generation_id,
  g.brand,
  g.task_type,
  sum(r.overall * u.vote_weight) / sum(u.vote_weight) as weighted_overall,
  count(r.id) filter (where r.rater_type = 'human') as human_rating_count,
  count(r.id) filter (where r.rater_type = 'agent') as agent_rating_count
from generations g
join ratings r on r.generation_id = g.id
join users u on u.id = r.rater_id
group by g.id, g.brand, g.task_type;

-- ── Row-Level Security ───────────────────────────────────────────────────────
alter table users           enable row level security;
alter table generations     enable row level security;
alter table ratings         enable row level security;
alter table exemplars       enable row level security;
alter table anti_exemplars  enable row level security;
alter table rules           enable row level security;
alter table briefs          enable row level security;
alter table review_queue    enable row level security;
alter table kv_store        enable row level security;

-- Anyone (including anonymous) can INSERT generations and ratings
create policy "insert_generations" on generations for insert to anon, authenticated with check (true);
create policy "insert_ratings"     on ratings     for insert to anon, authenticated with check (true);
create policy "insert_users"       on users       for insert to anon, authenticated with check (true);
create policy "insert_briefs"      on briefs      for insert to anon, authenticated with check (true);

-- Anyone can SELECT exemplars, anti_exemplars, rules, briefs (needed for context injection)
create policy "select_exemplars"       on exemplars      for select to anon, authenticated using (true);
create policy "select_anti_exemplars"  on anti_exemplars for select to anon, authenticated using (true);
create policy "select_rules"           on rules          for select to anon, authenticated using (true);
create policy "select_briefs"          on briefs         for select to anon, authenticated using (true);
create policy "select_generations"     on generations    for select to anon, authenticated using (true);
create policy "select_ratings"         on ratings        for select to anon, authenticated using (true);
create policy "select_users"           on users          for select to anon, authenticated using (true);
create policy "select_kv"              on kv_store       for select to anon, authenticated using (true);
create policy "upsert_kv"              on kv_store       for insert to anon, authenticated with check (true);
create policy "update_kv"              on kv_store       for update to anon, authenticated using (true);

-- review_queue: owner-only (enforced client-side by role check; RLS deferred to Phase 2)
create policy "all_review_queue" on review_queue for all to anon, authenticated using (true);
