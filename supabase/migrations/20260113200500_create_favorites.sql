-- Create user_favorites table
create table if not exists public.user_favorites (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  venue_id uuid references public.venues not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, venue_id)
);

-- Enable RLS
alter table public.user_favorites enable row level security;

-- Policies
create policy "Users can view their own favorites"
on public.user_favorites for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own favorites"
on public.user_favorites for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can delete their own favorites"
on public.user_favorites for delete
to authenticated
using (auth.uid() = user_id);
