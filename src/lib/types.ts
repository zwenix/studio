import { Timestamp } from "firebase/firestore";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'teacher' | 'student' | 'parent' | 'admin';
  avatarUrl?: string;
  phoneNumber?: string;
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
}

export interface Class {
  id: string;
  name: string;
  grade: string;
  subject: string;
  teacherId: string;
  learnerIds: string[];
  parentIds: string[];
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
    teacherId: string;
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

export interface Parent {
  id: string;
  userId: string;
  childIds: string[];
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
    }
  };
  lastMessage: {
    text: string;
    senderId: string;
    timestamp: Timestamp | Date; // Allow Date for immediate client-side update
  } | null;
  updatedAt: Timestamp;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  createdAt: Timestamp;
}

export interface Template {
  id: string;
  title: string;
  description: string;
  grade: string;
  subject: string;
  contentType: string;
  content: string;
  memo?: string;
  rubric?: string;
  category: 'Foundation' | 'Intermediate' | 'Senior' | 'FET';
}
