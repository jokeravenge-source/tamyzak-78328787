ALTER TABLE public.parent_follow_links ADD COLUMN IF NOT EXISTS access_code TEXT;

-- Backfill any existing rows with a random 6-digit code
UPDATE public.parent_follow_links
SET access_code = lpad((floor(random() * 1000000))::int::text, 6, '0')
WHERE access_code IS NULL;

-- Set a default for new rows
ALTER TABLE public.parent_follow_links
  ALTER COLUMN access_code SET DEFAULT lpad((floor(random() * 1000000))::int::text, 6, '0');

ALTER TABLE public.parent_follow_links
  ALTER COLUMN access_code SET NOT NULL;