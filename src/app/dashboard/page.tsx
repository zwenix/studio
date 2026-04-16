'use client';

import {
  BookOpen, Users, BarChart, PenSquare, Rocket, Sparkles,
  Star, Zap, ScanText, FlaskConical, Loader2,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AppLayout }        from '@/components/app-layout';
import { Button }           from '@/components/ui/button';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { PerformanceChart } from '@/components/dashboard/performance-chart';
import { MyClasses }        from '@/components/dashboard/my-classes';
import { Progress }         from '@/components/ui/progress';
import { useUser }          from '@/lib/supabase-hooks';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { User, Class, Assignment } from '@/lib/types';
import { format } from 'date-fns';

// ---------------------------------------------------------------------------
// FIX: removed Firebase imports (doc, collection, collectionGroup, query,
// where) that caused "X is not exported from '@/lib/supabase'" errors.
// Data is now fetched directly from Supabase.
// ---------------------------------------------------------------------------

// ── Student dashboard sub-view ─────────────────────────────────────────────
function StudentDashboardView({
  userProfile,
  classes,
  assignments,
}: {
  userProfile: User;
  classes: Class[] | null;
  assignments: Assignment[] | null;
}) {
  const averageScore = useMemo(() => {
    if (!assignments) return 0;
    const graded = assignments.filter(
      (a) => a.status === 'graded' && a.gradeReceived
    );
    if (graded.length === 0) return 0;
    const total = graded.reduce((acc, a) => {
      const score = parseInt(a.gradeReceived?.match(/\d+/)?.[0] || '0', 10);
      return acc + score;
    }, 0);
    return Math.round(total / graded.length);
  }, [assignments]);

  return (
    <div className="flex-1 space-y-8 p-4 sm:p-8 pt-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-indigo-600 to-blue-500 p-8 rounded-[3rem] text-white shadow-xl relative overflow-hidden group">
        <div className="relative z-10">
          <h1 className="text-4xl md:text-6xl font-bold font-patrick-hand mb-2 animate-fadeInZoom">
            Hey, {userProfile.firstName}! 👋
          </h1>
          <p className="text-xl md:text-2xl text-blue-100/80 font-medium">
            Ready for some learning magic today?
          </p>
        </div>
        <div className="relative z-10 shrink-0 group-hover:scale-110 transition-transform duration-500">
          <Rocket className="w-20 h-20 md:w-24 md:h-24 text-yellow-400 animate-float" />
        </div>
        <Star className="absolute top-4 right-1/4 w-6 h-6 text-white/20 animate-pulse" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardAction href="/mock-assessment" title="Practice Test"   desc="Test your skills!"    icon={FlaskConical} color="bg-orange-500" />
        <DashboardAction href="/ai-tutor"        title="AI Bot Tutor"    desc="Ask anything!"       icon={Sparkles}     color="bg-blue-500"   />
        <DashboardAction href="/ocr"             title="OCR Magic"       desc="Scan your work!"     icon={ScanText}     color="bg-pink-500"   />
        <DashboardAction href="/my-classes"      title="My Classes"      desc="See subjects!"       icon={Zap}          color="bg-green-500"  />
      </div>

      <div className="grid gap-8 md:grid-cols-7">
        <Card className="col-span-4 rounded-[2.5rem] shadow-xl border-none">
          <CardHeader>
            <CardTitle className="text-2xl font-bold font-patrick-hand">
              My Study Rocket 🚀
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="flex items-center justify-between p-6 bg-blue-50 dark:bg-blue-900/20 rounded-[2rem]">
              <div>
                <p className="text-xs font-bold text-blue-600 uppercase">Subjects</p>
                <p className="text-3xl font-bold">{classes?.length || 0}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-green-600 uppercase">Avg Score</p>
                <p className="text-3xl font-bold">{averageScore}%</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between font-bold">
                <span>Progress</span><span>{averageScore}%</span>
              </div>
              <Progress value={averageScore} className="h-6 rounded-full" />
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3 rounded-[2.5rem] shadow-xl border-none">
          <CardHeader>
            <CardTitle className="text-2xl font-bold font-patrick-hand">My Subjects</CardTitle>
          </CardHeader>
          <CardContent>
            <MyClasses classes={classes} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DashboardAction({
  href, title, desc, icon: Icon, color,
}: {
  href: string; title: string; desc: string;
  icon: React.ComponentType<{ className?: string }>; color: string;
}) {
  return (
    <Link href={href} className="group">
      <Card className={`h-full ${color} text-white rounded-[2rem] border-none shadow-lg transform transition hover:scale-105 active:scale-95`}>
        <CardContent className="p-6 flex flex-col items-center text-center gap-4">
          <div className="p-4 bg-white/20 rounded-2xl group-hover:animate-bounce">
            <Icon className="w-10 h-10" />
          </div>
          <div>
            <h3 className="text-2xl font-bold font-patrick-hand">{title}</h3>
            <p className="text-white/80 font-medium">{desc}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// ── Teacher quick-action card ──────────────────────────────────────────────
function TeacherQuickAction({
  href, label, icon: Icon,
}: {
  href: string; label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link href={href}>
      <Button variant="secondary" size="sm" className="w-full justify-start gap-2">
        <Icon className="h-4 w-4" />
        {label}
      </Button>
    </Link>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user, loading: authLoading } = useUser();
  const supabase = getSupabaseClient();

  const [userProfile,  setUserProfile]  = useState<User | null>(null);
  const [classes,      setClasses]      = useState<Class[] | null>(null);
  const [assignments,  setAssignments]  = useState<Assignment[] | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Load user profile
  useEffect(() => {
    if (!user) return;
    supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) setUserProfile(data as User);
        setProfileLoading(false);
      });
  }, [user, supabase]);

  // Load classes
  useEffect(() => {
    if (!user || !userProfile) return;
    const query = userProfile.role === 'teacher'
      ? supabase.from('classes').select('*').eq('teacherId', user.id)
      : supabase.from('classes').select('*').contains('learnerIds', [user.id]);

    query.then(({ data }) => setClasses((data as Class[]) ?? []));
  }, [user, userProfile, supabase]);

  // Load assignments
  useEffect(() => {
    if (!user || !userProfile) return;
    const query = userProfile.role === 'teacher'
      ? supabase.from('assignments').select('*').eq('teacherId', user.id)
      : supabase.from('assignments').select('*').eq('learnerId', user.id);

    query.then(({ data }) => setAssignments((data as Assignment[]) ?? []));
  }, [user, userProfile, supabase]);

  if (authLoading || profileLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin h-12 w-12" />
      </div>
    );
  }

  if (userProfile?.role === 'student') {
    return (
      <AppLayout>
        <StudentDashboardView
          userProfile={userProfile}
          classes={classes}
          assignments={assignments}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Welcome back, {userProfile?.firstName}!
        </h1>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Students</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {classes?.reduce((acc, c) => acc + (c.learnerIds?.length || 0), 0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{classes?.length || 0}</div>
            </CardContent>
          </Card>

          <Card className="bg-primary text-primary-foreground col-span-2">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              <TeacherQuickAction href="/content-generator" label="Create Content" icon={PenSquare} />
              <TeacherQuickAction href="/my-classes"        label="My Classes"     icon={Users}     />
              <TeacherQuickAction href="/reports"           label="Reports"        icon={BarChart}  />
              <TeacherQuickAction href="/ocr"               label="OCR Upload"     icon={ScanText}  />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Performance Overview</CardTitle>
              <CardDescription>Class average scores over time</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <PerformanceChart />
            </CardContent>
          </Card>

          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>My Classes</CardTitle>
              <CardDescription>
                You have {classes?.length || 0} active class(es)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MyClasses classes={classes} />
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
