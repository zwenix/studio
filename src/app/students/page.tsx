'use client';

import React, { useState } from 'react';
import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, UserPlus, Loader2, Edit2, Mail, GraduationCap } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { User as UserProfile } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function StudentsPage() {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', grade: '' });
  const [isLoading, setIsLoading] = useState(false);

  // Fetch all students
  const studentsQuery = useMemoFirebase(() => query(collection(firestore, 'users'), where('role', '==', 'student')), [firestore]);
  const { data: students, isLoading: areStudentsLoading } = useCollection<UserProfile>(studentsQuery);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.email) {
      toast({ title: 'Required Fields', description: 'Please fill in all details.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      if (isEditing) {
        // Update existing student
        const userRef = doc(firestore, 'users', isEditing.id);
        await updateDoc(userRef, {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
        });
        
        const learnerRef = doc(firestore, 'learners', isEditing.id);
        await setDoc(learnerRef, { grade: formData.grade }, { merge: true });

        toast({ title: 'Student updated successfully' });
      } else {
        // Create new student record (Simulation: Creating Firestore doc)
        // In a real app, this would use a Cloud Function to create Firebase Auth user
        const newStudentId = doc(collection(firestore, 'users')).id;
        const userRef = doc(firestore, 'users', newStudentId);
        
        await setDoc(userRef, {
          id: newStudentId,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          role: 'student',
          createdAt: serverTimestamp(),
        });

        const learnerRef = doc(firestore, 'learners', newStudentId);
        await setDoc(learnerRef, {
          id: newStudentId,
          userId: newStudentId,
          grade: formData.grade,
          learningPreferences: '',
        });

        toast({ title: 'Student record created!' });
      }
      setFormData({ firstName: '', lastName: '', email: '', grade: '' });
      setIsCreating(false);
      setIsEditing(null);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const startEdit = (student: UserProfile) => {
    setFormData({ 
        firstName: student.firstName, 
        lastName: student.lastName, 
        email: student.email,
        grade: '' // Grade would ideally be fetched from 'learners' doc
    });
    setIsEditing(student);
  };

  return (
    <AppLayout>
      <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center">
            <Users className="mr-3 h-8 w-8" />
            Student Management
          </h1>
          <Dialog open={isCreating || !!isEditing} onOpenChange={(open) => { if(!open) { setIsCreating(false); setIsEditing(null); } }}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsCreating(true)}><UserPlus className="mr-2 h-4 w-4" /> Add Student</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{isEditing ? 'Edit Student' : 'Add New Student'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} placeholder="John" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} placeholder="Doe" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="student@school.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="grade">Grade</Label>
                  <Select value={formData.grade} onValueChange={v => setFormData({...formData, grade: v})}>
                    <SelectTrigger><SelectValue placeholder="Select Grade" /></SelectTrigger>
                    <SelectContent>
                      {['R', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map(g => (
                        <SelectItem key={g} value={g}>Grade {g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading ? <Loader2 className="animate-spin" /> : (isEditing ? 'Update' : 'Create Student')}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Students</CardTitle>
            <CardDescription>View and manage all registered students in the system.</CardDescription>
          </CardHeader>
          <CardContent>
            {areStudentsLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students?.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={s.avatarUrl} />
                            <AvatarFallback>{s.firstName[0]}{s.lastName[0]}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{s.firstName} {s.lastName}</span>
                        </div>
                      </TableCell>
                      <TableCell>{s.email}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => startEdit(s)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {students?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No students found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
