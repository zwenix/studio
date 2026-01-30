export interface User {
  name: string;
  avatarUrl: string;
}

export interface Class {
  id: string;
  name: string;
  grade: string;
  studentCount: number;
}

export interface Student {
  id: string;
  name: string;
  avatarUrl: string;
  overallGrade: number;
}

export interface Activity {
  user: User;
  action: string;
  target: string;
  timestamp: string;
}
