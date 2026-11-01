export type AppRole = 'superadmin' | 'admin' | 'instructor' | 'student';

export interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  bio: string | null;
  gender: string | null;
  date_of_birth: string | null;
  alt_phone: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  highest_qualification: string | null;
  area_of_study: string | null;
  year_of_completion: number | null;
  gpa: string | null;
  years_of_experience: number | null;
  current_company: string | null;
  current_designation: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface Course {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  instructor_id: string;
  category: string | null;
  difficulty_level: string;
  duration_hours: number;
  price: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  instructor?: Profile;
  modules?: Module[];
  enrollment_count?: number;
}

export interface Module {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
  lessons?: Lesson[];
}

export interface Lesson {
  id: string;
  module_id: string;
  title: string;
  content: string | null;
  video_url: string | null;
  duration_minutes: number;
  order_index: number;
  is_free: boolean;
  created_at: string;
  updated_at: string;
  materials?: CourseMaterial[];
  quiz?: Quiz;
  progress?: LessonProgress;
}

export interface CourseMaterial {
  id: string;
  lesson_id: string;
  title: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
}

export interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  enrolled_at: string;
  completed_at: string | null;
  status: string;
  course?: Course;
  user?: Profile;
}

export interface LessonProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  is_completed: boolean;
  progress_percent: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Quiz {
  id: string;
  lesson_id: string;
  title: string;
  description: string | null;
  passing_score: number;
  time_limit_minutes: number | null;
  created_at: string;
  updated_at: string;
  questions?: QuizQuestion[];
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  question: string;
  question_type: string;
  options: string[] | null;
  correct_answer: string;
  points: number;
  order_index: number;
  created_at: string;
}

export interface QuizAttempt {
  id: string;
  user_id: string;
  quiz_id: string;
  score: number;
  max_score: number;
  passed: boolean;
  answers: Record<string, string> | null;
  started_at: string;
  completed_at: string | null;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  link: string | null;
  created_at: string;
}

export interface DashboardStats {
  totalCourses: number;
  totalStudents: number;
  totalEnrollments: number;
  completionRate: number;
  activeStudents: number;
  revenue?: number;
}
