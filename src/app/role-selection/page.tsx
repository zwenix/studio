'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useUser, useFirestore, useAuth } from '@/firebase';
import { GraduationCap, School, User as UserIcon, Loader2 } from 'lucide-react';
import AuthGuard from '@/components/auth-guard';
import { doc, setDoc, writeBatch } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

type Role = 'teacher' | 'student' | 'parent';

export default function RoleSelectionPage() {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState<Role | null>(null);

  const handleRoleSelect = async (role: Role) => {
    if (!user || !firestore || !auth.currentUser) return;

    setIsLoading(role);
    try {
      const batch = writeBatch(firestore);

      // 1. Create/update the main user profile document
      const userRef = doc(firestore, 'users', user.uid);
      const names = user.displayName?.split(' ') || ['', ''];
      const firstName = names[0];
      const lastName = names.length > 1 ? names.slice(1).join(' ') : '';
      
      batch.set(userRef, {
        id: user.uid,
        email: user.email,
        firstName: firstName,
        lastName: lastName,
        role: role,
      }, { merge: true });

      // 2. Create the role-specific document
      if (role === 'teacher') {
        const teacherRef = doc(firestore, 'teachers', user.uid);
        batch.set(teacherRef, {
          id: user.uid,
          userId: user.uid,
          subjects: [],
          classIds: [],
        });
      } else if (role === 'student') {
        const learnerRef = doc(firestore, 'learners', user.uid);
        batch.set(learnerRef, {
            id: user.uid,
            userId: user.uid,
            grade: '',
            learningPreferences: '',
        });
      } else if (role === 'parent') {
        const parentRef = doc(firestore, 'parents', user.uid);
        batch.set(parentRef, {
            id: user.uid,
            userId: user.uid,
            childIds: [],
        });
      }
      
      // Commit the batch
      await batch.commit();

      // 3. Optionally update the auth user's display name if it's not set
      if (!user.displayName && firstName) {
        await updateProfile(auth.currentUser, {
            displayName: `${firstName} ${lastName}`.trim()
        });
      }

      toast({
        title: 'Role selected!',
        description: `You are now registered as a ${role}.`,
      });

      router.push('/dashboard');
    } catch (error: any) {
      console.error("Failed to save role:", error);
      toast({
        title: 'Error',
        description: 'Could not save your role. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <AuthGuard>
        <div className="flex flex-col items-center justify-center min-h-screen">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-headline">Welcome to EduAI!</CardTitle>
              <CardDescription>
                To get started, please select your role.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4">
              <Button variant="outline" size="lg" className="h-20 text-lg" onClick={() => handleRoleSelect('teacher')} disabled={!!isLoading}>
                {isLoading === 'teacher' ? <Loader2 className="mr-4 h-8 w-8 animate-spin" /> : <GraduationCap className="mr-4 h-8 w-8" />}
                I'm a Teacher
              </Button>
              <Button variant="outline" size="lg" className="h-20 text-lg" onClick={() => handleRoleSelect('student')} disabled={!!isLoading}>
                {isLoading === 'student' ? <Loader2 className="mr-4 h-8 w-8 animate-spin" /> : <School className="mr-4 h-8 w-8" />}
                I'm a Student
              </Button>
              <Button variant="outline" size="lg" className="h-20 text-lg" onClick={() => handleRoleSelect('parent')} disabled={!!isLoading}>
                {isLoading === 'parent' ? <Loader2 className="mr-4 h-8 w-8 animate-spin" /> : <UserIcon className="mr-4 h-8 w-8" />}
                I'm a Parent
              </Button>
            </CardContent>
             <CardFooter>
                 <p className="text-xs text-muted-foreground text-center w-full">Your role helps us personalize your experience.</p>
            </CardFooter>
          </Card>
        </div>
    </AuthGuard>
  );
}
