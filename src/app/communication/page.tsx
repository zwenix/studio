'use client';

import React, { useState, useMemo } from 'react';
import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Mail, Send, Loader2, Megaphone } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import type { Class, User, Announcement } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function CommunicationPage() {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const userProfileRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
  const { data: userProfile } = useDoc<User>(userProfileRef);

  const classesQuery = useMemoFirebase(() => {
    if (!user || !userProfile) return null;

    if (userProfile.role === 'teacher') {
      return query(collection(firestore, 'classes'), where('teacherId', '==', user.uid));
    }
    // For parents/students, find classes they are in
    return query(collection(firestore, 'classes'), where('learnerIds', 'array-contains', user.uid));
    
  }, [firestore, user, userProfile]);

  const { data: classes, isLoading: areClassesLoading } = useCollection<Class>(classesQuery);

  const announcementsQuery = useMemoFirebase(() => {
    if (!selectedClass) return null;
    return query(
        collection(firestore, 'classes', selectedClass.id, 'announcements'),
        orderBy('createdAt', 'desc')
    );
  }, [firestore, selectedClass]);
  
  const { data: announcements, isLoading: areAnnouncementsLoading } = useCollection<Announcement>(announcementsQuery);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedClass || !user) return;
    
    setIsSending(true);
    try {
        const announcementsCollection = collection(firestore, 'classes', selectedClass.id, 'announcements');
        await addDoc(announcementsCollection, {
            classId: selectedClass.id,
            teacherId: user.uid,
            message: newMessage,
            createdAt: serverTimestamp(),
        });
        setNewMessage('');
        toast({ title: 'Announcement sent!' });
    } catch(error: any) {
        toast({ title: 'Failed to send announcement', description: error.message, variant: 'destructive' });
    } finally {
        setIsSending(false);
    }
  };

  return (
    <AppLayout>
      <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6 h-full">
        <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center mb-4">
          <Mail className="mr-3 h-8 w-8" />
          Communication Portal
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100%-6rem)]">
          <Card className="md:col-span-1 flex flex-col">
            <CardHeader>
              <CardTitle>My Classes</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              {areClassesLoading ? <div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin"/></div> : (
                <div className="space-y-2">
                  {classes?.map(cls => (
                    <Button 
                      key={cls.id} 
                      variant={selectedClass?.id === cls.id ? 'default' : 'ghost'} 
                      className="w-full justify-start"
                      onClick={() => setSelectedClass(cls)}
                    >
                      {cls.name}
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="md:col-span-2 flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Megaphone className="mr-2"/>
                {selectedClass ? `${selectedClass.name} - Announcements` : 'Select a Class'}
              </CardTitle>
              <CardDescription>
                {selectedClass ? 'View announcements or post a new one.' : 'Select a class from the list to see announcements.'}
              </CardDescription>
            </CardHeader>
            <ScrollArea className="flex-1">
              <CardContent className="space-y-4">
                {areAnnouncementsLoading && <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin"/></div>}

                {!areAnnouncementsLoading && announcements && announcements.length === 0 && (
                    <div className="text-center text-muted-foreground p-8">No announcements for this class yet.</div>
                )}
                
                {!areAnnouncementsLoading && announcements?.map(announcement => (
                    <div key={announcement.id} className="p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm whitespace-pre-wrap">{announcement.message}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                           Posted on {announcement.createdAt ? format(announcement.createdAt.toDate(), 'PPP p') : '...'}
                        </p>
                    </div>
                ))}
              </CardContent>
            </ScrollArea>
            {userProfile?.role === 'teacher' && selectedClass && (
              <CardFooter className="pt-4 border-t">
                <div className="w-full space-y-2">
                  <Textarea 
                    placeholder="Type your announcement here..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    disabled={isSending}
                  />
                  <Button onClick={handleSendMessage} disabled={isSending || !newMessage.trim()} className="w-full">
                    {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4"/>}
                    Post Announcement
                  </Button>
                </div>
              </CardFooter>
            )}
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
