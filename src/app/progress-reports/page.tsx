'use client';

import React, { useState, useMemo } from 'react';
import { AppLayout } from '@/components/app-layout';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { BarChart, Loader2, GraduationCap } from 'lucide-react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import type { Class, User } from '@/lib/types';
import { StudentReport } from '@/components/dashboard/student-report';

export default function ProgressReportsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedChildId, setSelectedChildId] = useState('');

  const userProfileRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<User>(userProfileRef);

  // For Teachers: Get their classes
  const teacherClassesQuery = useMemoFirebase(() => {
    if (userProfile?.role !== 'teacher') return null;
    return query(collection(firestore, 'classes'), where('teacherId', '==', user.uid));
  }, [firestore, user, userProfile]);
  const { data: teacherClasses, isLoading: areClassesLoading } = useCollection<Class>(teacherClassesQuery);

  // For Teachers: Get students in the selected class
  const selectedClass = useMemo(() => teacherClasses?.find(c => c.id === selectedClassId), [teacherClasses, selectedClassId]);
  const studentsInClassQuery = useMemoFirebase(() => {
    if (!selectedClass || !selectedClass.learnerIds || selectedClass.learnerIds.length === 0) return null;
    const studentIds = selectedClass.learnerIds.length > 30 ? selectedClass.learnerIds.slice(0, 30) : selectedClass.learnerIds;
    return query(collection(firestore, 'users'), where('id', 'in', studentIds));
  }, [firestore, selectedClass]);
  const { data: studentsInClass, isLoading: areStudentsLoading } = useCollection<User>(studentsInClassQuery);

  // For Parents: Get their children
  const parentRef = useMemoFirebase(() => (userProfile?.role === 'parent' ? doc(firestore, 'parents', user.uid) : null), [firestore, user, userProfile]);
  const { data: parentData } = useDoc(parentRef);
  const childrenQuery = useMemoFirebase(() => {
    if (!parentData || !parentData.childIds || parentData.childIds.length === 0) return null;
    return query(collection(firestore, 'users'), where('id', 'in', parentData.childIds));
  }, [firestore, parentData]);
  const { data: children, isLoading: areChildrenLoading } = useCollection<User>(childrenQuery);
  
  const isLoading = isUserLoading || isProfileLoading;
  
  const studentIdToReport = useMemo(() => {
    if (userProfile?.role === 'teacher') return selectedStudentId;
    if (userProfile?.role === 'student') return user?.uid;
    if (userProfile?.role === 'parent') return selectedChildId;
    return '';
  }, [userProfile, user, selectedStudentId, selectedChildId]);
  
  const renderTeacherView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="space-y-2">
            <Label htmlFor="class-select">Select a Class</Label>
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger id="class-select"><SelectValue placeholder="Choose a class..." /></SelectTrigger>
                <SelectContent>
                    {areClassesLoading && <SelectItem value="loading" disabled>Loading...</SelectItem>}
                    {teacherClasses?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
            </Select>
        </div>
        <div className="space-y-2">
            <Label htmlFor="student-select">Select a Student</Label>
            <Select value={selectedStudentId} onValueChange={setSelectedStudentId} disabled={!selectedClassId || areStudentsLoading}>
                <SelectTrigger id="student-select"><SelectValue placeholder="Choose a student..." /></SelectTrigger>
                <SelectContent>
                    {areStudentsLoading && <SelectItem value="loading" disabled>Loading...</SelectItem>}
                    {studentsInClass?.map(s => <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>)}
                </SelectContent>
            </Select>
        </div>
    </div>
  );

  const renderParentView = () => (
    <div className="space-y-2 mb-6 max-w-md">
      <Label htmlFor="child-select">Select Your Child</Label>
      <Select value={selectedChildId} onValueChange={setSelectedChildId}>
        <SelectTrigger id="child-select"><SelectValue placeholder="Choose your child..." /></SelectTrigger>
        <SelectContent>
          {areChildrenLoading && <SelectItem value="loading" disabled>Loading...</SelectItem>}
          {children?.map(c => <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );


  return (
    <AppLayout>
      <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
        <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center">
          <BarChart className="mr-3 h-8 w-8" />
          Progress Reports
        </h1>

        {isLoading && (
            <div className="flex justify-center items-center py-16">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        )}

        {!isLoading && userProfile && (
          <>
            {userProfile.role === 'teacher' && renderTeacherView()}
            {userProfile.role === 'parent' && renderParentView()}
            
            {studentIdToReport ? (
                <StudentReport studentId={studentIdToReport} />
            ) : (
                <Card>
                    <CardContent className="p-12 text-center">
                        <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-xl font-medium">Select a Student</h3>
                        <p className="text-muted-foreground mt-2">
                           {userProfile.role === 'teacher' && "Please select a class and student to view their progress report."}
                           {userProfile.role === 'parent' && "Please select one of your children to view their report."}
                        </p>
                    </CardContent>
                </Card>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
