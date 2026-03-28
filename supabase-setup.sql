-- Playgroup Planner — Supabase setup
-- Run this in your Supabase project's SQL Editor (https://supabase.com/dashboard → SQL Editor)

-- 1. Create the user_data table
create table if not exists user_data (
  id          uuid        default gen_random_uuid() primary key,
  user_id     uuid        references auth.users(id) on delete cascade not null,
  key         text        not null,
  data        jsonb       not null,
  updated_at  timestamptz default now(),
  unique (user_id, key)
);

-- 2. Enable Row Level Security
alter table user_data enable row level security;

-- 3. RLS policies — users can only access their own data
create policy "Users can read own data"
  on user_data for select
  using (auth.uid() = user_id);

create policy "Users can insert own data"
  on user_data for insert
  with check (auth.uid() = user_id);

create policy "Users can update own data"
  on user_data for update
  using (auth.uid() = user_id);

create policy "Users can delete own data"
  on user_data for delete
  using (auth.uid() = user_id);

-- 4. Index for fast per-user lookups
create index if not exists user_data_user_id_idx on user_data (user_id);

-- 5. Create the feedback table (used by the in-app feedback button)
create table if not exists feedback (
  id          uuid        default gen_random_uuid() primary key,
  message     text        not null,
  name        text,
  email       text,
  created_at  timestamptz default now()
);

-- Enable RLS — anyone can submit feedback, but no one can read it via client
alter table feedback enable row level security;

create policy "Anyone can submit feedback"
  on feedback for insert
  with check (true);
