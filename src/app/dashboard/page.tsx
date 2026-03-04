'use client';

import { BookOpen, Users, BarChart, PenSquare, Rocket, Sparkles, Star, Zap, ScanText, FlaskConical } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PerformanceChart } from '@/components/dashboard/performance-chart';
import { MyClasses } from '@/components/dashboard/my-classes';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, collectionGroup } from 'firebase/firestore';
import type { Teacher, Class, User, Assignment } from '@/lib/types';
import { useMemo } from 'react';
import { format } from 'date-fns';
import { Progress } from '@/components/ui/progress';

function StudentDashboardView({ userProfile, classes, assignments }: { userProfile: User, classes: Class[] | null, assignments: Assignment[] | null }) {
    const averageScore = useMemo(() => {
        if (!assignments) return 0;
        const graded = assignments.filter(a => a.status === 'graded' && a.gradeReceived);
        if (graded.length === 0) return 0;
        const total = graded.reduce((acc, a) => {
            const gradeMatch = a.gradeReceived!.match(/\d+/);
            const score = gradeMatch ? parseInt(gradeMatch[0], 10) : 0;
            return acc + score;
        }, 0);
        return Math.round(total / graded.length);
    }, [assignments]);

    return (
        <div className="flex-1 space-y-8 p-4 sm:p-8 pt-6">
            {/* Fun Greeting */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-indigo-600 to-blue-500 p-8 rounded-[3rem] text-white shadow-xl relative overflow-hidden group">
                <div className="relative z-10">
                    <h1 className="text-4xl md:text-6xl font-bold font-patrick-hand mb-2 animate-fadeInZoom">
                        Hey, {userProfile.firstName}! 👋
                    </h1>
                    <p className="text-xl md:text-2xl text-blue-100/80 font-medium">Ready for some learning magic today?</p>
                </div>
                <div className="relative z-10 shrink-0 group-hover:scale-110 transition-transform duration-500">
                    <Rocket className="w-20 h-20 md:w-24 md:h-24 text-yellow-400 animate-float" />
                </div>
                {/* Background Sparkles */}
                <Star className="absolute top-4 right-1/4 w-6 h-6 text-white/20 animate-pulse" />
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
            </div>

            {/* Adventure Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <Link href="/mock-assessment" className="group">
                    <Card className="h-full bg-orange-500 text-white rounded-[2rem] border-none shadow-lg transform transition hover:scale-105 active:scale-95 overflow-hidden">
                        <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                            <div className="p-4 bg-white/20 rounded-2xl group-hover:animate-bounce">
                                <FlaskConical className="w-10 h-10" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold font-patrick-hand">Practice Test</h3>
                                <p className="text-white/80 font-medium">Test your super skills!</p>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
                <Link href="/ai-tutor" className="group">
                    <Card className="h-full bg-blue-500 text-white rounded-[2rem] border-none shadow-lg transform transition hover:scale-105 active:scale-95 overflow-hidden">
                        <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                            <div className="p-4 bg-white/20 rounded-2xl group-hover:animate-bounce">
                                <Sparkles className="w-10 h-10" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold font-patrick-hand">AI Bot Tutor</h3>
                                <p className="text-white/80 font-medium">Ask anything, anytime!</p>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
                <Link href="/ocr" className="group">
                    <Card className="h-full bg-pink-500 text-white rounded-[2rem] border-none shadow-lg transform transition hover:scale-105 active:scale-95 overflow-hidden">
                        <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                            <div className="p-4 bg-white/20 rounded-2xl group-hover:animate-bounce">
                                <ScanText className="w-10 h-10" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold font-patrick-hand">OCR Magic</h3>
                                <p className="text-white/80 font-medium">Scan your work easily!</p>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
                <Link href="/my-classes" className="group">
                    <Card className="h-full bg-green-500 text-white rounded-[2rem] border-none shadow-lg transform transition hover:scale-105 active:scale-95 overflow-hidden">
                        <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                            <div className="p-4 bg-white/20 rounded-2xl group-hover:animate-bounce">
                                <Zap className="w-10 h-10" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold font-patrick-hand">My Classes</h3>
                                <p className="text-white/80 font-medium">See your subjects!</p>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-7">
                {/* Stats & Progress */}
                <Card className="col-span-4 rounded-[2.5rem] shadow-xl overflow-hidden border-none bg-white dark:bg-slate-900">
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold font-patrick-hand">My Study Rocket 🚀</CardTitle>
                        <CardDescription>How fast you're learning!</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        <div className="flex items-center justify-between p-6 bg-blue-50 dark:bg-blue-900/20 rounded-[2rem]">
                            <div className="space-y-1">
                                <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-widest">Enrolled Subjects</p>
                                <p className="text-4xl font-bold">{classes?.length || 0}</p>
                            </div>
                            <div className="space-y-1 text-right">
                                <p className="text-sm font-semibold text-green-600 dark:text-green-400 uppercase tracking-widest">Average Score</p>
                                <p className="text-4xl font-bold">{averageScore}%</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center px-2">
                                <span className="font-bold text-lg">Overall Progress</span>
                                <span className="text-blue-600 font-bold">{averageScore}%</span>
                            </div>
                            <Progress value={averageScore} className="h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 border-none shadow-inner" />
                            <p className="text-center text-muted-foreground font-medium animate-pulse">
                                {averageScore > 80 ? "Amazing job! You're a rockstar! 🌟" : averageScore > 50 ? "Keep it up! You're doing great! 👍" : "Let's work together to boost those scores! 💪"}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* My Classes Summary */}
                <Card className="col-span-4 lg:col-span-3 rounded-[2.5rem] shadow-xl border-none bg-white dark:bg-slate-900">
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold font-patrick-hand">My Subjects</CardTitle>
                        <CardDescription>Quick look at your classes.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <MyClasses classes={classes} />
                        <Button variant="outline" className="w-full mt-6 rounded-2xl font-bold" asChild>
                            <Link href="/my-classes">View All Classes <Zap className="ml-2 w-4 h-4 text-yellow-500" /></Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default function DashboardPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  // Fetch user profile to determine role
  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  const { data: userProfile } = useDoc<User>(userProfileRef);

  const classesQuery = useMemoFirebase(() => {
    if (!user || !userProfile) return null;

    if (userProfile.role === 'teacher') {
      return query(collection(firestore, 'classes'), where('teacherId', '==', user.uid));
    }
    if (userProfile.role === 'student') {
      return query(collection(firestore, 'classes'), where('learnerIds', 'array-contains', user.uid));
    }
    return null;
  }, [firestore, user, userProfile]);

  const { data: classes } = useCollection<Class>(classesQuery);

  const activeStudents = useMemo(() => {
    if (!classes || userProfile?.role !== 'teacher') return 0;
    return classes.reduce((acc, cls) => acc + (cls.learnerIds?.length || 0), 0);
  }, [classes, userProfile]);
  
  const welcomeMessage = useMemo(() => {
    if (!userProfile) return "Welcome!";
    const name = userProfile.firstName || 'User';
    return `Welcome back, ${name}!`;
  }, [userProfile]);

  // Fetch assignments
  const assignmentsQuery = useMemoFirebase(() => {
    if (!user || !userProfile) return null;
    if (userProfile.role === 'teacher') {
        return query(collectionGroup(firestore, 'assignments'), where('teacherId', '==', user.uid));
    } else {
        return query(collectionGroup(firestore, 'assignments'), where('learnerId', '==', user.uid));
    }
  }, [firestore, user, userProfile]);
  const { data: assignments } = useCollection<Assignment>(assignmentsQuery);

  const chartData = useMemo(() => {
    if (!assignments || userProfile?.role !== 'teacher') return [];

    const monthlyData: { [key: string]: { completed: number; totalScore: number; count: number } } = {};

    assignments.forEach(assignment => {
      if (assignment.status === 'graded' && assignment.submittedAt) {
        const date = assignment.submittedAt.toDate();
        const monthKey = format(date, 'yyyy-MM');
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { completed: 0, totalScore: 0, count: 0 };
        }
        
        monthlyData[monthKey].completed++;
        
        const gradeMatch = assignment.gradeReceived?.match(/\d+/);
        if (gradeMatch) {
          monthlyData[monthKey].totalScore += parseInt(gradeMatch[0], 10);
          monthlyData[monthKey].count++;
        }
      }
    });
    
    return Object.entries(monthlyData)
      .map(([monthKey, data]) => ({
        month: format(new Date(`${monthKey}-01T12:00:00Z`), 'MMMM'),
        assignmentsCompleted: data.completed,
        averageScore: data.count > 0 ? Math.round(data.totalScore / data.count) : 0,
      }))
      .sort((a, b) => new Date(a.month + ' 1, 2000').getMonth() - new Date(b.month + ' 1, 2000').getMonth());

  }, [assignments, userProfile]);

  // Return specific view for students
  if (userProfile?.role === 'student') {
      return (
          <AppLayout>
              <StudentDashboardView userProfile={userProfile} classes={classes} assignments={assignments} />
          </AppLayout>
      );
  }

  return (
    <AppLayout>
      <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h1 className="text-3xl font-bold tracking-tight font-headline">
            {welcomeMessage}
          </h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {userProfile?.role === 'teacher' ? 'Active Students' : 'My Subjects'}
              </CardTitle>
              <Users
                className="h-4 w-4 text-muted-foreground"
              />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userProfile?.role === 'teacher' ? activeStudents : (classes?.length || 0)}</div>
              <p className="text-xs text-muted-foreground">
                 {userProfile?.role === 'teacher' ? `Across ${classes?.length || 0} classes` : `Enrolled in ${classes?.length || 0} classes`}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Classes
              </CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{classes?.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                 {userProfile?.role === 'teacher' ? 'Manage your classes' : 'View your classes'}
              </p>
            </CardContent>
          </Card>
           <Card className="bg-primary text-primary-foreground col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                 <Button variant="secondary" size="sm" className="justify-start h-auto whitespace-normal py-1" asChild>
                    <Link href="/content-generator">
                      <Image src="https://i.ibb.co/tTc5gG5k/eduaicompanion-logo2-preview-1772467621580-2-preview-1772473153046.png" alt="AI Icon" width={16} height={16} className="mr-2" /> Generate Content
                    </Link>
                 </Button>
                 <Button variant="secondary" size="sm" className="justify-start h-auto whitespace-normal py-1" asChild>
                    <Link href="/my-classes/new">
                      <PenSquare className="mr-2 h-4 w-4" /> New Class
                    </Link>
                 </Button>
                 <Button variant="secondary" size="sm" className="justify-start h-auto whitespace-normal py-1" asChild>
                    <Link href="/progress-reports">
                      <BarChart className="mr-2 h-4 w-4" /> View Reports
                    </Link>
                 </Button>
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Overall Student Performance</CardTitle>
              {userProfile?.role === 'teacher' && <CardDescription>Monthly overview of assignments and scores across all your classes.</CardDescription>}
            </CardHeader>
            <CardContent className="pl-2">
              <PerformanceChart data={chartData} />
            </CardContent>
          </Card>
          <Card className="col-span-4 lg:col-span-3">
            <CardHeader>
              <CardTitle>My Classes</CardTitle>
              <CardDescription>
                An overview of your active classes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MyClasses classes={classes} />
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
