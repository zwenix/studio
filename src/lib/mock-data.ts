import type { Class, Activity, Student, Conversation, Message } from './types';

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
        user: { name: 'AI Assistant', avatarUrl: 'https://i.ibb.co/bMw3gNSc/Main-Logo-512.png' },
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

export const mockConversations: Conversation[] = [
  { id: 'conv1', participant: { name: 'Ayanda Dlamini (Parent)', avatarUrl: 'https://picsum.photos/seed/parent1/40/40' }, lastMessage: 'Thank you for the update on Ayanda\'s progress!', timestamp: '2 hours ago', unread: true },
  { id: 'conv2', participant: { name: 'Bongani Mkhize (Student)', avatarUrl: 'https://picsum.photos/seed/student2/40/40' }, lastMessage: 'I have a question about the homework.', timestamp: '1 day ago', unread: false },
  { id: 'conv3', participant: { name: 'Principal Thompson', avatarUrl: 'https://picsum.photos/seed/principal/40/40' }, lastMessage: 'Meeting reminder for tomorrow at 10 AM.', timestamp: '3 days ago', unread: false },
];

export const mockMessages: { [key: string]: Message[] } = {
  conv1: [
    { id: 'm1-1', sender: 'them', content: 'Good morning, I wanted to check on Ayanda\'s progress in Maths.', timestamp: '3 hours ago' },
    { id: 'm1-2', sender: 'me', content: 'Good morning! Ayanda is doing very well. Her latest test score was 85%.', timestamp: '3 hours ago' },
    { id: 'm1-3', sender: 'them', content: 'That\'s great to hear! Thank you for the update on Ayanda\'s progress!', timestamp: '2 hours ago' },
  ],
  conv2: [
     { id: 'm2-1', sender: 'them', content: 'Hi teacher, I have a question about the homework.', timestamp: '1 day ago' },
  ],
  conv3: [
    { id: 'm3-1', sender: 'them', content: 'Just a reminder about our staff meeting tomorrow at 10 AM in the main conference room.', timestamp: '3 days ago' },
  ]
};
