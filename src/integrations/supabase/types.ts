export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      active_sessions: {
        Row: {
          elapsed_seconds: number
          is_running: boolean
          last_seen_at: string
          mission: string
          started_at: string
          subject: string
          user_id: string
        }
        Insert: {
          elapsed_seconds?: number
          is_running?: boolean
          last_seen_at?: string
          mission?: string
          started_at?: string
          subject: string
          user_id: string
        }
        Update: {
          elapsed_seconds?: number
          is_running?: boolean
          last_seen_at?: string
          mission?: string
          started_at?: string
          subject?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_notes: {
        Row: {
          background_image_url: string | null
          blocks: Json
          cover_emoji: string | null
          created_at: string
          created_by: string | null
          id: string
          published: boolean
          template: string
          title: string
          updated_at: string
        }
        Insert: {
          background_image_url?: string | null
          blocks?: Json
          cover_emoji?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          published?: boolean
          template?: string
          title: string
          updated_at?: string
        }
        Update: {
          background_image_url?: string | null
          blocks?: Json
          cover_emoji?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          published?: boolean
          template?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      advice_comments: {
        Row: {
          author_name: string
          body: string
          created_at: string
          id: string
          topic_id: string
          user_id: string
        }
        Insert: {
          author_name: string
          body: string
          created_at?: string
          id?: string
          topic_id: string
          user_id: string
        }
        Update: {
          author_name?: string
          body?: string
          created_at?: string
          id?: string
          topic_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "advice_comments_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "advice_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      advice_topics: {
        Row: {
          author_name: string
          body: string
          created_at: string
          id: string
          title: string
          user_id: string
        }
        Insert: {
          author_name: string
          body?: string
          created_at?: string
          id?: string
          title: string
          user_id: string
        }
        Update: {
          author_name?: string
          body?: string
          created_at?: string
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      canvases: {
        Row: {
          client_id: string
          created_at: string
          data: Json
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          data?: Json
          id?: string
          name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          data?: Json
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      course_chapters: {
        Row: {
          course_id: string
          created_at: string
          id: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_chapters_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_enrollments: {
        Row: {
          course_id: string
          enrolled_at: string
          enrolled_by: string | null
          id: string
          user_id: string
        }
        Insert: {
          course_id: string
          enrolled_at?: string
          enrolled_by?: string | null
          id?: string
          user_id: string
        }
        Update: {
          course_id?: string
          enrolled_at?: string
          enrolled_by?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_exam_completions: {
        Row: {
          completed_at: string
          course_id: string
          created_at: string
          exam_id: string
          graded_out_of: number | null
          id: string
          score: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          course_id: string
          created_at?: string
          exam_id: string
          graded_out_of?: number | null
          id?: string
          score?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string
          course_id?: string
          created_at?: string
          exam_id?: string
          graded_out_of?: number | null
          id?: string
          score?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_exam_completions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "course_exams"
            referencedColumns: ["id"]
          },
        ]
      }
      course_exam_plans: {
        Row: {
          acknowledged_step: number
          created_at: string
          full_name: string | null
          interval_days: number
          start_date: string
          subjects: string[]
          telegram_username: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          acknowledged_step?: number
          created_at?: string
          full_name?: string | null
          interval_days?: number
          start_date?: string
          subjects?: string[]
          telegram_username?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          acknowledged_step?: number
          created_at?: string
          full_name?: string | null
          interval_days?: number
          start_date?: string
          subjects?: string[]
          telegram_username?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      course_exams: {
        Row: {
          answer_path: string
          chapter: string
          course_id: string
          created_at: string
          created_by: string | null
          exam_path: string
          id: string
          title: string
        }
        Insert: {
          answer_path: string
          chapter?: string
          course_id: string
          created_at?: string
          created_by?: string | null
          exam_path: string
          id?: string
          title: string
        }
        Update: {
          answer_path?: string
          chapter?: string
          course_id?: string
          created_at?: string
          created_by?: string | null
          exam_path?: string
          id?: string
          title?: string
        }
        Relationships: []
      }
      course_playlists: {
        Row: {
          course_id: string
          created_at: string
          created_by: string | null
          id: string
          kind: string
          playlist_id: string | null
          title: string
          updated_at: string
          video_id: string | null
        }
        Insert: {
          course_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          playlist_id?: string | null
          title: string
          updated_at?: string
          video_id?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          playlist_id?: string | null
          title?: string
          updated_at?: string
          video_id?: string | null
        }
        Relationships: []
      }
      course_students: {
        Row: {
          created_at: string
          full_name: string
          telegram_username: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name: string
          telegram_username: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string
          telegram_username?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      course_teachers: {
        Row: {
          course_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_teachers_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_video_views: {
        Row: {
          completed: boolean
          course_id: string
          id: string
          last_seen_at: string
          max_percent: number
          opened_at: string
          user_id: string
          video_id: string
        }
        Insert: {
          completed?: boolean
          course_id: string
          id?: string
          last_seen_at?: string
          max_percent?: number
          opened_at?: string
          user_id: string
          video_id: string
        }
        Update: {
          completed?: boolean
          course_id?: string
          id?: string
          last_seen_at?: string
          max_percent?: number
          opened_at?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_video_views_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_video_views_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "course_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      course_videos: {
        Row: {
          bunny_library_id: string
          bunny_video_guid: string
          chapter_id: string
          course_id: string
          created_at: string
          created_by: string | null
          description: string | null
          duration_sec: number | null
          id: string
          is_published: boolean
          sort_order: number
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          bunny_library_id: string
          bunny_video_guid: string
          chapter_id: string
          course_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_sec?: number | null
          id?: string
          is_published?: boolean
          sort_order?: number
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          bunny_library_id?: string
          bunny_video_guid?: string
          chapter_id?: string
          course_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_sec?: number | null
          id?: string
          is_published?: boolean
          sort_order?: number
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_videos_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "course_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_videos_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          cover_url: string | null
          created_at: string
          description_ar: string | null
          description_en: string | null
          id: string
          is_published: boolean
          slug: string
          title_ar: string
          title_en: string
          updated_at: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          is_published?: boolean
          slug: string
          title_ar: string
          title_en: string
          updated_at?: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          is_published?: boolean
          slug?: string
          title_ar?: string
          title_en?: string
          updated_at?: string
        }
        Relationships: []
      }
      custom_flashcards: {
        Row: {
          answer: string
          approved: boolean
          chapter: string
          created_at: string
          created_by: string | null
          id: string
          language: string
          question: string
          subject: string
        }
        Insert: {
          answer: string
          approved?: boolean
          chapter: string
          created_at?: string
          created_by?: string | null
          id?: string
          language?: string
          question: string
          subject: string
        }
        Update: {
          answer?: string
          approved?: boolean
          chapter?: string
          created_at?: string
          created_by?: string | null
          id?: string
          language?: string
          question?: string
          subject?: string
        }
        Relationships: []
      }
      daily_games: {
        Row: {
          day: number
          engine: string
          month_key: string
          spec: Json
          subject: string
          updated_at: string
        }
        Insert: {
          day: number
          engine: string
          month_key: string
          spec?: Json
          subject: string
          updated_at?: string
        }
        Update: {
          day?: number
          engine?: string
          month_key?: string
          spec?: Json
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      daily_reports: {
        Row: {
          ai_plan: Json | null
          ai_strengths: Json | null
          ai_summary: string | null
          ai_weaknesses: Json | null
          created_at: string
          focused_minutes: number
          id: string
          language: string
          missions_completed: number
          points_earned: number
          report_date: string
          sessions_count: number
          subjects_breakdown: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_plan?: Json | null
          ai_strengths?: Json | null
          ai_summary?: string | null
          ai_weaknesses?: Json | null
          created_at?: string
          focused_minutes?: number
          id?: string
          language?: string
          missions_completed?: number
          points_earned?: number
          report_date: string
          sessions_count?: number
          subjects_breakdown?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_plan?: Json | null
          ai_strengths?: Json | null
          ai_summary?: string | null
          ai_weaknesses?: Json | null
          created_at?: string
          focused_minutes?: number
          id?: string
          language?: string
          missions_completed?: number
          points_earned?: number
          report_date?: string
          sessions_count?: number
          subjects_breakdown?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      feature_usage: {
        Row: {
          created_at: string
          feature: string
          id: string
          used_on: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feature: string
          id?: string
          used_on?: string
          user_id: string
        }
        Update: {
          created_at?: string
          feature?: string
          id?: string
          used_on?: string
          user_id?: string
        }
        Relationships: []
      }
      mission_progress: {
        Row: {
          completed: boolean
          created_at: string
          id: string
          subject: string
          topic_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          id?: string
          subject: string
          topic_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          id?: string
          subject?: string
          topic_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      news: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          id: string
          image_path: string | null
          link: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          image_path?: string | null
          link?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          image_path?: string | null
          link?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      notebooks: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          name: string
          position: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          position?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          position?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          content: Json
          created_at: string
          icon: string | null
          id: string
          notebook_id: string | null
          parent_id: string | null
          position: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: Json
          created_at?: string
          icon?: string | null
          id?: string
          notebook_id?: string | null
          parent_id?: string | null
          position?: number
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: Json
          created_at?: string
          icon?: string | null
          id?: string
          notebook_id?: string | null
          parent_id?: string | null
          position?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_notebook_id_fkey"
            columns: ["notebook_id"]
            isOneToOne: false
            referencedRelation: "notebooks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          id: string
          link: string | null
          title: string
        }
        Insert: {
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          link?: string | null
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          link?: string | null
          title?: string
        }
        Relationships: []
      }
      parent_follow_links: {
        Row: {
          access_code: string
          created_at: string
          enabled: boolean
          id: string
          parent_name: string | null
          revoked_at: string | null
          token: string
          user_id: string
        }
        Insert: {
          access_code?: string
          created_at?: string
          enabled?: boolean
          id?: string
          parent_name?: string | null
          revoked_at?: string | null
          token: string
          user_id: string
        }
        Update: {
          access_code?: string
          created_at?: string
          enabled?: boolean
          id?: string
          parent_name?: string | null
          revoked_at?: string | null
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_events: {
        Row: {
          created_at: string
          environment: string
          event_id: string | null
          event_type: string
          id: string
          paddle_customer_id: string | null
          paddle_subscription_id: string | null
          payload: Json
          user_id: string | null
        }
        Insert: {
          created_at?: string
          environment?: string
          event_id?: string | null
          event_type: string
          id?: string
          paddle_customer_id?: string | null
          paddle_subscription_id?: string | null
          payload: Json
          user_id?: string | null
        }
        Update: {
          created_at?: string
          environment?: string
          event_id?: string | null
          event_type?: string
          id?: string
          paddle_customer_id?: string | null
          paddle_subscription_id?: string | null
          payload?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      poll_option_requests: {
        Row: {
          created_at: string
          guest_key: string | null
          id: string
          image_path: string | null
          label: string
          poll_id: string
          requested_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          guest_key?: string | null
          id?: string
          image_path?: string | null
          label: string
          poll_id: string
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          guest_key?: string | null
          id?: string
          image_path?: string | null
          label?: string
          poll_id?: string
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_option_requests_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_options: {
        Row: {
          created_at: string
          created_by: string | null
          guest_key: string | null
          id: string
          image_path: string | null
          label: string
          poll_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          guest_key?: string | null
          id?: string
          image_path?: string | null
          label: string
          poll_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          guest_key?: string | null
          id?: string
          image_path?: string | null
          label?: string
          poll_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "poll_options_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          created_at: string
          guest_key: string | null
          id: string
          option_id: string
          poll_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          guest_key?: string | null
          id?: string
          option_id: string
          poll_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          guest_key?: string | null
          id?: string
          option_id?: string
          poll_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          question: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          question: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          question?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          character: Json | null
          created_at: string
          display_name: string
          gender: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          character?: Json | null
          created_at?: string
          display_name?: string
          gender?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          character?: Json | null
          created_at?: string
          display_name?: string
          gender?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      psych_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      request_rate_limits: {
        Row: {
          feature: string
          id: string
          requested_at: string
          user_id: string
        }
        Insert: {
          feature: string
          id?: string
          requested_at?: string
          user_id: string
        }
        Update: {
          feature?: string
          id?: string
          requested_at?: string
          user_id?: string
        }
        Relationships: []
      }
      site_stats: {
        Row: {
          count: number
          id: string
          updated_at: string
        }
        Insert: {
          count?: number
          id: string
          updated_at?: string
        }
        Update: {
          count?: number
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      student_profile: {
        Row: {
          created_at: string
          exam_date: string | null
          onboarded: boolean
          study_window: string | null
          target_grade: number | null
          track: string | null
          updated_at: string
          user_id: string
          weak_subjects: string[] | null
          weekly_goal_hours: number | null
        }
        Insert: {
          created_at?: string
          exam_date?: string | null
          onboarded?: boolean
          study_window?: string | null
          target_grade?: number | null
          track?: string | null
          updated_at?: string
          user_id: string
          weak_subjects?: string[] | null
          weekly_goal_hours?: number | null
        }
        Update: {
          created_at?: string
          exam_date?: string | null
          onboarded?: boolean
          study_window?: string | null
          target_grade?: number | null
          track?: string | null
          updated_at?: string
          user_id?: string
          weak_subjects?: string[] | null
          weekly_goal_hours?: number | null
        }
        Relationships: []
      }
      student_todos: {
        Row: {
          items: Json
          updated_at: string
          user_id: string
          week_key: string | null
        }
        Insert: {
          items?: Json
          updated_at?: string
          user_id: string
          week_key?: string | null
        }
        Update: {
          items?: Json
          updated_at?: string
          user_id?: string
          week_key?: string | null
        }
        Relationships: []
      }
      study_sessions: {
        Row: {
          created_at: string
          duration_seconds: number
          id: string
          mission: string
          mission_completed: boolean
          points: number
          subject: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number
          id?: string
          mission: string
          mission_completed?: boolean
          points?: number
          subject: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number
          id?: string
          mission?: string
          mission_completed?: boolean
          points?: number
          subject?: string
          user_id?: string
        }
        Relationships: []
      }
      subject_file_text: {
        Row: {
          chapter: string
          char_count: number
          file_name: string
          id: string
          subject: string
          text: string
          updated_at: string
        }
        Insert: {
          chapter?: string
          char_count?: number
          file_name: string
          id?: string
          subject: string
          text?: string
          updated_at?: string
        }
        Update: {
          chapter?: string
          char_count?: number
          file_name?: string
          id?: string
          subject?: string
          text?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          paddle_customer_id: string
          paddle_subscription_id: string
          price_id: string
          product_id: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          paddle_customer_id: string
          paddle_subscription_id: string
          price_id: string
          product_id: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          paddle_customer_id?: string
          paddle_subscription_id?: string
          price_id?: string
          product_id?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      summaries: {
        Row: {
          approved: boolean
          created_at: string
          description: string | null
          file_path: string
          file_size: number
          id: string
          mime_type: string | null
          name: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approved?: boolean
          created_at?: string
          description?: string | null
          file_path: string
          file_size?: number
          id?: string
          mime_type?: string | null
          name: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approved?: boolean
          created_at?: string
          description?: string | null
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string | null
          name?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      summary_likes: {
        Row: {
          created_at: string
          id: string
          summary_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          summary_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          summary_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "summary_likes_summary_id_fkey"
            columns: ["summary_id"]
            isOneToOne: false
            referencedRelation: "summaries"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_mcq_pending_changes: {
        Row: {
          action: string
          created_at: string
          id: string
          new_question: Json | null
          question_index: number | null
          requested_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          teacher_id: string
          topic_key: string
          updated_at: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_question?: Json | null
          question_index?: number | null
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          teacher_id: string
          topic_key: string
          updated_at?: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_question?: Json | null
          question_index?: number | null
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          teacher_id?: string
          topic_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      teacher_topic_mcqs: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          questions: Json
          teacher_id: string
          title: string
          topic_key: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          questions: Json
          teacher_id: string
          title?: string
          topic_key: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          questions?: Json
          teacher_id?: string
          title?: string
          topic_key?: string
        }
        Relationships: []
      }
      teacher_topic_videos: {
        Row: {
          approved: boolean
          created_at: string
          created_by: string | null
          id: string
          notes_parts: Json
          teacher_id: string
          title: string | null
          topic_key: string
          transcript: string | null
          updated_at: string
          video_id: string | null
          youtube_url: string
        }
        Insert: {
          approved?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          notes_parts?: Json
          teacher_id: string
          title?: string | null
          topic_key: string
          transcript?: string | null
          updated_at?: string
          video_id?: string | null
          youtube_url: string
        }
        Update: {
          approved?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          notes_parts?: Json
          teacher_id?: string
          title?: string | null
          topic_key?: string
          transcript?: string | null
          updated_at?: string
          video_id?: string | null
          youtube_url?: string
        }
        Relationships: []
      }
      telegram_notifications_sent: {
        Row: {
          id: string
          notification_key: string
          sent_at: string
          telegram_user_id: number
        }
        Insert: {
          id?: string
          notification_key: string
          sent_at?: string
          telegram_user_id: number
        }
        Update: {
          id?: string
          notification_key?: string
          sent_at?: string
          telegram_user_id?: number
        }
        Relationships: []
      }
      telegram_verifications: {
        Row: {
          created_at: string
          last_checked_at: string | null
          last_error: string | null
          telegram_user_id: number | null
          telegram_username: string | null
          token: string
          updated_at: string
          user_id: string
          verified: boolean
        }
        Insert: {
          created_at?: string
          last_checked_at?: string | null
          last_error?: string | null
          telegram_user_id?: number | null
          telegram_username?: string | null
          token: string
          updated_at?: string
          user_id: string
          verified?: boolean
        }
        Update: {
          created_at?: string
          last_checked_at?: string | null
          last_error?: string | null
          telegram_user_id?: number | null
          telegram_username?: string | null
          token?: string
          updated_at?: string
          user_id?: string
          verified?: boolean
        }
        Relationships: []
      }
      user_points: {
        Row: {
          created_at: string
          id: string
          points: number
          ref_id: string | null
          source: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          points: number
          ref_id?: string | null
          source: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          points?: number
          ref_id?: string | null
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      username_requests: {
        Row: {
          created_at: string
          current_name: string | null
          id: string
          requested_name: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_name?: string | null
          id?: string
          requested_name: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_name?: string | null
          id?: string
          requested_name?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      award_points_safe: {
        Args: { _points: number; _ref_id?: string; _source: string }
        Returns: string
      }
      check_rate_limit: {
        Args: {
          _feature: string
          _max_requests?: number
          _window_seconds?: number
        }
        Returns: boolean
      }
      claim_daily_feature: { Args: { _feature: string }; Returns: boolean }
      feature_usage_today: { Args: { _feature: string }; Returns: number }
      get_exam_answer_path: { Args: { _exam_id: string }; Returns: string }
      has_active_premium: {
        Args: { check_env?: string; user_uuid: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_site_visits: { Args: never; Returns: number }
      is_course_enrolled: { Args: { _course: string }; Returns: boolean }
      is_course_teacher: { Args: { _course: string }; Returns: boolean }
      list_subject_chapters: {
        Args: { _subject: string }
        Returns: {
          chapter: string
          has_files: boolean
        }[]
      }
      my_poll_vote: {
        Args: { _guest_key?: string; _poll_id: string }
        Returns: string
      }
      poll_vote_counts: {
        Args: { _poll_id: string }
        Returns: {
          option_id: string
          votes: number
        }[]
      }
      set_site_visits: { Args: { _count: number }; Returns: number }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
