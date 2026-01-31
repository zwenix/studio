'use client';

import { ArrowUpRight, BookOpen, FileUp, PenSquare, Users } from 'lucide-react';
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
import { doc, collection, query, where } from 'firebase/firestore';
import type { Teacher, Class } from '@/lib/types';
import { useMemo } from 'react';

export default function DashboardPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const teacherRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'teachers', user.uid);
  }, [firestore, user]);
  const { data: teacherData } = useDoc<Teacher>(teacherRef);

  const classesQuery = useMemoFirebase(() => {
    if (!user) return null;
    // Query classes where the teacherId matches the current user's UID
    return query(collection(firestore, 'classes'), where('teacherId', '==', user.uid));
  }, [firestore, user]);

  const { data: classes } = useCollection<Class>(classesQuery);

  const activeStudents = useMemo(() => {
    if (!classes) return 0;
    return classes.reduce((acc, cls) => acc + (cls.learnerIds?.length || 0), 0);
  }, [classes]);

  return (
    <AppLayout>
      <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h1 className="text-3xl font-bold tracking-tight font-headline">
            Welcome back, {teacherData?.firstName || 'Teacher'}!
          </h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Students
              </CardTitle>
              <Users
                className="h-4 w-4 text-muted-foreground"
              />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeStudents}</div>
              <p className="text-xs text-muted-foreground">
                Across {classes?.length || 0} classes
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
                Manage your classes
              </p>
            </CardContent>
          </Card>
           <Card className="bg-primary text-primary-foreground col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                 <Button variant="secondary" size="sm" className="justify-start" asChild>
                    <Link href="/content-generator">
                      <Image src="https://i.ibb.co/bMw3gNSc/Main-Logo-512.png" alt="AI Icon" width={16} height={16} className="mr-2" /> Generate Content
                    </Link>
                 </Button>
                 <Button variant="secondary" size="sm" className="justify-start" asChild>
                    <Link href="/my-classes/new">
                      <PenSquare className="mr-2 h-4 w-4" /> New Class
                    </Link>
                 </Button>
                 <Button variant="secondary" size="sm" className="justify-start" asChild>
                    <Link href="/ocr">
                      <FileUp className="mr-2 h-4 w-4" /> Upload Document
                    </Link>
                 </Button>
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Overall Student Performance</CardTitle>
              <CardDescription>Feature coming soon.</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <PerformanceChart />
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
