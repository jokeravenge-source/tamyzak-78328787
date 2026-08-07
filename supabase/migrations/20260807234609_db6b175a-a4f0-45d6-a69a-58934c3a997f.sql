CREATE TABLE public.flashcard_reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  card_key text NOT NULL,
  subject text NOT NULL,
  chapter text NOT NULL,
  question text NOT NULL,
  answer text NOT NULL,
  language text NOT NULL DEFAULT 'ar',
  ease numeric NOT NULL DEFAULT 2.5,
  interval_days numeric NOT NULL DEFAULT 0,
  reps integer NOT NULL DEFAULT 0,
  lapses integer NOT NULL DEFAULT 0,
  last_rating text,
  last_reviewed_at timestamp with time zone,
  due_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, card_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.flashcard_reviews TO authenticated;
GRANT ALL ON public.flashcard_reviews TO service_role;

ALTER TABLE public.flashcard_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own flashcard reviews"
ON public.flashcard_reviews FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_flashcard_reviews_due ON public.flashcard_reviews (user_id, due_at);
CREATE INDEX idx_flashcard_reviews_scope ON public.flashcard_reviews (user_id, subject, chapter);

CREATE TRIGGER flashcard_reviews_set_updated_at
BEFORE UPDATE ON public.flashcard_reviews
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();