'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore } from '@/firebase';
import { addDoc, collection, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { Loader2, PlusCircle } from 'lucide-react';
import { educationalData } from '@/lib/educational-data';

export default function NewClassPage() {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [subject, setSubject] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateClass = async () => {
    if (!name || !grade || !subject || !user) {
      toast({
        title: 'Missing Information',
        description: 'Please fill out all fields.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // 1. Create the class document
      const classesCollection = collection(firestore, 'classes');
      const newClassDoc = await addDoc(classesCollection, {
        name,
        grade,
        subject,
        teacherId: user.uid,
        learnerIds: [],
      });

      // 2. Add the new class ID to the teacher's list of classes
      const teacherRef = doc(firestore, 'teachers', user.uid);
      await updateDoc(teacherRef, {
        classIds: arrayUnion(newClassDoc.id),
      });

      toast({
        title: 'Class Created!',
        description: `"${name}" has been successfully created.`,
      });

      router.push('/my-classes');
    } catch (error: any) {
      console.error('Failed to create class:', error);
      toast({
        title: 'Error Creating Class',
        description: error.message || 'Could not create the class. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
        <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center">
          <PlusCircle className="mr-3 h-8 w-8" />
          Create a New Class
        </h1>

        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Class Details</CardTitle>
            <CardDescription>
              Enter the information for your new class.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="class-name">Class Name</Label>
              <Input
                id="class-name"
                name="class-name"
                autoComplete='off'
                placeholder="e.g., Grade 10 Mathematics - Period 2"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="grade">Grade</Label>
                <Select value={grade} onValueChange={setGrade} disabled={isLoading}>
                  <SelectTrigger id="grade">
                    <SelectValue placeholder="Select a grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(educationalData).map((g) => (
                      <SelectItem key={g} value={g}>
                        Grade {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                 <Input
                    id="subject"
                    name="subject"
                    autoComplete='off'
                    placeholder="e.g., Mathematics"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    disabled={isLoading}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleCreateClass} disabled={isLoading} className="w-full">
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                'Create Class'
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </AppLayout>
  );
}
