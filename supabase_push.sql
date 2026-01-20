-- Create table for storing Web Push Subscriptions
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  subscription jsonb not null,
  user_agent text,
  created_at timestamptz default now()
);

-- RLS Policies
alter table public.push_subscriptions enable row level security;

create policy "Users can insert their own subscriptions"
  on public.push_subscriptions for insert
  with check (auth.uid() = user_id);

create policy "Users can select their own subscriptions"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

create policy "Users can delete their own subscriptions"
  on public.push_subscriptions for delete
  using (auth.uid() = user_id);

-- Admins can read all (if needed for sending)
-- Assuming we use service_role key for sending from Edge Function, we don't strictly need a policy for sending, 
-- but if we want Admin Dashboard to see count of devices:
create policy "Admins can view all subscriptions"
  on public.push_subscriptions for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );
