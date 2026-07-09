
GRANT SELECT ON public.teacher_topic_videos TO anon;
GRANT SELECT ON public.teacher_topic_mcqs TO anon;

CREATE POLICY "Anon view approved videos"
  ON public.teacher_topic_videos FOR SELECT
  TO anon
  USING (approved = true);

CREATE POLICY "Anon view mcqs"
  ON public.teacher_topic_mcqs FOR SELECT
  TO anon
  USING (true);
