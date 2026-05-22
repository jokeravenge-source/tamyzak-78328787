ALTER TABLE public.custom_flashcards
  ADD COLUMN IF NOT EXISTS approved boolean NOT NULL DEFAULT false;

-- Auto-approve any existing rows (added by admins previously)
UPDATE public.custom_flashcards SET approved = true WHERE approved = false;

-- Replace overly-open SELECT policy
DROP POLICY IF EXISTS "Flashcards readable by authed" ON public.custom_flashcards;

CREATE POLICY "View approved flashcards"
  ON public.custom_flashcards FOR SELECT
  TO authenticated
  USING (approved = true);

CREATE POLICY "View own flashcards"
  ON public.custom_flashcards FOR SELECT
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Admins view all flashcards"
  ON public.custom_flashcards FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow users to submit their own pending flashcards
CREATE POLICY "Users submit own flashcards"
  ON public.custom_flashcards FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by AND approved = false);

-- Allow users to delete their own pending flashcards
CREATE POLICY "Users delete own pending flashcards"
  ON public.custom_flashcards FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by AND approved = false);
