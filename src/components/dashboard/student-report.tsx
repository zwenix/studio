'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Loader2, User, FileText, CheckCircle2, Percent } from 'lucide-react';
import { useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collectionGroup, query, where, doc, getDoc } from 'firebase/firestore';
import type { Assignment, Content, User as UserProfile } from '@/lib/types';
import { StudentPerformanceChart } from './student-performance-chart';
import { format } from 'date-fns';

interface StudentReportProps {
  studentId: string;
}

export function StudentReport({ studentId }: StudentReportProps) {
  const firestore = useFirestore();
  const [assignmentsWithContent, setAssignmentsWithContent] = useState<(Assignment & { contentTopic?: string })[]>([]);
  const [isContentLoading, setIsContentLoading] = useState(true);

  const studentProfileRef = useMemoFirebase(() => doc(firestore, 'users', studentId), [firestore, studentId]);
  const { data: studentProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(studentProfileRef);
  
  const assignmentsQuery = useMemoFirebase(() => {
    if (!studentId) return null;
    return query(collectionGroup(firestore, 'assignments'), where('learnerId', '==', studentId));
  }, [firestore, studentId]);

  const { data: assignments, isLoading: areAssignmentsLoading } = useCollection<Assignment>(assignmentsQuery);
  
  useEffect(() => {
    if (assignments) {
      setIsContentLoading(true);
      const fetchContent = async () => {
        const enhancedAssignments = await Promise.all(
          assignments.map(async (assign) => {
            let contentTopic = 'Unknown Topic';
            if (assign.contentId) {
              try {
                const contentSnap = await getDoc(doc(firestore, 'content', assign.contentId));
                if (contentSnap.exists()) {
                  const contentData = contentSnap.data() as Content;
                  contentTopic = contentData.topic;
                }
              } catch (e) {
                console.error("Error fetching content for assignment:", e);
              }
            }
            return { ...assign, contentTopic };
          })
        );
        setAssignmentsWithContent(enhancedAssignments);
        setIsContentLoading(false);
      };
      fetchContent();
    } else {
        setIsContentLoading(false);
    }
  }, [assignments, firestore]);

  const gradedAssignments = useMemo(() => {
    return assignmentsWithContent.filter(a => a.status === 'graded' && a.gradeReceived);
  }, [assignmentsWithContent]);

  const averageScore = useMemo(() => {
    if (gradedAssignments.length === 0) return 0;
    const total = gradedAssignments.reduce((acc, a) => {
        const gradeMatch = a.gradeReceived!.match(/\d+/);
        const score = gradeMatch ? parseInt(gradeMatch[0], 10) : 0;
        return acc + score;
    }, 0);
    return Math.round(total / gradedAssignments.length);
  }, [gradedAssignments]);
  
  const isLoading = isProfileLoading || areAssignmentsLoading || isContentLoading;
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-16">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4">Loading student report...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center"><User className="mr-3" /> {studentProfile?.firstName} {studentProfile?.lastName}'s Report</CardTitle>
                <CardDescription>{studentProfile?.email}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-3">
                <div className="flex items-center space-x-4 rounded-md border p-4">
                    <FileText className="h-8 w-8 text-primary" />
                    <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">Total Assignments</p>
                        <p className="text-2xl font-bold">{assignments?.length || 0}</p>
                    </div>
                </div>
                 <div className="flex items-center space-x-4 rounded-md border p-4">
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                    <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">Graded Assignments</p>
                        <p className="text-2xl font-bold">{gradedAssignments.length}</p>
                    </div>
                </div>
                 <div className="flex items-center space-x-4 rounded-md border p-4">
                    <Percent className="h-8 w-8 text-blue-500" />
                    <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">Average Score</p>
                        <p className="text-2xl font-bold">{averageScore}%</p>
                         <Progress value={averageScore} className="h-2" />
                    </div>
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Performance Over Time</CardTitle>
            </CardHeader>
            <CardContent>
                <StudentPerformanceChart assignments={gradedAssignments} />
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Assignment Details</CardTitle>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Topic</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Grade</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {assignmentsWithContent.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center text-muted-foreground h-24">No assignments found for this student.</TableCell>
                            </TableRow>
                        )}
                        {assignmentsWithContent.map((assign) => (
                        <TableRow key={assign.id}>
                            <TableCell className="font-medium">{assign.contentTopic}</TableCell>
                            <TableCell>{assign.dueDate.toDate().toLocaleDateString()}</TableCell>
                            <TableCell>{assign.status}</TableCell>
                            <TableCell className="text-right font-medium">{assign.gradeReceived || 'N/A'}</TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    </div>
  );
}
