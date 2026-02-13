'use client';

import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useAuth } from '@/firebase';
import { GraduationCap, School, Users, Loader2, Shield } from 'lucide-react';
import AuthGuard from '@/components/auth-guard';
import { doc, writeBatch } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

type Role = 'teacher' | 'student' | 'parent' | 'admin';

const ROLES_CONFIG = [
  {
    role: 'teacher' as Role,
    title: 'Teacher',
    icon: GraduationCap,
    color: 'from-purple-500 to-pink-500',
    desc: 'Create lessons, grade homework, chat with AI',
  },
  {
    role: 'student' as Role,
    title: 'Student',
    icon: School,
    color: 'from-blue-500 to-cyan-500',
    desc: 'Access learning materials, submit homework, AI tutor',
  },
  {
    role: 'parent' as Role,
    title: 'Parent',
    icon: Users,
    color: 'from-green-500 to-teal-500',
    desc: 'View progress reports, communicate with teachers',
  },
  {
    role: 'admin' as Role,
    title: 'Admin',
    icon: Shield,
    color: 'from-slate-500 to-gray-700',
    desc: 'Manage users, data, and system settings',
  },
];

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
      
      await batch.commit();

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
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 p-6">
            <div className="max-w-4xl w-full">
                <h1 className="text-4xl md:text-5xl font-bold text-center mb-4 text-white font-headline">Choose Your Role</h1>
                <p className="text-center text-lg text-gray-300 mb-12">
                  Select the role that best fits you to access your personalized dashboard.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {ROLES_CONFIG.map(({ role, title, icon: Icon, color, desc }) => (
                    <button
                      key={role}
                      onClick={() => handleRoleSelect(role)}
                      disabled={!!isLoading}
                      className={`group relative overflow-hidden rounded-2xl shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl disabled:opacity-60 bg-gradient-to-br ${color}`}
                    >
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-10 bg-white transition-opacity"></div>
                      <div className="p-8 text-center text-white relative z-10 flex flex-col items-center justify-center h-full">
                          {isLoading === role ? (
                              <Loader2 className="h-12 w-12 mb-4 animate-spin" />
                          ) : (
                              <Icon className="h-12 w-12 mb-4" />
                          )}
                          <h3 className="text-2xl font-bold mb-3 font-headline">{title}</h3>
                          <p className="text-sm opacity-90 flex-grow">{desc}</p>
                      </div>
                    </button>
                  ))}
                </div>

                {isLoading && (
                  <div className="text-center mt-10">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
                      <p className="text-gray-300">Updating your access...</p>
                  </div>
                )}
                
                <div className="mt-12 text-center text-sm text-gray-400">
                    {user?.email && (
                        <p>Signed in as: <span className="font-medium text-white">{user.email}</span></p>
                    )}
                    <p className="text-xs mt-2 block">You can change your role later in settings.</p>
                </div>
            </div>
        </div>
    </AuthGuard>
  );
}
