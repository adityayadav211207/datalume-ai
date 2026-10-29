create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.datasets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  original_filename text not null,
  file_type text not null check (file_type in ('csv','xlsx','xls')),
  storage_path text not null,
  row_count bigint not null default 0 check (row_count >= 0),
  column_count integer not null default 0 check (column_count >= 0),
  schema_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, storage_path)
);

create table public.saved_dashboards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  dataset_id uuid not null references public.datasets(id) on delete cascade,
  name text not null,
  configuration jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  dataset_id uuid references public.datasets(id) on delete set null,
  title text not null default 'New conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table public.analysis_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  dataset_id uuid not null references public.datasets(id) on delete cascade,
  analysis_type text not null,
  results jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index datasets_user_created_idx on public.datasets(user_id, created_at desc);
create index dashboards_owner_idx on public.saved_dashboards(user_id, updated_at desc);
create index conversations_owner_idx on public.chat_conversations(user_id, updated_at desc);
create index messages_conversation_idx on public.chat_messages(conversation_id, created_at);
create index analysis_history_owner_idx on public.analysis_history(user_id, created_at desc);

create function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger datasets_touch before update on public.datasets for each row execute function public.touch_updated_at();
create trigger dashboards_touch before update on public.saved_dashboards for each row execute function public.touch_updated_at();
create trigger conversations_touch before update on public.chat_conversations for each row execute function public.touch_updated_at();

create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do update set full_name = excluded.full_name;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.datasets enable row level security;
alter table public.saved_dashboards enable row level security;
alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;
alter table public.analysis_history enable row level security;

create policy "profile owner access" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy "dataset owner access" on public.datasets for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "dashboard owner access" on public.saved_dashboards for all using (user_id = auth.uid() and exists (select 1 from public.datasets d where d.id = dataset_id and d.user_id = auth.uid())) with check (user_id = auth.uid() and exists (select 1 from public.datasets d where d.id = dataset_id and d.user_id = auth.uid()));
create policy "conversation owner access" on public.chat_conversations for all using (user_id = auth.uid()) with check (user_id = auth.uid() and (dataset_id is null or exists (select 1 from public.datasets d where d.id = dataset_id and d.user_id = auth.uid())));
create policy "message owner access" on public.chat_messages for all using (user_id = auth.uid() and exists (select 1 from public.chat_conversations c where c.id = conversation_id and c.user_id = auth.uid())) with check (user_id = auth.uid() and exists (select 1 from public.chat_conversations c where c.id = conversation_id and c.user_id = auth.uid()));
create policy "analysis owner access" on public.analysis_history for all using (user_id = auth.uid() and exists (select 1 from public.datasets d where d.id = dataset_id and d.user_id = auth.uid())) with check (user_id = auth.uid() and exists (select 1 from public.datasets d where d.id = dataset_id and d.user_id = auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('user-datasets', 'user-datasets', false, 26214400, array['text/csv','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict (id) do nothing;
create policy "dataset owner storage access" on storage.objects for all using (bucket_id = 'user-datasets' and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id = 'user-datasets' and (storage.foldername(name))[1] = auth.uid()::text);