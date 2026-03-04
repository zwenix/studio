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
  { role: 'teacher' as Role, title: 'Teacher', icon: GraduationCap, color: 'bg-purple-500', desc: 'Create magic lessons and grade homework!' },
  { role: 'student' as Role, title: 'Student', icon: School, color: 'bg-blue-500', desc: 'Start your learning adventure and talk to AI!' },
  { role: 'parent' as Role, title: 'Parent', icon: Users, color: 'bg-green-500', desc: 'Watch your child grow and chat with teachers!' },
  { role: 'admin' as Role, title: 'Admin', icon: Shield, color: 'bg-slate-600', desc: 'Manage the magical kingdom of EduAI!' },
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
      
      batch.set(userRef, {
        id: user.uid,
        email: user.email,
        firstName: names[0],
        lastName: names.slice(1).join(' '),
        role: role,
      }, { merge: true });

      if (role === 'teacher') batch.set(doc(firestore, 'teachers', user.uid), { id: user.uid, userId: user.uid, subjects: [], classIds: [] });
      else if (role === 'student') batch.set(doc(firestore, 'learners', user.uid), { id: user.uid, userId: user.uid, grade: '', learningPreferences: '' });
      else if (role === 'parent') batch.set(doc(firestore, 'parents', user.uid), { id: user.uid, userId: user.uid, childIds: [] });
      
      await batch.commit();
      router.push('/dashboard');
    } catch (error: any) {
      toast({ title: 'Error', description: 'Could not save your role.', variant: 'destructive' });
      setIsLoading(null);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-blue-500 flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <Star className="absolute top-10 left-10 w-8 h-8 text-yellow-300 animate-pulse opacity-40" />
          <Star className="absolute bottom-20 right-1/3 w-10 h-10 text-purple-300 opacity-20" />
        </div>

        <div className="max-w-5xl w-full relative z-10 text-white">
          <div className="text-center mb-12 animate-fadeInZoom">
            <div className="inline-flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/20 px-4 py-2 rounded-full text-yellow-400 font-bold mb-6">
              <Sparkles className="w-5 h-5" />
              <span>Identity Selection</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-4 font-patrick-hand">Choose Your <span className="text-yellow-400">Path!</span></h1>
            <p className="text-xl md:text-2xl text-blue-100/80 font-medium">Select your role to start your adventure.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {ROLES_CONFIG.map(({ role, title, icon: Icon, color, desc }) => (
              <button
                key={role}
                onClick={() => handleRoleSelect(role)}
                disabled={!!isLoading}
                className="group relative flex flex-col items-center justify-center p-8 bg-white/10 backdrop-blur-lg border border-white/20 rounded-[2.5rem] transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                <div className={`p-5 rounded-2xl ${color} mb-6 shadow-inner group-hover:animate-bounce text-white`}>
                  {isLoading === role ? <Loader2 className="h-10 w-10 animate-spin" /> : <Icon className="h-10 w-10" />}
                </div>
                <h3 className="text-2xl font-bold mb-3 font-patrick-hand">{title}</h3>
                <p className="text-sm font-medium text-blue-100/70 text-center">{desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}