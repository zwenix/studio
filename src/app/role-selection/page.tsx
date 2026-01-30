'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useUser } from '@/firebase';
import { GraduationCap, School, User } from 'lucide-react';
import AuthGuard from '@/components/auth-guard';

type Role = 'teacher' | 'student' | 'parent';

export default function RoleSelectionPage() {
  const router = useRouter();
  const { user } = useUser();

  const handleRoleSelect = (role: Role) => {
    // In a real app, you would save this role to the user's profile in Firestore
    console.log(`User ${user?.uid} selected role: ${role}`);
    router.push('/dashboard');
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
              <Button variant="outline" size="lg" className="h-20 text-lg" onClick={() => handleRoleSelect('teacher')}>
                <GraduationCap className="mr-4 h-8 w-8" />
                I'm a Teacher
              </Button>
              <Button variant="outline" size="lg" className="h-20 text-lg" onClick={() => handleRoleSelect('student')}>
                <School className="mr-4 h-8 w-8" />
                I'm a Student
              </Button>
              <Button variant="outline" size="lg" className="h-20 text-lg" onClick={() => handleRoleSelect('parent')}>
                <User className="mr-4 h-8 w-8" />
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
