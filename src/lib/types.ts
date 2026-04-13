// ── EduAI Companion — App-wide TypeScript types ──────────────
// Dates come back from Supabase as ISO strings.
// Use `new Date(value)` or date-fns `parseISO` wherever you need a Date object.

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'teacher' | 'student' | 'parent' | 'admin';
  avatarUrl?: string;
  phoneNumber?: string;
  // Supabase snake_case aliases
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  phone?: string;
}

export interface Teacher {
  id: string;
  userId: string;
  subjects: string[];
  classIds: string[];
  school?: string;
  signatureUrl?: string;
  aiDifficultyAdaptation?: boolean;
  culturalContextIntegration?: boolean;
  parentNotifications?: boolean;
  // Supabase snake_case aliases
  class_ids?: string[];
  signature_url?: string;
  ai_difficulty_adaptation?: boolean;
  cultural_context?: boolean;
  parent_notifications?: boolean;
}

export interface Class {
  id: string;
  name: string;
  grade: string;
  subject: string;
  teacherId: string;
  learnerIds: string[];
  parentIds: string[];
  // Supabase snake_case aliases
  teacher_id?: string;
  learner_ids?: string[];
  parent_ids?: string[];
}

export interface Content {
  id: string;
  teacherId: string;
  contentType: string;
  grade: string;
  subject: string;
  topic: string;
  content: string;
  fileUrl?: string;
  fileType?: 'pdf' | 'image' | 'html';
  memo?: string;
  rubric?: string;
  // Supabase snake_case aliases
  teacher_id?: string;
  content_type?: string;
  file_url?: string;
  file_type?: string;
}

export interface GeneratedContent {
  id: string;
  teacherId: string;
  contentType: string;
  grade: string;
  subject: string;
  topic: string;
  content: string;
  memo?: string;
  rubric?: string;
  createdAt: string;
  // Supabase snake_case aliases
  teacher_id?: string;
  content_type?: string;
  created_at?: string;
}

export interface Assignment {
  id: string;
  contentId: string;
  learnerId: string;
  teacherId: string;
  classId?: string;
  dueDate: string;
  status: 'assigned' | 'submitted' | 'graded';
  submissionContent?: string;
  gradeReceived?: string;
  feedback?: string;
  submittedAt?: string;
  contentTopic?: string;
  // Supabase snake_case aliases
  content_id?: string;
  learner_id?: string;
  teacher_id?: string;
  class_id?: string;
  due_date?: string;
  submission_content?: string;
  grade_received?: string;
  submitted_at?: string;
}

export interface Student {
  id: string;
  name: string;
  avatarUrl: string;
  overallGrade: number;
}

export interface Activity {
  user: { name: string; avatarUrl: string };
  action: string;
  target: string;
  timestamp: string;
}

export interface Parent {
  id: string;
  userId: string;
  childIds: string[];
  // Supabase snake_case aliases
  child_ids?: string[];
}

export interface Conversation {
  id: string;
  participantIds: string[];
  participantInfo: {
    [key: string]: {
      firstName: string;
      lastName: string;
      role: 'teacher' | 'student' | 'parent' | 'admin';
      avatarUrl?: string;
    };
  };
  lastMessage: {
    text: string;
    senderId: string;
    timestamp: string | Date;
  } | null;
  updatedAt: string;
  // Supabase snake_case aliases
  participant_ids?: string[];
  participant_info?: Record<string, any>;
  last_message?: Record<string, any> | null;
  updated_at?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  createdAt: string;
  // Supabase snake_case aliases
  sender_id?: string;
  created_at?: string;
}

export interface Template {
  id: string;
  title: string;
  description: string;
  grade: string;
  subject: string;
  contentType: string;
  content: string;
  fileUrl?: string;
  fileType?: 'pdf' | 'image' | 'html';
  memo?: string;
  rubric?: string;
  category: 'Foundation' | 'Intermediate' | 'Senior' | 'FET';
  teacherId?: string;
  createdAt?: string;
}

export interface OcrUpload {
  id: string;
  userId: string;
  contentType: string;
  text: string;
  createdAt: string;
  // Supabase snake_case aliases
  user_id?: string;
  content_type?: string;
  created_at?: string;
}

export interface AcademicRecord {
  id: string;
  learnerId: string;
  senderId: string;
  type: string;
  content: string;
  score?: string;
  createdAt: string;
  teacherNotified: boolean;
  // Supabase snake_case aliases
  learner_id?: string;
  sender_id?: string;
  created_at?: string;
  teacher_notified?: boolean;
}

export interface Learner {
  id: string;
  userId: string;
  grade: string;
  learningPreferences: string;
  // Supabase snake_case aliases
  user_id?: string;
  learning_preferences?: string;
}
