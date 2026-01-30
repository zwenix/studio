import type { Class, Activity, Student } from './types';

export const mockClasses: Class[] = [
  { id: '1', name: 'Grade 10 Maths', grade: '10', studentCount: 32 },
  { id: '2', name: 'Grade 8 English', grade: '8', studentCount: 28 },
  { id: '3', name: 'Grade 12 Physical Science', grade: '12', studentCount: 22 },
  { id: '4', name: 'Grade 9 History', grade: '9', studentCount: 35 },
];

export const mockActivities: Activity[] = [
    {
        user: { name: 'You', avatarUrl: 'https://picsum.photos/seed/user-avatar-1/200/200' },
        action: 'generated an assessment for',
        target: 'Grade 10 Maths',
        timestamp: '10 minutes ago',
    },
    {
        user: { name: 'You', avatarUrl: 'https://picsum.photos/seed/user-avatar-1/200/200' },
        action: 'assigned homework to',
        target: 'Grade 8 English',
        timestamp: '1 hour ago',
    },
    {
        user: { name: 'AI Assistant', avatarUrl: '/logo.svg' },
        action: 'suggested a new lesson plan for',
        target: 'Grade 12 Physical Science',
        timestamp: '3 hours ago',
    },
    {
        user: { name: 'You', avatarUrl: 'https://picsum.photos/seed/user-avatar-1/200/200' },
        action: 'uploaded a new document to',
        target: 'Grade 9 History',
        timestamp: 'Yesterday',
    },
];


export const mockStudents: Student[] = [
    { id: 's1', name: 'Ayanda Dlamini', avatarUrl: 'https://picsum.photos/seed/student1/40/40', overallGrade: 85 },
    { id: 's2', name: 'Bongani Mkhize', avatarUrl: 'https://picsum.photos/seed/student2/40/40', overallGrade: 92 },
    { id: 's3', name: 'Cynthia Naidoo', avatarUrl: 'https://picsum.photos/seed/student3/40/40', overallGrade: 78 },
    { id: 's4', name: 'David Smith', avatarUrl: 'https://picsum.photos/seed/student4/40/40', overallGrade: 65 },
  ];
