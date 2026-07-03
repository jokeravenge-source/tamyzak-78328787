
-- COURSES
CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title_ar text NOT NULL,
  title_en text NOT NULL,
  description_ar text,
  description_en text,
  cover_url text,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT ALL ON public.courses TO service_role;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- COURSE TEACHERS
CREATE TABLE public.course_teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_teachers TO authenticated;
GRANT ALL ON public.course_teachers TO service_role;
ALTER TABLE public.course_teachers ENABLE ROW LEVEL SECURITY;

-- Helper: is teacher of course (or global admin)
CREATE OR REPLACE FUNCTION public.is_course_teacher(_course uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.course_teachers
      WHERE course_id = _course AND user_id = auth.uid()
    );
$$;

-- COURSE ENROLLMENTS
CREATE TABLE public.course_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  enrolled_by uuid,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_enrollments TO authenticated;
GRANT ALL ON public.course_enrollments TO service_role;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

-- Helper: is enrolled in course
CREATE OR REPLACE FUNCTION public.is_course_enrolled(_course uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.course_enrollments
    WHERE course_id = _course AND user_id = auth.uid()
  );
$$;

-- COURSE CHAPTERS
CREATE TABLE public.course_chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_chapters TO authenticated;
GRANT ALL ON public.course_chapters TO service_role;
ALTER TABLE public.course_chapters ENABLE ROW LEVEL SECURITY;

-- COURSE VIDEOS
CREATE TABLE public.course_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid NOT NULL REFERENCES public.course_chapters(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  duration_sec integer,
  bunny_library_id text NOT NULL,
  bunny_video_guid text NOT NULL,
  thumbnail_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_videos TO authenticated;
GRANT ALL ON public.course_videos TO service_role;
ALTER TABLE public.course_videos ENABLE ROW LEVEL SECURITY;

-- COURSE VIDEO VIEWS
CREATE TABLE public.course_video_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES public.course_videos(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  opened_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  max_percent integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  UNIQUE (video_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_video_views TO authenticated;
GRANT ALL ON public.course_video_views TO service_role;
ALTER TABLE public.course_video_views ENABLE ROW LEVEL SECURITY;

-- updated_at trigger reuse
CREATE TRIGGER courses_updated_at BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER course_chapters_updated_at BEFORE UPDATE ON public.course_chapters
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER course_videos_updated_at BEFORE UPDATE ON public.course_videos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ================= POLICIES =================

-- courses: any authed user can read published courses; teachers/admins see all + write
CREATE POLICY "courses read published" ON public.courses
  FOR SELECT TO authenticated
  USING (is_published OR public.is_course_teacher(id));
CREATE POLICY "courses admins manage" ON public.courses
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- course_teachers: teachers can read their course rows; admins manage
CREATE POLICY "course_teachers read" ON public.course_teachers
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "course_teachers admin manage" ON public.course_teachers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- course_enrollments: user reads own; teacher reads/writes their course; admin all
CREATE POLICY "enrollments self read" ON public.course_enrollments
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_course_teacher(course_id));
CREATE POLICY "enrollments teacher manage" ON public.course_enrollments
  FOR ALL TO authenticated
  USING (public.is_course_teacher(course_id))
  WITH CHECK (public.is_course_teacher(course_id));

-- course_chapters: read if enrolled OR teacher; write teacher
CREATE POLICY "chapters read" ON public.course_chapters
  FOR SELECT TO authenticated
  USING (public.is_course_enrolled(course_id) OR public.is_course_teacher(course_id));
CREATE POLICY "chapters teacher manage" ON public.course_chapters
  FOR ALL TO authenticated
  USING (public.is_course_teacher(course_id))
  WITH CHECK (public.is_course_teacher(course_id));

-- course_videos: read if enrolled AND published, OR teacher; write teacher
CREATE POLICY "videos read" ON public.course_videos
  FOR SELECT TO authenticated
  USING (
    (is_published AND public.is_course_enrolled(course_id))
    OR public.is_course_teacher(course_id)
  );
CREATE POLICY "videos teacher manage" ON public.course_videos
  FOR ALL TO authenticated
  USING (public.is_course_teacher(course_id))
  WITH CHECK (public.is_course_teacher(course_id));

-- course_video_views: user manages own; teacher reads their course
CREATE POLICY "views self manage" ON public.course_video_views
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "views teacher read" ON public.course_video_views
  FOR SELECT TO authenticated
  USING (public.is_course_teacher(course_id));

-- Seed French course
INSERT INTO public.courses (slug, title_ar, title_en, description_ar, description_en, is_published)
VALUES ('french', 'اللغة الفرنسية', 'French', 'دورة اللغة الفرنسية للسادس الإعدادي', 'French course for grade 12', true)
ON CONFLICT (slug) DO NOTHING;
