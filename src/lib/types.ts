import { Timestamp } from "firebase/firestore";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'teacher' | 'student' | 'parent' | 'admin';
  avatarUrl?: string;
}

export interface Teacher {
  id: string;
  userId: string;
  subjects: string[];
  classIds: string[];
  signatureUrl?: string;
  aiDifficultyAdaptation?: boolean;
  culturalContextIntegration?: boolean;
  parentNotifications?: boolean;
}

export interface Class {
  id: string;
  name: string;
  grade: string;
  subject: string;
  teacherId: string;
  learnerIds: string[];
}

export interface Content {
    id: string;
    teacherId: string;
    contentType: string;
    grade: string;
    subject: string;
    topic: string;
    content: string;
    memo?: string;
    rubric?: string;
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
  createdAt: Timestamp;
}

export interface Assignment {
    id: string;
    contentId: string;
    learnerId: string;
    dueDate: Timestamp;
    status: 'assigned' | 'submitted' | 'graded';
    submissionContent?: string;
    gradeReceived?: string;
    feedback?: string;
    submittedAt?: Timestamp;
    contentTopic?: string;
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

export interface Conversation {
  id: string;
  participant: { name: string; avatarUrl: string };
  lastMessage: string;
  timestamp: string;
  unread: boolean;
}

export interface Message {
  id: string;
  sender: 'me' | 'them';
  content: string;
  timestamp: string;
}

export interface Announcement {
  id: string;
  classId: string;
  teacherId: string;
  message: string;
  createdAt: Timestamp;
}
