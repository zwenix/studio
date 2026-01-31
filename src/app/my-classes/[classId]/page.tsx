'use client';

import { AppLayout } from '@/components/app-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, getDoc } from 'firebase/firestore';
import type { Class, Assignment, Content } from '@/lib/types';
import { useEffect, useState } from 'react';

type AssignmentWithContent = Assignment & { contentTitle?: string, contentTopic?: string };

export default function ClassDetailsPage() {
  const params = useParams();
  const classId = params.classId as string;

  const { user } = useUser();
  const firestore = useFirestore();

  const classRef = useMemoFirebase(() => doc(firestore, 'classes', classId), [firestore, classId]);
  const { data: classData, isLoading: isClassLoading } = useDoc<Class>(classRef);

  const assignmentsQuery = useMemoFirebase(() => {
    if (!user || !classId) return null;
    return query(
      collection(firestore, 'classes', classId, 'assignments'),
      where('learnerId', '==', user.uid)
    );
  }, [firestore, classId, user]);
  const { data: assignments, isLoading: areAssignmentsLoading } = useCollection<Assignment>(assignmentsQuery);

  const [assignmentsWithContent, setAssignmentsWithContent] = useState<AssignmentWithContent[]>([]);
  
  useEffect(() => {
    if (assignments) {
      const fetchContent = async () => {
        const enhancedAssignments = await Promise.all(
          assignments.map(async (assign) => {
            if (assign.contentId) {
              const contentSnap = await getDoc(doc(firestore, 'content', assign.contentId));
              if (contentSnap.exists()) {
                const contentData = contentSnap.data() as Content;
                return { ...assign, contentTitle: contentData.topic, contentTopic: contentData.topic };
              }
            }
            return assign;
          })
        );
        setAssignmentsWithContent(enhancedAssignments);
      };
      fetchContent();
    }
  }, [assignments, firestore]);

  const isLoading = isClassLoading || areAssignmentsLoading;

  return (
    <AppLayout>
      <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
        {isLoading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">{classData?.name}</CardTitle>
                <CardDescription>
                  <Badge variant="secondary" className="mr-2">Grade {classData?.grade}</Badge>
                  {classData?.subject}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>My Assignments</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Topic</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignmentsWithContent.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">No assignments found.</TableCell>
                      </TableRow>
                    )}
                    {assignmentsWithContent.map((assign) => (
                      <TableRow key={assign.id}>
                        <TableCell className="font-medium">{assign.contentTitle || 'Loading...'}</TableCell>
                        <TableCell>{assign.dueDate.toDate().toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant={assign.status === 'graded' ? 'default' : 'secondary'}>{assign.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/classes/${classId}/assignments/${assign.id}`}>
                              {assign.status === 'graded' ? 'View Result' : 'Start'}
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
