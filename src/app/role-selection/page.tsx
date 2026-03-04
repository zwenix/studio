'use client';

import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useAuth } from '@/firebase';
import { GraduationCap, School, Users, Loader2, Shield, Star, Sparkles } from 'lucide-react';
import AuthGuard from '@/components/auth-guard';
import { doc, writeBatch, getDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

type Role = 'teacher' | 'student' | 'parent' | 'admin';

const ROLES_CONFIG = [
  {
    role: 'teacher' as Role,
    title: 'Teacher',
    icon: GraduationCap,
    color: 'bg-purple-500',
    desc: 'Create magic lessons and grade homework!',
  },
  {
    role: 'student' as Role,
    title: 'Student',
    icon: School,
    color: 'bg-blue-500',
    desc: 'Start your learning adventure and talk to AI!',
  },
  {
    role: 'parent' as Role,
    title: 'Parent',
    icon: Users,
    color: 'bg-green-500',
    desc: 'Watch your child grow and chat with teachers!',
  },
  {
    role: 'admin' as Role,
    title: 'Admin',
    icon: Shield,
    color: 'bg-slate-600',
    desc: 'Manage the magical kingdom of EduAI!',
  },
];

export default function RoleSelectionPage() {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState<Role | null>(null);
  const [isClicking, setIsClicking] = useState<Role | null>(null);

  const handleRoleSelect = async (role: Role) => {
    if (!user || !firestore || !auth.currentUser) return;

    setIsClicking(role);
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

      // Poll to confirm data is readable before redirecting
      let docExists = false;
      for (let i = 0; i < 10; i++) {
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          docExists = true;
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      if (!docExists) {
        throw new Error("Confirmation failed. Please try again.");
      }

      if (!user.displayName && firstName) {
        await updateProfile(auth.currentUser, {
            displayName: `${firstName} ${lastName}`.trim()
        });
      }

      toast({
        title: 'Adventure Started!',
        description: `Welcome to the team, ${role}!`,
      });

      router.push('/dashboard');
    } catch (error: any) {
      console.error("Failed to save role:", error);
      toast({
        title: 'Error',
        description: error.message || 'Could not save your role.',
        variant: 'destructive',
      });
      setIsLoading(null);
      setIsClicking(null);
    }
  };

  return (
    <AuthGuard>
        <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-blue-500 to-indigo-600 flex items-center justify-center p-6 overflow-hidden relative">
            {/* Magical Background Decorations */}
            <div className="absolute inset-0 pointer-events-none">
                <Star className="absolute top-10 left-10 w-8 h-8 text-yellow-300 animate-pulse opacity-40" />
                <Star className="absolute top-1/4 right-20 w-12 h-12 text-yellow-200 animate-float opacity-30" />
                <Star className="absolute bottom-20 left-1/3 w-10 h-10 text-purple-300 animate-wiggle opacity-20" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-400/10 rounded-full blur-[120px]" />
            </div>

            <div className="max-w-5xl w-full relative z-10 text-white">
                <div className="text-center mb-12 animate-fadeInZoom">
                    <div className="inline-flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/20 px-4 py-2 rounded-full text-yellow-400 font-bold mb-6">
                        <Sparkles className="w-5 h-5" />
                        <span>Identity Selection</span>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-bold mb-4 font-patrick-hand">Choose Your <span className="text-yellow-400">Path!</span></h1>
                    <p className="text-xl md:text-2xl text-blue-100/80 font-medium">
                      Select your role to start your EduAI adventure.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {ROLES_CONFIG.map(({ role, title, icon: Icon, color, desc }) => (
                    <button
                      key={role}
                      onClick={() => handleRoleSelect(role)}
                      disabled={!!isLoading}
                      className={`
                        group relative flex flex-col items-center justify-center p-8 
                        bg-white/10 backdrop-blur-lg border border-white/20 rounded-[2.5rem] 
                        transition-all duration-300 transform
                        hover:scale-105 hover:bg-white/20 hover:shadow-2xl hover:border-white/40
                        active:scale-95 disabled:opacity-50
                        ${isClicking === role ? 'scale-95' : ''}
                      `}
                    >
                      <div className={`p-5 rounded-2xl ${color} mb-6 shadow-inner group-hover:animate-bounce text-white`}>
                          {isLoading === role ? (
                              <Loader2 className="h-10 w-10 animate-spin" />
                          ) : (
                              <Icon className="h-10 w-10" />
                          )}
                      </div>
                      <h3 className="text-2xl font-bold mb-3 font-patrick-hand">{title}</h3>
                      <p className="text-sm font-medium text-blue-100/70 text-center">{desc}</p>
                      
                      {/* Selection Glow */}
                      <div className="absolute inset-0 rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none ring-4 ring-yellow-400/20" />
                    </button>
                  ))}
                </div>

                <div className="mt-12 text-center animate-pulse">
                    <p className="text-sm text-blue-100/50 font-medium">
                        Signed in as: <span className="text-white">{user?.email}</span>
                    </p>
                </div>
            </div>
        </div>
    </AuthGuard>
  );
}
