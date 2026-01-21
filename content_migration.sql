-- 1. Create Banners Table
create table public.banners (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  subtitle text,
  image_url text not null,
  link_url text,
  cta_text text default 'Book Now',
  is_active boolean default true,
  display_order integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Seed existing demo banners
INSERT INTO banners (title, subtitle, image_url, link_url, cta_text, is_active, display_order)
VALUES 
('Weekend Cricket Bash', 'Book top-rated turfs near you', 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?q=80&w=2067&auto=format&fit=crop', '/venues?category=turf', 'Book Now', true, 1),
('Badminton Pro Courts', 'Premium wooden courts available', 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?q=80&w=2070&auto=format&fit=crop', '/venues?category=badminton', 'Explore', true, 2),
('Swimming Sessions', 'Beat the heat this summer', 'https://images.unsplash.com/photo-1600965962102-9d260a71890d?q=80&w=2070&auto=format&fit=crop', '/venues?category=swimming', 'View Pools', true, 3);

-- 2. Add is_featured to Venues
alter table public.venues add column IF NOT EXISTS is_featured boolean default false;

-- 3. Enable RLS on Banners
alter table public.banners enable row level security;

-- 4. RLS Policies for Banners
-- Public can view active banners
create policy "Public can view active banners"
on public.banners for select
to public
using (is_active = true);

-- Admins can do everything
create policy "Admins can manage banners"
on public.banners for all
to authenticated
using (
  exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'admin'
  )
);

-- 5. Storage Bucket for Banners
-- (If 'banners' bucket doesn't exist, you'll need to create it in the Storage UI)
-- Policy to allow public to view banner images
-- (This usually needs to be done in the Storage UI, but here's the policy logic if you run it in SQL editor)
insert into storage.buckets (id, name, public)
values ('banners', 'banners', true)
on conflict (id) do nothing;

create policy "Public Access to Banners"
on storage.objects for select
to public
using ( bucket_id = 'banners' );

create policy "Admin Upload Banners"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'banners' AND
  exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'admin'
  )
);
