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
      achievements: {
        Row: {
          achieved_on: string | null
          created_at: string
          description: string
          id: string
          image_url: string | null
          published: boolean
          title: string
        }
        Insert: {
          achieved_on?: string | null
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          published?: boolean
          title: string
        }
        Update: {
          achieved_on?: string | null
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          published?: boolean
          title?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string
          expire_at: string | null
          id: string
          image_url: string | null
          publish_at: string
          status: string
          title: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          expire_at?: string | null
          id?: string
          image_url?: string | null
          publish_at?: string
          status?: string
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          expire_at?: string | null
          id?: string
          image_url?: string | null
          publish_at?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_attempts: {
        Row: {
          answers: Json | null
          assessment_id: string
          correct_count: number | null
          id: string
          incorrect_count: number | null
          obtained_marks: number | null
          passed: boolean | null
          percentage: number | null
          started_at: string
          submitted_at: string | null
          total_marks: number | null
          trainee_id: string
        }
        Insert: {
          answers?: Json | null
          assessment_id: string
          correct_count?: number | null
          id?: string
          incorrect_count?: number | null
          obtained_marks?: number | null
          passed?: boolean | null
          percentage?: number | null
          started_at?: string
          submitted_at?: string | null
          total_marks?: number | null
          trainee_id: string
        }
        Update: {
          answers?: Json | null
          assessment_id?: string
          correct_count?: number | null
          id?: string
          incorrect_count?: number | null
          obtained_marks?: number | null
          passed?: boolean | null
          percentage?: number | null
          started_at?: string
          submitted_at?: string | null
          total_marks?: number | null
          trainee_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_attempts_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_attempts_trainee_id_fkey"
            columns: ["trainee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_questions: {
        Row: {
          assessment_id: string
          correct_index: number
          id: string
          marks: number
          options: Json
          position: number
          question: string
        }
        Insert: {
          assessment_id: string
          correct_index: number
          id?: string
          marks?: number
          options: Json
          position?: number
          question: string
        }
        Update: {
          assessment_id?: string
          correct_index?: number
          id?: string
          marks?: number
          options?: Json
          position?: number
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_questions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          course_id: string
          created_at: string
          deadline: string | null
          description: string | null
          duration_minutes: number
          id: string
          module_id: string | null
          passing_percentage: number
          published: boolean
          start_at: string | null
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          deadline?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          module_id?: string | null
          passing_percentage?: number
          published?: boolean
          start_at?: string | null
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          deadline?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          module_id?: string | null
          passing_percentage?: number
          published?: boolean
          start_at?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_submissions: {
        Row: {
          assignment_id: string
          comments: string | null
          created_at: string
          evaluated_at: string | null
          evaluated_by: string | null
          feedback: string | null
          file_path: string | null
          id: string
          marks: number | null
          status: Database["public"]["Enums"]["submission_status"]
          submitted_at: string | null
          trainee_id: string
        }
        Insert: {
          assignment_id: string
          comments?: string | null
          created_at?: string
          evaluated_at?: string | null
          evaluated_by?: string | null
          feedback?: string | null
          file_path?: string | null
          id?: string
          marks?: number | null
          status?: Database["public"]["Enums"]["submission_status"]
          submitted_at?: string | null
          trainee_id: string
        }
        Update: {
          assignment_id?: string
          comments?: string | null
          created_at?: string
          evaluated_at?: string | null
          evaluated_by?: string | null
          feedback?: string | null
          file_path?: string | null
          id?: string
          marks?: number | null
          status?: Database["public"]["Enums"]["submission_status"]
          submitted_at?: string | null
          trainee_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_submissions_evaluated_by_fkey"
            columns: ["evaluated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_submissions_trainee_id_fkey"
            columns: ["trainee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          allowed_file_types: string
          attachment_path: string | null
          course_id: string
          created_at: string
          deadline: string
          description: string | null
          id: string
          instructions: string | null
          max_marks: number
          module_id: string | null
          submission_rules: string | null
          title: string
        }
        Insert: {
          allowed_file_types?: string
          attachment_path?: string | null
          course_id: string
          created_at?: string
          deadline: string
          description?: string | null
          id?: string
          instructions?: string | null
          max_marks?: number
          module_id?: string | null
          submission_rules?: string | null
          title: string
        }
        Update: {
          allowed_file_types?: string
          attachment_path?: string | null
          course_id?: string
          created_at?: string
          deadline?: string
          description?: string | null
          id?: string
          instructions?: string | null
          max_marks?: number
          module_id?: string | null
          submission_rules?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          certificate_code: string
          course_id: string
          course_title: string
          id: string
          issued_at: string
          score: number | null
          trainee_id: string
          trainee_name: string
          trainer_name: string | null
        }
        Insert: {
          certificate_code: string
          course_id: string
          course_title: string
          id?: string
          issued_at?: string
          score?: number | null
          trainee_id: string
          trainee_name: string
          trainer_name?: string | null
        }
        Update: {
          certificate_code?: string
          course_id?: string
          course_title?: string
          id?: string
          issued_at?: string
          score?: number | null
          trainee_id?: string
          trainee_name?: string
          trainer_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_trainee_id_fkey"
            columns: ["trainee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      competencies: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      course_modules: {
        Row: {
          content: string | null
          course_id: string
          created_at: string
          description: string | null
          id: string
          position: number
          title: string
        }
        Insert: {
          content?: string | null
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          position?: number
          title: string
        }
        Update: {
          content?: string | null
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          position?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          category: string
          created_at: string
          description: string
          difficulty: string
          duration: string | null
          id: string
          learning_objectives: string | null
          prerequisites: string | null
          skills: string | null
          status: Database["public"]["Enums"]["course_status"]
          title: string
          trainer_id: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string
          difficulty?: string
          duration?: string | null
          id?: string
          learning_objectives?: string | null
          prerequisites?: string | null
          skills?: string | null
          status?: Database["public"]["Enums"]["course_status"]
          title: string
          trainer_id: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          difficulty?: string
          duration?: string | null
          id?: string
          learning_objectives?: string | null
          prerequisites?: string | null
          skills?: string | null
          status?: Database["public"]["Enums"]["course_status"]
          title?: string
          trainer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          completed_at: string | null
          course_id: string
          enrolled_at: string
          id: string
          trainee_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          enrolled_at?: string
          id?: string
          trainee_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          enrolled_at?: string
          id?: string
          trainee_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_trainee_id_fkey"
            columns: ["trainee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          comments: string | null
          course_id: string
          created_at: string
          id: string
          rating: number
          resource_feedback: string | null
          trainee_id: string
        }
        Insert: {
          comments?: string | null
          course_id: string
          created_at?: string
          id?: string
          rating: number
          resource_feedback?: string | null
          trainee_id: string
        }
        Update: {
          comments?: string | null
          course_id?: string
          created_at?: string
          id?: string
          rating?: number
          resource_feedback?: string | null
          trainee_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_trainee_id_fkey"
            columns: ["trainee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      module_completions: {
        Row: {
          completed_at: string
          id: string
          module_id: string
          trainee_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          module_id: string
          trainee_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          module_id?: string
          trainee_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_completions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_completions_trainee_id_fkey"
            columns: ["trainee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_status: Database["public"]["Enums"]["account_status"]
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          trainer_status: Database["public"]["Enums"]["trainer_status"] | null
          updated_at: string
        }
        Insert: {
          account_status?: Database["public"]["Enums"]["account_status"]
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id: string
          phone?: string | null
          trainer_status?: Database["public"]["Enums"]["trainer_status"] | null
          updated_at?: string
        }
        Update: {
          account_status?: Database["public"]["Enums"]["account_status"]
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          trainer_status?: Database["public"]["Enums"]["trainer_status"] | null
          updated_at?: string
        }
        Relationships: []
      }
      resources: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          external_url: string | null
          file_path: string | null
          id: string
          module_id: string | null
          resource_type: Database["public"]["Enums"]["resource_type"]
          title: string
          trainer_id: string
          visibility: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          external_url?: string | null
          file_path?: string | null
          id?: string
          module_id?: string | null
          resource_type: Database["public"]["Enums"]["resource_type"]
          title: string
          trainer_id: string
          visibility?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          external_url?: string | null
          file_path?: string | null
          id?: string
          module_id?: string | null
          resource_type?: Database["public"]["Enums"]["resource_type"]
          title?: string
          trainer_id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "resources_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_requirements: {
        Row: {
          competency_id: string
          id: string
          required_level: number
          subject_id: string
        }
        Insert: {
          competency_id: string
          id?: string
          required_level: number
          subject_id: string
        }
        Update: {
          competency_id?: string
          id?: string
          required_level?: number
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subject_requirements_competency_id_fkey"
            columns: ["competency_id"]
            isOneToOne: false
            referencedRelation: "competencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_requirements_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      trainee_profiles: {
        Row: {
          address: string | null
          areas_of_interest: string | null
          bio: string | null
          certificates: string | null
          education: string | null
          interests: string | null
          qualifications: string | null
          skills: string | null
          updated_at: string
          user_id: string
          work_experience: string | null
        }
        Insert: {
          address?: string | null
          areas_of_interest?: string | null
          bio?: string | null
          certificates?: string | null
          education?: string | null
          interests?: string | null
          qualifications?: string | null
          skills?: string | null
          updated_at?: string
          user_id: string
          work_experience?: string | null
        }
        Update: {
          address?: string | null
          areas_of_interest?: string | null
          bio?: string | null
          certificates?: string | null
          education?: string | null
          interests?: string | null
          qualifications?: string | null
          skills?: string | null
          updated_at?: string
          user_id?: string
          work_experience?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trainee_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trainer_assignments: {
        Row: {
          assigned_by: string | null
          created_at: string
          id: string
          match_score: number | null
          notes: string | null
          subject_id: string
          trainer_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          match_score?: number | null
          notes?: string | null
          subject_id: string
          trainer_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          match_score?: number | null
          notes?: string | null
          subject_id?: string
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainer_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainer_assignments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainer_assignments_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trainer_competencies: {
        Row: {
          competency_id: string
          id: string
          level: number
          trainer_id: string
        }
        Insert: {
          competency_id: string
          id?: string
          level: number
          trainer_id: string
        }
        Update: {
          competency_id?: string
          id?: string
          level?: number
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainer_competencies_competency_id_fkey"
            columns: ["competency_id"]
            isOneToOne: false
            referencedRelation: "competencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainer_competencies_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trainer_profiles: {
        Row: {
          bio: string | null
          certifications: string | null
          experience: string | null
          experience_years: number | null
          qualification: string | null
          skills: string | null
          specialization: string | null
          subjects_taught: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bio?: string | null
          certifications?: string | null
          experience?: string | null
          experience_years?: number | null
          qualification?: string | null
          skills?: string | null
          specialization?: string | null
          subjects_taught?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bio?: string | null
          certifications?: string | null
          experience?: string | null
          experience_years?: number | null
          qualification?: string | null
          skills?: string | null
          specialization?: string | null
          subjects_taught?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainer_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_exists: { Args: never; Returns: boolean }
      admin_stats: { Args: never; Returns: Json }
      claim_certificate: {
        Args: { _course: string }
        Returns: {
          certificate_code: string
          course_id: string
          course_title: string
          id: string
          issued_at: string
          score: number | null
          trainee_id: string
          trainee_name: string
          trainer_name: string | null
        }
        SetofOptions: {
          from: "*"
          to: "certificates"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      claim_first_admin: { Args: never; Returns: boolean }
      course_completion_status: { Args: { _course: string }; Returns: Json }
      get_assessment_for_attempt: {
        Args: { _assessment: string }
        Returns: Json
      }
      get_attempt_review: { Args: { _assessment: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_active_user: { Args: { _uid: string }; Returns: boolean }
      is_approved_trainer: { Args: { _uid: string }; Returns: boolean }
      is_course_published: { Args: { _course: string }; Returns: boolean }
      is_course_trainer: {
        Args: { _course: string; _uid: string }
        Returns: boolean
      }
      is_enrolled: { Args: { _course: string; _uid: string }; Returns: boolean }
      notify: {
        Args: { _body: string; _link: string; _title: string; _user: string }
        Returns: undefined
      }
      start_assessment: {
        Args: { _assessment: string }
        Returns: {
          answers: Json | null
          assessment_id: string
          correct_count: number | null
          id: string
          incorrect_count: number | null
          obtained_marks: number | null
          passed: boolean | null
          percentage: number | null
          started_at: string
          submitted_at: string | null
          total_marks: number | null
          trainee_id: string
        }
        SetofOptions: {
          from: "*"
          to: "assessment_attempts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_assessment: {
        Args: { _answers: Json; _assessment: string }
        Returns: {
          answers: Json | null
          assessment_id: string
          correct_count: number | null
          id: string
          incorrect_count: number | null
          obtained_marks: number | null
          passed: boolean | null
          percentage: number | null
          started_at: string
          submitted_at: string | null
          total_marks: number | null
          trainee_id: string
        }
        SetofOptions: {
          from: "*"
          to: "assessment_attempts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      trainer_public_info: {
        Args: { _ids: string[] }
        Returns: {
          avatar_url: string
          bio: string
          full_name: string
          id: string
          qualification: string
          specialization: string
        }[]
      }
      trainer_stats: { Args: never; Returns: Json }
    }
    Enums: {
      account_status: "active" | "suspended"
      app_role: "admin" | "trainer" | "trainee"
      course_status: "draft" | "published" | "archived"
      resource_type:
        | "recorded_lecture"
        | "video"
        | "pdf"
        | "presentation"
        | "document"
        | "study_material"
        | "external_link"
      submission_status: "in_progress" | "submitted" | "late" | "evaluated"
      trainer_status: "pending" | "approved" | "rejected" | "suspended"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      account_status: ["active", "suspended"],
      app_role: ["admin", "trainer", "trainee"],
      course_status: ["draft", "published", "archived"],
      resource_type: [
        "recorded_lecture",
        "video",
        "pdf",
        "presentation",
        "document",
        "study_material",
        "external_link",
      ],
      submission_status: ["in_progress", "submitted", "late", "evaluated"],
      trainer_status: ["pending", "approved", "rejected", "suspended"],
    },
  },
} as const
