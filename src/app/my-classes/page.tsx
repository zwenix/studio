'use client';

import { AppLayout } from '@/components/app-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, PlusCircle, ArrowUpRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import type { Class, User } from '@/lib/types';

export default function MyClassesPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  const { data: userProfile } = useDoc<User>(userProfileRef);

  const classesQuery = useMemoFirebase(() => {
    if (!user || !userProfile) return null;

    if (userProfile.role === 'teacher') {
      return query(collection(firestore, 'classes'), where('teacherId', '==', user.uid));
    }
    if (userProfile.role === 'student') {
      return query(collection(firestore, 'classes'), where('learnerIds', 'array-contains', user.uid));
    }
    return null;
  }, [firestore, user, userProfile]);

  const { data: classes, isLoading } = useCollection<Class>(classesQuery);

  return (
    <AppLayout>
      <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center">
            <Users className="mr-3 h-8 w-8" />
            My Classes
          </h1>
          {userProfile?.role === 'teacher' && (
            <Button asChild>
              <Link href="/my-classes/new">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add New Class
              </Link>
            </Button>
          )}
        </div>

        {isLoading && (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        )}

        {!isLoading && classes?.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <h3 className="text-xl font-medium">No classes found</h3>
              <p className="text-muted-foreground mt-2">
                {userProfile?.role === 'teacher' ? 'Get started by creating your first class.' : 'You have not been enrolled in any classes yet.'}
              </p>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6">
          {classes?.map((cls) => (
            <Card key={cls.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{cls.name}</CardTitle>
                  <CardDescription>
                    <Badge variant="secondary" className="mr-2">Grade {cls.grade}</Badge>
                    {cls.subject}
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/my-classes/${cls.id}`}>
                     View Class <ArrowUpRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                <h4 className="text-sm font-semibold mb-2 text-muted-foreground">{cls.learnerIds?.length || 0} Students</h4>
                <div className="flex flex-wrap gap-2">
                  {cls.learnerIds?.length > 0 ? (
                    <p className="text-sm text-muted-foreground">Student avatars would be shown here.</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">No students have been added to this class yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
