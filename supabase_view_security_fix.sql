-- Enable security_invoker on the view so it uses the permissions of the querying user (respecting RLS)
-- instead of the view owner's permissions.
ALTER VIEW public.venue_with_stats SET (security_invoker = on);
