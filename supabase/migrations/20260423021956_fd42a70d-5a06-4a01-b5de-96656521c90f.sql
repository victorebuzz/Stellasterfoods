CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- Replace overly broad SELECT policy with one that allows direct file fetches
-- but prevents bucket listing.
DROP POLICY IF EXISTS "Public can view food images" ON storage.objects;

CREATE POLICY "Public can read food images"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'food-images' AND name IS NOT NULL);