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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          content: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          is_published: boolean
          priority: string | null
          published_at: string | null
          starts_at: string | null
          target_id: string | null
          target_role: Database["public"]["Enums"]["app_role"] | null
          target_type: string
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          is_published?: boolean
          priority?: string | null
          published_at?: string | null
          starts_at?: string | null
          target_id?: string | null
          target_role?: Database["public"]["Enums"]["app_role"] | null
          target_type?: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          is_published?: boolean
          priority?: string | null
          published_at?: string | null
          starts_at?: string | null
          target_id?: string | null
          target_role?: Database["public"]["Enums"]["app_role"] | null
          target_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      assignment_submissions: {
        Row: {
          assignment_id: string
          content: string | null
          created_at: string
          feedback: string | null
          file_name: string | null
          file_url: string | null
          graded_at: string | null
          graded_by: string | null
          id: string
          score: number | null
          status: string | null
          submitted_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assignment_id: string
          content?: string | null
          created_at?: string
          feedback?: string | null
          file_name?: string | null
          file_url?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          score?: number | null
          status?: string | null
          submitted_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assignment_id?: string
          content?: string | null
          created_at?: string
          feedback?: string | null
          file_name?: string | null
          file_url?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          score?: number | null
          status?: string | null
          submitted_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          allow_late_submission: boolean | null
          created_at: string
          description: string | null
          due_date: string | null
          file_types_allowed: string[] | null
          id: string
          instructions: string | null
          lesson_id: string
          max_file_size_mb: number | null
          max_score: number | null
          title: string
          updated_at: string
        }
        Insert: {
          allow_late_submission?: boolean | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          file_types_allowed?: string[] | null
          id?: string
          instructions?: string | null
          lesson_id: string
          max_file_size_mb?: number | null
          max_score?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          allow_late_submission?: boolean | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          file_types_allowed?: string[] | null
          id?: string
          instructions?: string | null
          lesson_id?: string
          max_file_size_mb?: number | null
          max_score?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      batch_curriculum: {
        Row: {
          batch_id: string
          created_at: string
          id: string
          is_additional: boolean | null
          module_id: string | null
          order_index: number | null
        }
        Insert: {
          batch_id: string
          created_at?: string
          id?: string
          is_additional?: boolean | null
          module_id?: string | null
          order_index?: number | null
        }
        Update: {
          batch_id?: string
          created_at?: string
          id?: string
          is_additional?: boolean | null
          module_id?: string | null
          order_index?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "batch_curriculum_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_curriculum_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_enrollments: {
        Row: {
          batch_id: string
          enrolled_at: string
          id: string
          status: string | null
          user_id: string
        }
        Insert: {
          batch_id: string
          enrolled_at?: string
          id?: string
          status?: string | null
          user_id: string
        }
        Update: {
          batch_id?: string
          enrolled_at?: string
          id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "batch_enrollments_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
        ]
      }
      batches: {
        Row: {
          course_id: string
          created_at: string
          created_by: string
          curriculum_id: string | null
          description: string | null
          end_date: string | null
          google_drive_folder_id: string | null
          google_drive_folder_url: string | null
          id: string
          instructor_id: string | null
          max_students: number | null
          name: string
          start_date: string
          status: string | null
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          created_by: string
          curriculum_id?: string | null
          description?: string | null
          end_date?: string | null
          google_drive_folder_id?: string | null
          google_drive_folder_url?: string | null
          id?: string
          instructor_id?: string | null
          max_students?: number | null
          name: string
          start_date: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          created_by?: string
          curriculum_id?: string | null
          description?: string | null
          end_date?: string | null
          google_drive_folder_id?: string | null
          google_drive_folder_url?: string | null
          id?: string
          instructor_id?: string | null
          max_students?: number | null
          name?: string
          start_date?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "batches_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batches_curriculum_id_fkey"
            columns: ["curriculum_id"]
            isOneToOne: false
            referencedRelation: "curriculums"
            referencedColumns: ["id"]
          },
        ]
      }
      bookmarks: {
        Row: {
          created_at: string
          id: string
          lesson_id: string
          note: string | null
          timestamp_seconds: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lesson_id: string
          note?: string | null
          timestamp_seconds?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lesson_id?: string
          note?: string | null
          timestamp_seconds?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          batch_id: string | null
          color: string | null
          course_id: string | null
          created_at: string
          created_by: string
          description: string | null
          end_time: string | null
          event_type: string
          id: string
          is_all_day: boolean | null
          reference_id: string | null
          start_time: string
          title: string
          updated_at: string
        }
        Insert: {
          batch_id?: string | null
          color?: string | null
          course_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          end_time?: string | null
          event_type: string
          id?: string
          is_all_day?: boolean | null
          reference_id?: string | null
          start_time: string
          title: string
          updated_at?: string
        }
        Update: {
          batch_id?: string | null
          color?: string | null
          course_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          end_time?: string | null
          event_type?: string
          id?: string
          is_all_day?: boolean | null
          reference_id?: string | null
          start_time?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          order_index: number | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          order_index?: number | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          order_index?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      coupon_usage: {
        Row: {
          coupon_id: string
          course_id: string | null
          discount_applied: number
          enrollment_id: string | null
          final_price: number
          id: string
          original_price: number
          used_at: string
          user_id: string
        }
        Insert: {
          coupon_id: string
          course_id?: string | null
          discount_applied?: number
          enrollment_id?: string | null
          final_price?: number
          id?: string
          original_price?: number
          used_at?: string
          user_id: string
        }
        Update: {
          coupon_id?: string
          course_id?: string | null
          discount_applied?: number
          enrollment_id?: string | null
          final_price?: number
          id?: string
          original_price?: number
          used_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_usage_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_usage_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_usage_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          applicable_to: string
          code: string
          coupon_type: string
          course_id: string | null
          created_at: string
          created_by: string
          description: string | null
          discount_type: string
          discount_value: number
          expiry_date: string | null
          id: string
          is_active: boolean
          max_discount_limit: number | null
          max_total_usage: number | null
          min_purchase_amount: number | null
          name: string
          per_user_limit: number | null
          start_date: string
          updated_at: string
        }
        Insert: {
          applicable_to?: string
          code: string
          coupon_type?: string
          course_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          expiry_date?: string | null
          id?: string
          is_active?: boolean
          max_discount_limit?: number | null
          max_total_usage?: number | null
          min_purchase_amount?: number | null
          name: string
          per_user_limit?: number | null
          start_date?: string
          updated_at?: string
        }
        Update: {
          applicable_to?: string
          code?: string
          coupon_type?: string
          course_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          expiry_date?: string | null
          id?: string
          is_active?: boolean
          max_discount_limit?: number | null
          max_total_usage?: number | null
          min_purchase_amount?: number | null
          name?: string
          per_user_limit?: number | null
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_analytics: {
        Row: {
          avg_progress: number | null
          completions: number | null
          course_id: string
          created_at: string
          date: string
          enrollments: number | null
          id: string
          revenue: number | null
          updated_at: string
          views: number | null
        }
        Insert: {
          avg_progress?: number | null
          completions?: number | null
          course_id: string
          created_at?: string
          date?: string
          enrollments?: number | null
          id?: string
          revenue?: number | null
          updated_at?: string
          views?: number | null
        }
        Update: {
          avg_progress?: number | null
          completions?: number | null
          course_id?: string
          created_at?: string
          date?: string
          enrollments?: number | null
          id?: string
          revenue?: number | null
          updated_at?: string
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "course_analytics_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_categories: {
        Row: {
          category_id: string
          course_id: string
          created_at: string
          id: string
        }
        Insert: {
          category_id: string
          course_id: string
          created_at?: string
          id?: string
        }
        Update: {
          category_id?: string
          course_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_categories_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_materials: {
        Row: {
          created_at: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          lesson_id: string
          title: string
        }
        Insert: {
          created_at?: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          lesson_id: string
          title: string
        }
        Update: {
          created_at?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          lesson_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_materials_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      course_reviews: {
        Row: {
          course_id: string
          created_at: string
          id: string
          rating: number
          review: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          rating: number
          review?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          rating?: number
          review?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_reviews_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          approval_notes: string | null
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          category: string | null
          course_type: string
          created_at: string
          curriculum_id: string | null
          description: string | null
          difficulty_level: string | null
          duration_hours: number | null
          id: string
          instructor_id: string
          is_published: boolean | null
          key_highlights: string[] | null
          price: number | null
          program_overview: string | null
          requirements: string[] | null
          skills_developed: string[] | null
          thumbnail_url: string | null
          title: string
          tools_covered: string[] | null
          updated_at: string
          what_you_will_learn: string[] | null
        }
        Insert: {
          approval_notes?: string | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          category?: string | null
          course_type?: string
          created_at?: string
          curriculum_id?: string | null
          description?: string | null
          difficulty_level?: string | null
          duration_hours?: number | null
          id?: string
          instructor_id: string
          is_published?: boolean | null
          key_highlights?: string[] | null
          price?: number | null
          program_overview?: string | null
          requirements?: string[] | null
          skills_developed?: string[] | null
          thumbnail_url?: string | null
          title: string
          tools_covered?: string[] | null
          updated_at?: string
          what_you_will_learn?: string[] | null
        }
        Update: {
          approval_notes?: string | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          category?: string | null
          course_type?: string
          created_at?: string
          curriculum_id?: string | null
          description?: string | null
          difficulty_level?: string | null
          duration_hours?: number | null
          id?: string
          instructor_id?: string
          is_published?: boolean | null
          key_highlights?: string[] | null
          price?: number | null
          program_overview?: string | null
          requirements?: string[] | null
          skills_developed?: string[] | null
          thumbnail_url?: string | null
          title?: string
          tools_covered?: string[] | null
          updated_at?: string
          what_you_will_learn?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_curriculum_id_fkey"
            columns: ["curriculum_id"]
            isOneToOne: false
            referencedRelation: "curriculums"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculums: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          approval_notes: string | null
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          batch_id: string | null
          completed_at: string | null
          coupon_id: string | null
          course_id: string
          discount_amount: number | null
          enrolled_at: string
          id: string
          payment_amount: number | null
          payment_date: string | null
          payment_id: string | null
          payment_method: string | null
          payment_status: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          approval_notes?: string | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          batch_id?: string | null
          completed_at?: string | null
          coupon_id?: string | null
          course_id: string
          discount_amount?: number | null
          enrolled_at?: string
          id?: string
          payment_amount?: number | null
          payment_date?: string | null
          payment_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          approval_notes?: string | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          batch_id?: string | null
          completed_at?: string | null
          coupon_id?: string | null
          course_id?: string
          discount_amount?: number | null
          enrolled_at?: string
          id?: string
          payment_amount?: number | null
          payment_date?: string | null
          payment_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_assignment_submissions: {
        Row: {
          assignment_id: string
          content: string | null
          created_at: string
          feedback: string | null
          file_name: string | null
          file_url: string | null
          graded_at: string | null
          graded_by: string | null
          id: string
          score: number | null
          status: string | null
          submitted_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assignment_id: string
          content?: string | null
          created_at?: string
          feedback?: string | null
          file_name?: string | null
          file_url?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          score?: number | null
          status?: string | null
          submitted_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assignment_id?: string
          content?: string | null
          created_at?: string
          feedback?: string | null
          file_name?: string | null
          file_url?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          score?: number | null
          status?: string | null
          submitted_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "exam_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_assignments: {
        Row: {
          allow_late_submission: boolean | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          file_name: string | null
          file_types_allowed: string[] | null
          file_url: string | null
          id: string
          instructions: string | null
          is_live: boolean
          max_file_size_mb: number | null
          max_score: number | null
          title: string
          updated_at: string
        }
        Insert: {
          allow_late_submission?: boolean | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          file_name?: string | null
          file_types_allowed?: string[] | null
          file_url?: string | null
          id?: string
          instructions?: string | null
          is_live?: boolean
          max_file_size_mb?: number | null
          max_score?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          allow_late_submission?: boolean | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          file_name?: string | null
          file_types_allowed?: string[] | null
          file_url?: string | null
          id?: string
          instructions?: string | null
          is_live?: boolean
          max_file_size_mb?: number | null
          max_score?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      exam_quiz_assignments: {
        Row: {
          assignment_type: string
          created_at: string
          created_by: string
          due_date: string | null
          id: string
          is_active: boolean | null
          quiz_id: string
          scheduled_at: string | null
          target_id: string | null
          updated_at: string
        }
        Insert: {
          assignment_type: string
          created_at?: string
          created_by: string
          due_date?: string | null
          id?: string
          is_active?: boolean | null
          quiz_id: string
          scheduled_at?: string | null
          target_id?: string | null
          updated_at?: string
        }
        Update: {
          assignment_type?: string
          created_at?: string
          created_by?: string
          due_date?: string | null
          id?: string
          is_active?: boolean | null
          quiz_id?: string
          scheduled_at?: string | null
          target_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_quiz_assignments_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "exam_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_quiz_attempts: {
        Row: {
          answers: Json | null
          completed_at: string | null
          id: string
          max_score: number | null
          passed: boolean | null
          quiz_id: string
          score: number | null
          started_at: string
          user_id: string
        }
        Insert: {
          answers?: Json | null
          completed_at?: string | null
          id?: string
          max_score?: number | null
          passed?: boolean | null
          quiz_id: string
          score?: number | null
          started_at?: string
          user_id: string
        }
        Update: {
          answers?: Json | null
          completed_at?: string | null
          id?: string
          max_score?: number | null
          passed?: boolean | null
          quiz_id?: string
          score?: number | null
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "exam_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_quiz_questions: {
        Row: {
          correct_answer: string
          created_at: string
          id: string
          options: Json | null
          order_index: number | null
          points: number | null
          question: string
          question_type: string | null
          quiz_id: string
        }
        Insert: {
          correct_answer: string
          created_at?: string
          id?: string
          options?: Json | null
          order_index?: number | null
          points?: number | null
          question: string
          question_type?: string | null
          quiz_id: string
        }
        Update: {
          correct_answer?: string
          created_at?: string
          id?: string
          options?: Json | null
          order_index?: number | null
          points?: number | null
          question?: string
          question_type?: string | null
          quiz_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "exam_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_quizzes: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_live: boolean
          max_attempts: number | null
          passing_score: number | null
          time_limit_minutes: number | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_live?: boolean
          max_attempts?: number | null
          passing_score?: number | null
          time_limit_minutes?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_live?: boolean
          max_attempts?: number | null
          passing_score?: number | null
          time_limit_minutes?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      exam_task_assignments: {
        Row: {
          assignment_id: string
          assignment_type: string
          created_at: string
          created_by: string
          due_date: string | null
          id: string
          is_active: boolean | null
          scheduled_at: string | null
          target_id: string | null
          updated_at: string
        }
        Insert: {
          assignment_id: string
          assignment_type: string
          created_at?: string
          created_by: string
          due_date?: string | null
          id?: string
          is_active?: boolean | null
          scheduled_at?: string | null
          target_id?: string | null
          updated_at?: string
        }
        Update: {
          assignment_id?: string
          assignment_type?: string
          created_at?: string
          created_by?: string
          due_date?: string | null
          id?: string
          is_active?: boolean | null
          scheduled_at?: string | null
          target_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_task_assignments_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "exam_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_invoices: {
        Row: {
          course_id: string
          created_at: string
          currency: string
          enrollment_date: string
          enrollment_id: string
          id: string
          invoice_date: string
          invoice_number: string
          notes: string | null
          total_fees: number
          updated_at: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          currency?: string
          enrollment_date?: string
          enrollment_id: string
          id?: string
          invoice_date?: string
          invoice_number: string
          notes?: string | null
          total_fees?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          currency?: string
          enrollment_date?: string
          enrollment_id?: string
          id?: string
          invoice_date?: string
          invoice_number?: string
          notes?: string | null
          total_fees?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_invoices_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: true
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          invoice_id: string
          notes: string | null
          paid_on: string
          payment_method: string
          reference_no: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id: string
          notes?: string | null
          paid_on?: string
          payment_method?: string
          reference_no?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string
          notes?: string | null
          paid_on?: string
          payment_method?: string
          reference_no?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "finance_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      google_drive_attachments: {
        Row: {
          created_at: string
          created_by: string
          entity_id: string
          entity_type: string
          file_id: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          mime_type: string | null
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          entity_id: string
          entity_type: string
          file_id: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          mime_type?: string | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          entity_id?: string
          entity_type?: string
          file_id?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          mime_type?: string | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      jr_assignment_submissions: {
        Row: {
          assignment_id: string
          content: string | null
          created_at: string
          feedback: string | null
          file_name: string | null
          file_url: string | null
          graded_at: string | null
          graded_by: string | null
          id: string
          score: number | null
          status: string | null
          submitted_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assignment_id: string
          content?: string | null
          created_at?: string
          feedback?: string | null
          file_name?: string | null
          file_url?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          score?: number | null
          status?: string | null
          submitted_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assignment_id?: string
          content?: string | null
          created_at?: string
          feedback?: string | null
          file_name?: string | null
          file_url?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          score?: number | null
          status?: string | null
          submitted_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jr_assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "jr_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      jr_assignments: {
        Row: {
          allow_late_submission: boolean | null
          course_id: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          file_name: string | null
          file_types_allowed: string[] | null
          file_url: string | null
          id: string
          instructions: string | null
          is_live: boolean
          lesson_id: string | null
          max_file_size_mb: number | null
          max_score: number | null
          title: string
          updated_at: string
        }
        Insert: {
          allow_late_submission?: boolean | null
          course_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          file_name?: string | null
          file_types_allowed?: string[] | null
          file_url?: string | null
          id?: string
          instructions?: string | null
          is_live?: boolean
          lesson_id?: string | null
          max_file_size_mb?: number | null
          max_score?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          allow_late_submission?: boolean | null
          course_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          file_name?: string | null
          file_types_allowed?: string[] | null
          file_url?: string | null
          id?: string
          instructions?: string | null
          is_live?: boolean
          lesson_id?: string | null
          max_file_size_mb?: number | null
          max_score?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jr_assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "jr_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jr_assignments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "jr_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      jr_categories: {
        Row: {
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          order_index: number | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          order_index?: number | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          order_index?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      jr_course_materials: {
        Row: {
          created_at: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          lesson_id: string
          title: string
        }
        Insert: {
          created_at?: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          lesson_id: string
          title: string
        }
        Update: {
          created_at?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          lesson_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "jr_course_materials_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "jr_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      jr_courses: {
        Row: {
          approval_notes: string | null
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          category_id: string | null
          created_at: string
          created_by: string
          description: string | null
          difficulty: string | null
          duration_hours: number | null
          grade_level: string | null
          id: string
          is_published: boolean | null
          key_highlights: string[] | null
          price: number | null
          program_overview: string | null
          requirements: string[] | null
          skills_developed: string[] | null
          thumbnail_url: string | null
          title: string
          tools_covered: string[] | null
          updated_at: string
          what_you_will_learn: string[] | null
        }
        Insert: {
          approval_notes?: string | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          category_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          difficulty?: string | null
          duration_hours?: number | null
          grade_level?: string | null
          id?: string
          is_published?: boolean | null
          key_highlights?: string[] | null
          price?: number | null
          program_overview?: string | null
          requirements?: string[] | null
          skills_developed?: string[] | null
          thumbnail_url?: string | null
          title: string
          tools_covered?: string[] | null
          updated_at?: string
          what_you_will_learn?: string[] | null
        }
        Update: {
          approval_notes?: string | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          difficulty?: string | null
          duration_hours?: number | null
          grade_level?: string | null
          id?: string
          is_published?: boolean | null
          key_highlights?: string[] | null
          price?: number | null
          program_overview?: string | null
          requirements?: string[] | null
          skills_developed?: string[] | null
          thumbnail_url?: string | null
          title?: string
          tools_covered?: string[] | null
          updated_at?: string
          what_you_will_learn?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "jr_courses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "jr_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      jr_enrollments: {
        Row: {
          approval_notes: string | null
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          completed_at: string | null
          course_id: string
          enrolled_at: string
          id: string
          payment_amount: number | null
          payment_date: string | null
          payment_id: string | null
          payment_method: string | null
          payment_status: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          approval_notes?: string | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          course_id: string
          enrolled_at?: string
          id?: string
          payment_amount?: number | null
          payment_date?: string | null
          payment_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          approval_notes?: string | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          course_id?: string
          enrolled_at?: string
          id?: string
          payment_amount?: number | null
          payment_date?: string | null
          payment_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jr_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "jr_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      jr_lesson_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          is_completed: boolean | null
          lesson_id: string
          progress_percent: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean | null
          lesson_id: string
          progress_percent?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean | null
          lesson_id?: string
          progress_percent?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jr_lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "jr_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      jr_lessons: {
        Row: {
          content: string | null
          created_at: string
          duration_minutes: number | null
          id: string
          is_free: boolean | null
          module_id: string | null
          order_index: number | null
          sub_module_id: string | null
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          is_free?: boolean | null
          module_id?: string | null
          order_index?: number | null
          sub_module_id?: string | null
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          is_free?: boolean | null
          module_id?: string | null
          order_index?: number | null
          sub_module_id?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jr_lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "jr_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jr_lessons_sub_module_id_fkey"
            columns: ["sub_module_id"]
            isOneToOne: false
            referencedRelation: "jr_sub_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      jr_modules: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          id: string
          order_index: number | null
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          order_index?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          order_index?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jr_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "jr_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      jr_profiles: {
        Row: {
          avatar_url: string | null
          city: string | null
          created_at: string
          date_of_birth: string | null
          email: string
          full_name: string | null
          grade: string | null
          id: string
          parent_email: string | null
          parent_name: string | null
          parent_phone: string | null
          school_name: string | null
          state: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          email: string
          full_name?: string | null
          grade?: string | null
          id?: string
          parent_email?: string | null
          parent_name?: string | null
          parent_phone?: string | null
          school_name?: string | null
          state?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string
          full_name?: string | null
          grade?: string | null
          id?: string
          parent_email?: string | null
          parent_name?: string | null
          parent_phone?: string | null
          school_name?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      jr_quiz_attempts: {
        Row: {
          answers: Json | null
          completed_at: string | null
          id: string
          max_score: number | null
          passed: boolean | null
          quiz_id: string
          score: number | null
          started_at: string
          user_id: string
        }
        Insert: {
          answers?: Json | null
          completed_at?: string | null
          id?: string
          max_score?: number | null
          passed?: boolean | null
          quiz_id: string
          score?: number | null
          started_at?: string
          user_id: string
        }
        Update: {
          answers?: Json | null
          completed_at?: string | null
          id?: string
          max_score?: number | null
          passed?: boolean | null
          quiz_id?: string
          score?: number | null
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jr_quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "jr_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      jr_quiz_questions: {
        Row: {
          correct_answer: string
          created_at: string
          id: string
          options: Json | null
          order_index: number | null
          points: number | null
          question: string
          question_type: string | null
          quiz_id: string
        }
        Insert: {
          correct_answer: string
          created_at?: string
          id?: string
          options?: Json | null
          order_index?: number | null
          points?: number | null
          question: string
          question_type?: string | null
          quiz_id: string
        }
        Update: {
          correct_answer?: string
          created_at?: string
          id?: string
          options?: Json | null
          order_index?: number | null
          points?: number | null
          question?: string
          question_type?: string | null
          quiz_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jr_quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "jr_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      jr_quizzes: {
        Row: {
          course_id: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_live: boolean
          lesson_id: string | null
          max_attempts: number | null
          passing_score: number | null
          time_limit_minutes: number | null
          title: string
          updated_at: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_live?: boolean
          lesson_id?: string | null
          max_attempts?: number | null
          passing_score?: number | null
          time_limit_minutes?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_live?: boolean
          lesson_id?: string | null
          max_attempts?: number | null
          passing_score?: number | null
          time_limit_minutes?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jr_quizzes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "jr_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jr_quizzes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "jr_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      jr_sub_modules: {
        Row: {
          created_at: string
          description: string | null
          id: string
          module_id: string
          order_index: number | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          module_id: string
          order_index?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          module_id?: string
          order_index?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jr_sub_modules_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "jr_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          lesson_id: string
          timestamp_seconds: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          lesson_id: string
          timestamp_seconds?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          lesson_id?: string
          timestamp_seconds?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_notes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          is_completed: boolean | null
          lesson_id: string
          progress_percent: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean | null
          lesson_id: string
          progress_percent?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean | null
          lesson_id?: string
          progress_percent?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          content: string | null
          created_at: string
          duration_minutes: number | null
          google_drive_folder_id: string | null
          google_drive_folder_url: string | null
          id: string
          is_free: boolean | null
          module_id: string
          order_index: number | null
          recorded_video_url: string | null
          requires_quiz_pass: boolean | null
          sub_module_id: string | null
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          duration_minutes?: number | null
          google_drive_folder_id?: string | null
          google_drive_folder_url?: string | null
          id?: string
          is_free?: boolean | null
          module_id: string
          order_index?: number | null
          recorded_video_url?: string | null
          requires_quiz_pass?: boolean | null
          sub_module_id?: string | null
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          duration_minutes?: number | null
          google_drive_folder_id?: string | null
          google_drive_folder_url?: string | null
          id?: string
          is_free?: boolean | null
          module_id?: string
          order_index?: number | null
          recorded_video_url?: string | null
          requires_quiz_pass?: boolean | null
          sub_module_id?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_sub_module_id_fkey"
            columns: ["sub_module_id"]
            isOneToOne: false
            referencedRelation: "sub_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      live_class_schedules: {
        Row: {
          batch_id: string | null
          course_id: string
          created_at: string
          day_of_week: number
          description: string | null
          duration_minutes: number
          host_id: string
          id: string
          is_active: boolean
          platform: string
          start_time: string
          target_student_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          batch_id?: string | null
          course_id: string
          created_at?: string
          day_of_week: number
          description?: string | null
          duration_minutes?: number
          host_id: string
          id?: string
          is_active?: boolean
          platform?: string
          start_time: string
          target_student_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          batch_id?: string | null
          course_id?: string
          created_at?: string
          day_of_week?: number
          description?: string | null
          duration_minutes?: number
          host_id?: string
          id?: string
          is_active?: boolean
          platform?: string
          start_time?: string
          target_student_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_class_schedules_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_class_schedules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      live_classes: {
        Row: {
          batch_id: string | null
          course_id: string
          created_at: string
          description: string | null
          duration_minutes: number | null
          host_id: string
          id: string
          meeting_id: string | null
          meeting_url: string | null
          platform: string
          recording_url: string | null
          schedule_id: string | null
          scheduled_at: string
          status: string | null
          target_student_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          batch_id?: string | null
          course_id: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          host_id: string
          id?: string
          meeting_id?: string | null
          meeting_url?: string | null
          platform: string
          recording_url?: string | null
          schedule_id?: string | null
          scheduled_at: string
          status?: string | null
          target_student_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          batch_id?: string | null
          course_id?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          host_id?: string
          id?: string
          meeting_id?: string | null
          meeting_url?: string | null
          platform?: string
          recording_url?: string | null
          schedule_id?: string | null
          scheduled_at?: string
          status?: string | null
          target_student_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_classes_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_classes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_classes_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "live_class_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          course_id: string | null
          created_at: string
          curriculum_id: string | null
          description: string | null
          google_drive_folder_id: string | null
          google_drive_folder_url: string | null
          id: string
          order_index: number | null
          title: string
          updated_at: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          curriculum_id?: string | null
          description?: string | null
          google_drive_folder_id?: string | null
          google_drive_folder_url?: string | null
          id?: string
          order_index?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          curriculum_id?: string | null
          description?: string | null
          google_drive_folder_id?: string | null
          google_drive_folder_url?: string | null
          id?: string
          order_index?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modules_curriculum_id_fkey"
            columns: ["curriculum_id"]
            isOneToOne: false
            referencedRelation: "curriculums"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          link: string | null
          message: string
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          message: string
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          alt_phone: string | null
          area_of_study: string | null
          avatar_url: string | null
          bio: string | null
          city: string | null
          country: string | null
          created_at: string
          current_company: string | null
          current_designation: string | null
          date_of_birth: string | null
          email: string
          full_name: string | null
          gender: string | null
          gpa: string | null
          highest_qualification: string | null
          id: string
          phone: string | null
          state: string | null
          updated_at: string
          user_id: string
          year_of_completion: number | null
          years_of_experience: number | null
        }
        Insert: {
          alt_phone?: string | null
          area_of_study?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          current_company?: string | null
          current_designation?: string | null
          date_of_birth?: string | null
          email: string
          full_name?: string | null
          gender?: string | null
          gpa?: string | null
          highest_qualification?: string | null
          id?: string
          phone?: string | null
          state?: string | null
          updated_at?: string
          user_id: string
          year_of_completion?: number | null
          years_of_experience?: number | null
        }
        Update: {
          alt_phone?: string | null
          area_of_study?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          current_company?: string | null
          current_designation?: string | null
          date_of_birth?: string | null
          email?: string
          full_name?: string | null
          gender?: string | null
          gpa?: string | null
          highest_qualification?: string | null
          id?: string
          phone?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string
          year_of_completion?: number | null
          years_of_experience?: number | null
        }
        Relationships: []
      }
      question_bank: {
        Row: {
          category_id: string | null
          correct_answer: string | null
          created_at: string
          created_by: string
          difficulty: string | null
          explanation: string | null
          id: string
          is_active: boolean | null
          options: Json | null
          points: number | null
          question: string
          question_type: string
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          correct_answer?: string | null
          created_at?: string
          created_by: string
          difficulty?: string | null
          explanation?: string | null
          id?: string
          is_active?: boolean | null
          options?: Json | null
          points?: number | null
          question: string
          question_type: string
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          correct_answer?: string | null
          created_at?: string
          created_by?: string
          difficulty?: string | null
          explanation?: string | null
          id?: string
          is_active?: boolean | null
          options?: Json | null
          points?: number | null
          question?: string
          question_type?: string
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_bank_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "question_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      question_categories: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "question_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_assignments: {
        Row: {
          assignment_type: string
          created_at: string
          created_by: string
          due_date: string | null
          id: string
          is_active: boolean | null
          quiz_id: string
          scheduled_at: string | null
          target_id: string | null
          updated_at: string
        }
        Insert: {
          assignment_type: string
          created_at?: string
          created_by: string
          due_date?: string | null
          id?: string
          is_active?: boolean | null
          quiz_id: string
          scheduled_at?: string | null
          target_id?: string | null
          updated_at?: string
        }
        Update: {
          assignment_type?: string
          created_at?: string
          created_by?: string
          due_date?: string | null
          id?: string
          is_active?: boolean | null
          quiz_id?: string
          scheduled_at?: string | null
          target_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_assignments_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          answers: Json | null
          completed_at: string | null
          id: string
          max_score: number | null
          passed: boolean | null
          quiz_id: string
          score: number | null
          started_at: string
          user_id: string
        }
        Insert: {
          answers?: Json | null
          completed_at?: string | null
          id?: string
          max_score?: number | null
          passed?: boolean | null
          quiz_id: string
          score?: number | null
          started_at?: string
          user_id: string
        }
        Update: {
          answers?: Json | null
          completed_at?: string | null
          id?: string
          max_score?: number | null
          passed?: boolean | null
          quiz_id?: string
          score?: number | null
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          correct_answer: string
          created_at: string
          id: string
          options: Json | null
          order_index: number | null
          points: number | null
          question: string
          question_type: string | null
          quiz_id: string
        }
        Insert: {
          correct_answer: string
          created_at?: string
          id?: string
          options?: Json | null
          order_index?: number | null
          points?: number | null
          question: string
          question_type?: string | null
          quiz_id: string
        }
        Update: {
          correct_answer?: string
          created_at?: string
          id?: string
          options?: Json | null
          order_index?: number | null
          points?: number | null
          question?: string
          question_type?: string | null
          quiz_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          created_at: string
          description: string | null
          id: string
          lesson_id: string
          max_attempts: number | null
          passing_score: number | null
          time_limit_minutes: number | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          lesson_id: string
          max_attempts?: number | null
          passing_score?: number | null
          time_limit_minutes?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          lesson_id?: string
          max_attempts?: number | null
          passing_score?: number | null
          time_limit_minutes?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          reference_id: string | null
          reference_type: string | null
          scheduled_for: string
          sent_at: string | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message: string
          reference_id?: string | null
          reference_type?: string | null
          scheduled_for: string
          sent_at?: string | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          reference_id?: string | null
          reference_type?: string | null
          scheduled_for?: string
          sent_at?: string | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      selfpaced_assignment_submissions: {
        Row: {
          assignment_id: string
          feedback: string | null
          file_name: string | null
          file_url: string | null
          graded_at: string | null
          graded_by: string | null
          id: string
          score: number | null
          status: string
          submission_text: string | null
          submitted_at: string
          user_id: string
        }
        Insert: {
          assignment_id: string
          feedback?: string | null
          file_name?: string | null
          file_url?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          score?: number | null
          status?: string
          submission_text?: string | null
          submitted_at?: string
          user_id: string
        }
        Update: {
          assignment_id?: string
          feedback?: string | null
          file_name?: string | null
          file_url?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          score?: number | null
          status?: string
          submission_text?: string | null
          submitted_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "selfpaced_assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "selfpaced_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      selfpaced_assignments: {
        Row: {
          course_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          instructions: string | null
          is_active: boolean
          lesson_id: string | null
          max_points: number
          title: string
          updated_at: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean
          lesson_id?: string | null
          max_points?: number
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean
          lesson_id?: string | null
          max_points?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "selfpaced_assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "selfpaced_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "selfpaced_assignments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "selfpaced_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      selfpaced_cart_items: {
        Row: {
          added_at: string
          course_id: string
          id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          course_id: string
          id?: string
          user_id: string
        }
        Update: {
          added_at?: string
          course_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "selfpaced_cart_items_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "selfpaced_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      selfpaced_categories: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          display_order: number
          icon: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      selfpaced_course_materials: {
        Row: {
          course_id: string
          created_at: string
          file_type: string | null
          file_url: string
          id: string
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          file_type?: string | null
          file_url: string
          id?: string
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          file_type?: string | null
          file_url?: string
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "selfpaced_course_materials_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "selfpaced_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      selfpaced_courses: {
        Row: {
          category_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          duration_hours: number | null
          id: string
          is_featured: boolean
          is_published: boolean
          key_highlights: string[] | null
          language: string | null
          level: string | null
          original_price: number | null
          preview_video_url: string | null
          price: number
          program_overview: string | null
          requirements: string[] | null
          short_description: string | null
          skills_developed: string[] | null
          slug: string | null
          thumbnail_url: string | null
          title: string
          tools_covered: string[] | null
          updated_at: string
          what_you_will_learn: string[] | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          duration_hours?: number | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          key_highlights?: string[] | null
          language?: string | null
          level?: string | null
          original_price?: number | null
          preview_video_url?: string | null
          price?: number
          program_overview?: string | null
          requirements?: string[] | null
          short_description?: string | null
          skills_developed?: string[] | null
          slug?: string | null
          thumbnail_url?: string | null
          title: string
          tools_covered?: string[] | null
          updated_at?: string
          what_you_will_learn?: string[] | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          duration_hours?: number | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          key_highlights?: string[] | null
          language?: string | null
          level?: string | null
          original_price?: number | null
          preview_video_url?: string | null
          price?: number
          program_overview?: string | null
          requirements?: string[] | null
          short_description?: string | null
          skills_developed?: string[] | null
          slug?: string | null
          thumbnail_url?: string | null
          title?: string
          tools_covered?: string[] | null
          updated_at?: string
          what_you_will_learn?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "selfpaced_courses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "selfpaced_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      selfpaced_enrollments: {
        Row: {
          completed_at: string | null
          course_id: string
          created_at: string
          enrolled_at: string
          id: string
          last_watched_at: string | null
          last_watched_lesson_id: string | null
          order_id: string | null
          progress_percentage: number
          source: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          created_at?: string
          enrolled_at?: string
          id?: string
          last_watched_at?: string | null
          last_watched_lesson_id?: string | null
          order_id?: string | null
          progress_percentage?: number
          source?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          created_at?: string
          enrolled_at?: string
          id?: string
          last_watched_at?: string | null
          last_watched_lesson_id?: string | null
          order_id?: string | null
          progress_percentage?: number
          source?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "selfpaced_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "selfpaced_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      selfpaced_lesson_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          is_completed: boolean
          lesson_id: string
          updated_at: string
          user_id: string
          watch_time_seconds: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          lesson_id: string
          updated_at?: string
          user_id: string
          watch_time_seconds?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          lesson_id?: string
          updated_at?: string
          user_id?: string
          watch_time_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "selfpaced_lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "selfpaced_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      selfpaced_lessons: {
        Row: {
          content: string | null
          content_type: string
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          is_preview: boolean
          module_id: string | null
          order_index: number
          sub_module_id: string | null
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          content?: string | null
          content_type?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_preview?: boolean
          module_id?: string | null
          order_index?: number
          sub_module_id?: string | null
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          content?: string | null
          content_type?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_preview?: boolean
          module_id?: string | null
          order_index?: number
          sub_module_id?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "selfpaced_lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "selfpaced_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "selfpaced_lessons_sub_module_id_fkey"
            columns: ["sub_module_id"]
            isOneToOne: false
            referencedRelation: "selfpaced_sub_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      selfpaced_modules: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          id: string
          order_index: number
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          order_index?: number
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          order_index?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "selfpaced_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "selfpaced_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      selfpaced_order_items: {
        Row: {
          course_id: string
          created_at: string
          id: string
          order_id: string
          price: number
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          order_id: string
          price: number
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          order_id?: string
          price?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "selfpaced_order_items_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "selfpaced_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "selfpaced_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "selfpaced_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      selfpaced_orders: {
        Row: {
          coupon_code: string | null
          created_at: string
          currency: string
          discount: number
          id: string
          order_number: string
          paid_at: string | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          razorpay_signature: string | null
          status: string
          subtotal: number
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          coupon_code?: string | null
          created_at?: string
          currency?: string
          discount?: number
          id?: string
          order_number?: string
          paid_at?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          coupon_code?: string | null
          created_at?: string
          currency?: string
          discount?: number
          id?: string
          order_number?: string
          paid_at?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      selfpaced_profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          city: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          pincode: string | null
          state: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          email: string
          full_name?: string
          id?: string
          phone?: string | null
          pincode?: string | null
          state?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          pincode?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      selfpaced_quiz_attempts: {
        Row: {
          answers: Json
          attempted_at: string
          completed_at: string | null
          id: string
          passed: boolean | null
          quiz_id: string
          score: number | null
          user_id: string
        }
        Insert: {
          answers?: Json
          attempted_at?: string
          completed_at?: string | null
          id?: string
          passed?: boolean | null
          quiz_id: string
          score?: number | null
          user_id: string
        }
        Update: {
          answers?: Json
          attempted_at?: string
          completed_at?: string | null
          id?: string
          passed?: boolean | null
          quiz_id?: string
          score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "selfpaced_quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "selfpaced_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      selfpaced_quiz_questions: {
        Row: {
          correct_answer: string
          created_at: string
          id: string
          options: Json | null
          order_index: number
          points: number
          question: string
          question_type: string
          quiz_id: string
        }
        Insert: {
          correct_answer: string
          created_at?: string
          id?: string
          options?: Json | null
          order_index?: number
          points?: number
          question: string
          question_type?: string
          quiz_id: string
        }
        Update: {
          correct_answer?: string
          created_at?: string
          id?: string
          options?: Json | null
          order_index?: number
          points?: number
          question?: string
          question_type?: string
          quiz_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "selfpaced_quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "selfpaced_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      selfpaced_quizzes: {
        Row: {
          course_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          lesson_id: string | null
          max_attempts: number | null
          passing_score: number
          time_limit_minutes: number | null
          title: string
          updated_at: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          lesson_id?: string | null
          max_attempts?: number | null
          passing_score?: number
          time_limit_minutes?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          lesson_id?: string | null
          max_attempts?: number | null
          passing_score?: number
          time_limit_minutes?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "selfpaced_quizzes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "selfpaced_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "selfpaced_quizzes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "selfpaced_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      selfpaced_sub_modules: {
        Row: {
          created_at: string
          description: string | null
          id: string
          module_id: string
          order_index: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          module_id: string
          order_index?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          module_id?: string
          order_index?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "selfpaced_sub_modules_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "selfpaced_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      selfpaced_wishlist: {
        Row: {
          added_at: string
          course_id: string
          id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          course_id: string
          id?: string
          user_id: string
        }
        Update: {
          added_at?: string
          course_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "selfpaced_wishlist_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "selfpaced_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          created_at: string
          id: string
          setting_key: string
          setting_value: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          setting_key: string
          setting_value?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          setting_key?: string
          setting_value?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      student_group_members: {
        Row: {
          added_at: string
          group_id: string
          id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          group_id: string
          id?: string
          user_id: string
        }
        Update: {
          added_at?: string
          group_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "student_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      student_groups: {
        Row: {
          course_id: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_groups_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      sub_modules: {
        Row: {
          created_at: string
          description: string | null
          id: string
          module_id: string
          order_index: number | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          module_id: string
          order_index?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          module_id?: string
          order_index?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sub_modules_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      task_assignments: {
        Row: {
          assignment_id: string
          assignment_type: string
          created_at: string
          created_by: string
          due_date: string | null
          id: string
          is_active: boolean | null
          scheduled_at: string | null
          target_id: string | null
          updated_at: string
        }
        Insert: {
          assignment_id: string
          assignment_type: string
          created_at?: string
          created_by: string
          due_date?: string | null
          id?: string
          is_active?: boolean | null
          scheduled_at?: string | null
          target_id?: string | null
          updated_at?: string
        }
        Update: {
          assignment_id?: string
          assignment_type?: string
          created_at?: string
          created_by?: string
          due_date?: string | null
          id?: string
          is_active?: boolean | null
          scheduled_at?: string | null
          target_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_assignments_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      user_analytics: {
        Row: {
          assignments_submitted: number | null
          created_at: string
          date: string
          id: string
          lessons_completed: number | null
          login_count: number | null
          quizzes_taken: number | null
          time_spent_minutes: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          assignments_submitted?: number | null
          created_at?: string
          date?: string
          id?: string
          lessons_completed?: number | null
          login_count?: number | null
          quizzes_taken?: number | null
          time_spent_minutes?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          assignments_submitted?: number | null
          created_at?: string
          date?: string
          id?: string
          lessons_completed?: number | null
          login_count?: number | null
          quizzes_taken?: number | null
          time_spent_minutes?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string
          email_notifications: boolean | null
          id: string
          language: string | null
          push_notifications: boolean | null
          theme: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_notifications?: boolean | null
          id?: string
          language?: string | null
          push_notifications?: boolean | null
          theme?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_notifications?: boolean | null
          id?: string
          language?: string | null
          push_notifications?: boolean | null
          theme?: string | null
          updated_at?: string
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
          role?: Database["public"]["Enums"]["app_role"]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      change_user_role: {
        Args: {
          p_new_role: Database["public"]["Enums"]["app_role"]
          p_target_user_id: string
        }
        Returns: undefined
      }
      check_exam_quiz_answers: {
        Args: { p_answers: Json; p_quiz_id: string }
        Returns: {
          correct_answer: string
          is_correct: boolean
          question_id: string
        }[]
      }
      check_jr_quiz_answers: {
        Args: { p_answers: Json; p_quiz_id: string }
        Returns: {
          correct_answer: string
          is_correct: boolean
          question_id: string
        }[]
      }
      check_quiz_answers: {
        Args: { p_answers: Json; p_quiz_id: string }
        Returns: {
          correct_answer: string
          is_correct: boolean
          question_id: string
        }[]
      }
      check_sp_quiz_answers: {
        Args: { p_answers: Json; p_quiz_id: string }
        Returns: {
          correct_answer: string
          is_correct: boolean
          question_id: string
        }[]
      }
      delete_course_cascade: {
        Args: { p_course_id: string }
        Returns: undefined
      }
      generate_invoice_number: { Args: never; Returns: string }
      generate_sp_order_number: { Args: never; Returns: string }
      get_curriculum_usage: {
        Args: { p_curriculum_id: string }
        Returns: {
          batch_count: number
          course_count: number
        }[]
      }
      get_exam_quiz_questions_for_student: {
        Args: { p_quiz_id: string }
        Returns: {
          id: string
          options: Json
          order_index: number
          points: number
          question: string
          question_type: string
          quiz_id: string
        }[]
      }
      get_finance_stats: {
        Args: never
        Returns: {
          today_collection: number
          total_billing: number
          total_collection: number
          total_due: number
          total_students: number
        }[]
      }
      get_jr_quiz_questions_for_student: {
        Args: { p_quiz_id: string }
        Returns: {
          id: string
          options: Json
          order_index: number
          points: number
          question: string
          question_type: string
          quiz_id: string
        }[]
      }
      get_quiz_questions_for_student: {
        Args: { p_quiz_id: string }
        Returns: {
          id: string
          options: Json
          order_index: number
          points: number
          question: string
          question_type: string
          quiz_id: string
        }[]
      }
      get_sp_quiz_questions_for_student: {
        Args: { p_quiz_id: string }
        Returns: {
          id: string
          options: Json
          order_index: number
          points: number
          question: string
          question_type: string
          quiz_id: string
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_assigned_quiz_for_lesson: {
        Args: { _lesson_id: string; _user_id: string }
        Returns: boolean
      }
      has_assigned_quiz_in_module: {
        Args: { _module_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_higher: { Args: { _user_id: string }; Returns: boolean }
      is_enrolled_in_course: {
        Args: { _course_id: string; _user_id: string }
        Returns: boolean
      }
      is_exam_assignment_assigned_to_user: {
        Args: { _assignment_id: string; _user_id: string }
        Returns: boolean
      }
      is_exam_assignment_owner: {
        Args: { _assignment_id: string; _user_id: string }
        Returns: boolean
      }
      is_exam_quiz_assigned_to_user: {
        Args: { _quiz_id: string; _user_id: string }
        Returns: boolean
      }
      is_exam_quiz_owner: {
        Args: { _quiz_id: string; _user_id: string }
        Returns: boolean
      }
      is_instructor_of_group: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      is_jr_admin: { Args: { _user_id: string }; Returns: boolean }
      is_jr_enrolled: {
        Args: { _course_id: string; _user_id: string }
        Returns: boolean
      }
      is_jr_student: { Args: { _user_id: string }; Returns: boolean }
      is_lesson_enrolled: {
        Args: { _lesson_id: string; _user_id: string }
        Returns: boolean
      }
      is_lesson_in_published_course: {
        Args: { _lesson_id: string }
        Returns: boolean
      }
      is_lesson_instructor: {
        Args: { _lesson_id: string; _user_id: string }
        Returns: boolean
      }
      is_quiz_assigned_to_user: {
        Args: { _quiz_id: string; _user_id: string }
        Returns: boolean
      }
      is_sp_admin: { Args: { _user_id: string }; Returns: boolean }
      is_sp_enrolled: {
        Args: { _course_id: string; _user_id: string }
        Returns: boolean
      }
      is_sp_student: { Args: { _user_id: string }; Returns: boolean }
      is_student_group_member: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      log_audit_event: {
        Args: {
          p_action: string
          p_entity_id?: string
          p_entity_type: string
          p_new_values?: Json
          p_old_values?: Json
        }
        Returns: string
      }
    }
    Enums: {
      app_role:
        | "superadmin"
        | "admin"
        | "instructor"
        | "student"
        | "jr_student"
        | "jr_admin"
        | "sp_student"
        | "sp_admin"
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
      app_role: [
        "superadmin",
        "admin",
        "instructor",
        "student",
        "jr_student",
        "jr_admin",
        "sp_student",
        "sp_admin",
      ],
    },
  },
} as const
