'use client';

import { BookOpen, Users, BarChart, PenSquare } from 'lucide-react';
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

    // Build the query based on the user's role
    if (userProfile.role === 'teacher') {
      return query(collection(firestore, 'classes'), where('teacherId', '==', user.uid));
    }
    if (userProfile.role === 'student') {
      return query(collection(firestore, 'classes'), where('learnerIds', 'array-contains', user.uid));
    }
    // For other roles like 'parent', we might not query classes directly on the dashboard
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

  // Fetch assignments for the teacher to populate the chart
  const assignmentsQuery = useMemoFirebase(() => {
    if (!user || userProfile?.role !== 'teacher') return null;
    return query(collectionGroup(firestore, 'assignments'), where('teacherId', '==', user.uid));
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
        month: format(new Date(`${monthKey}-01T12:00:00Z`), 'MMMM'), // Use a fixed date to parse month name
        assignmentsCompleted: data.completed,
        averageScore: data.count > 0 ? Math.round(data.totalScore / data.count) : 0,
      }))
      .sort((a, b) => new Date(a.month + ' 1, 2000').getMonth() - new Date(b.month + ' 1, 2000').getMonth());

  }, [assignments, userProfile]);


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
