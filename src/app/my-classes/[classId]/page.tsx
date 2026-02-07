'use client';

import { AppLayout } from '@/components/app-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowRight, Loader2, UserPlus, X, UserX } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import type { Class, Assignment, Content, User } from '@/lib/types';
import { useEffect, useState, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';


function StudentClassView({ classId, userId }: { classId: string, userId: string }) {
    const firestore = useFirestore();
    const assignmentsQuery = useMemoFirebase(() => {
        if (!userId || !classId) return null;
        return query(
        collection(firestore, 'classes', classId, 'assignments'),
        where('learnerId', '==', userId)
        );
    }, [firestore, classId, userId]);
    const { data: assignments, isLoading: areAssignmentsLoading } = useCollection<Assignment>(assignmentsQuery);

    const [assignmentsWithContent, setAssignmentsWithContent] = useState<(Assignment & { contentTitle?: string, contentTopic?: string })[]>([]);
    
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

    return (
        <Card>
            <CardHeader>
            <CardTitle>My Assignments</CardTitle>
            </CardHeader>
            <CardContent>
            {areAssignmentsLoading ? (
                <div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : (
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
            )}
            </CardContent>
        </Card>
    );
}


function TeacherClassView({ classData }: { classData: Class }) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const classRef = useMemoFirebase(() => doc(firestore, 'classes', classData.id), [firestore, classData.id]);
  
  // Get students currently in the class
  const studentsInClassQuery = useMemoFirebase(() => {
    if (!classData?.learnerIds || classData.learnerIds.length === 0) return null;
    const studentIds = classData.learnerIds.length > 30 ? classData.learnerIds.slice(0, 30) : classData.learnerIds;
    return query(collection(firestore, 'users'), where('id', 'in', studentIds));
  }, [firestore, classData.learnerIds]);
  const { data: studentsInClass, isLoading: areStudentsInClassLoading } = useCollection<User>(studentsInClassQuery);

  // Get all students in the system for the "add" dialog
  const allStudentsQuery = useMemoFirebase(() => query(collection(firestore, 'users'), where('role', '==', 'student')), [firestore]);
  const { data: allStudents, isLoading: areAllStudentsLoading } = useCollection<User>(allStudentsQuery);

  const [studentsToAdd, setStudentsToAdd] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const availableStudents = useMemo(() => {
    if (!allStudents) return [];
    const studentIdsInClass = new Set(classData.learnerIds || []);
    return allStudents.filter(student => 
        !studentIdsInClass.has(student.id) && 
        (student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) || 
         student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
         student.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [allStudents, classData.learnerIds, searchTerm]);
  
  const handleAddStudents = async () => {
    if (studentsToAdd.length === 0) {
      toast({ title: 'No students selected', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      await updateDoc(classRef, {
        learnerIds: arrayUnion(...studentsToAdd)
      });
      toast({ title: 'Students added successfully!' });
      setStudentsToAdd([]);
      setSearchTerm('');
    } catch (error: any) {
      toast({ title: 'Failed to add students', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    setIsSubmitting(true);
    try {
        await updateDoc(classRef, {
            learnerIds: arrayRemove(studentId)
        });
        toast({ title: 'Student removed successfully' });
    } catch (error: any) {
        toast({ title: 'Failed to remove student', description: error.message, variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
    }
  };

  const getInitials = (user: User) => {
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    return `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase() || 'U';
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Student Roster</CardTitle>
          <CardDescription>Manage students in this class.</CardDescription>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button><UserPlus className="mr-2 h-4 w-4" /> Add Students</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Students to Class</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <Input placeholder="Search students by name or email..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              <ScrollArea className="h-72">
                <div className="flex flex-col gap-4 p-4">
                  {areAllStudentsLoading ? <Loader2 className="mx-auto my-4 h-6 w-6 animate-spin" /> :
                   availableStudents.length > 0 ? availableStudents.map(student => (
                    <div key={student.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`student-${student.id}`} 
                        checked={studentsToAdd.includes(student.id)}
                        onCheckedChange={checked => {
                          setStudentsToAdd(prev => checked ? [...prev, student.id] : prev.filter(id => id !== student.id));
                        }}
                      />
                      <Label htmlFor={`student-${student.id}`} className="flex-1 font-normal">
                        {student.firstName} {student.lastName} ({student.email})
                      </Label>
                    </div>
                  )) : <p className="text-center text-sm text-muted-foreground">No students found or all students are already in the class.</p>}
                </div>
              </ScrollArea>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleAddStudents} disabled={isSubmitting || studentsToAdd.length === 0}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : `Add ${studentsToAdd.length} Student(s)`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {areStudentsInClassLoading ? (
            <div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
            <div className="space-y-4">
              {studentsInClass && studentsInClass.length > 0 ? (
                studentsInClass.map(student => (
                    <div key={student.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                        <div className="flex items-center gap-3">
                           <Avatar>
                             <AvatarImage src={student.avatarUrl} />
                             <AvatarFallback>{getInitials(student)}</AvatarFallback>
                           </Avatar>
                           <div>
                            <p className="font-medium">{student.firstName} {student.lastName}</p>
                            <p className="text-sm text-muted-foreground">{student.email}</p>
                           </div>
                        </div>
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" disabled={isSubmitting}><UserX className="h-4 w-4 text-destructive" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will remove {student.firstName} {student.lastName} from the class. They will no longer have access to assignments.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleRemoveStudent(student.id)} className="bg-destructive hover:bg-destructive/90">Remove</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                ))
              ) : (
                <p className="text-center text-sm text-muted-foreground py-8">No students have been added to this class yet.</p>
              )}
            </div>
        )}
      </CardContent>
    </Card>
  );
}


export default function ClassDetailsPage() {
  const params = useParams();
  const classId = params.classId as string;

  const { user, loading: isUserLoading } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
  const { data: userProfile, isLoading: isUserProfileLoading } = useDoc<User>(userProfileRef);
  
  const classRef = useMemoFirebase(() => (user && classId ? doc(firestore, 'classes', classId) : null), [firestore, classId, user]);
  const { data: classData, isLoading: isClassLoading } = useDoc<Class>(classRef);

  const isLoading = isUserLoading || isUserProfileLoading || isClassLoading;

  const renderContent = () => {
    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-16">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!classData || !userProfile || !user) {
        return <Card><CardContent className="p-8 text-center text-muted-foreground">Class not found or you do not have permission to view it.</CardContent></Card>;
    }
    
    // Teacher View
    if (userProfile.role === 'teacher' && classData.teacherId === user.uid) {
        return <TeacherClassView classData={classData} />;
    }

    // Student View
    if (userProfile.role === 'student' && classData.learnerIds.includes(user.uid)) {
        return <StudentClassView classId={classId} userId={user.uid} />;
    }

    return <Card><CardContent className="p-8 text-center text-muted-foreground">You are not enrolled in this class.</CardContent></Card>;
  }

  return (
    <AppLayout>
      <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
        <Card>
            <CardHeader>
            <CardTitle className="text-2xl">{isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : classData?.name}</CardTitle>
            {!isLoading && classData && (
                <CardDescription>
                    <Badge variant="secondary" className="mr-2">Grade {classData.grade}</Badge>
                    {classData.subject}
                </CardDescription>
            )}
            </CardHeader>
        </Card>
        
        {renderContent()}

      </div>
    </AppLayout>
  );
}
