'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Mail, Send, Loader2, Plus } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/lib/supabase";
import { collection, query, where, addDoc, serverTimestamp, orderBy, doc, getDocs, writeBatch, limit, setDoc, documentId } // firebase/firestore removed - migrated to Supabase;
import type { Class, User, Parent, Conversation, ChatMessage } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNowStrict } from 'date-fns';

const getInitials = (firstName: string = '', lastName: string = '') => {
    return `${firstName.trim()[0] || ''}${lastName.trim()[0] || ''}`.toUpperCase() || 'U';
};

// --- New Message Dialog Component ---
function NewMessageDialog({ onConversationStarted }: { onConversationStarted: (conversationId: string) => void }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { data: userProfile } = useDoc<User>(useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]));

    const [open, setOpen] = useState(false);
    const [recipients, setRecipients] = useState<User[]>([]);
    const [isLoadingRecipients, setIsLoadingRecipients] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        // ✅ Guard: require both open, userProfile AND user before proceeding
        if (!open || !userProfile || !user) return;

        const fetchRecipients = async () => {
            setIsLoadingRecipients(true);
            let fetched: User[] = [];
            const userMap = new Map<string, User>();
            
            try {
                if (userProfile.role === 'teacher') {
                    // ✅ user is guaranteed non-null here due to the guard above
                    const classesQuery = query(collection(firestore, 'classes'), where('teacherId', '==', user.uid));
                    const classSnap = await getDocs(classesQuery);
                    const learnerIds = classSnap.docs.flatMap(d => (d.data() as Class).learnerIds);
                    if (learnerIds.length > 0) {
                         const learnersQuery = query(collection(firestore, 'users'), where(documentId(), 'in', learnerIds.slice(0, 30)));
                         const learnersSnap = await getDocs(learnersQuery);
                         learnersSnap.forEach(d => userMap.set(d.id, d.data() as User));

                         const parentsQuery = query(collection(firestore, 'parents'), where('childIds', 'array-contains-any', learnerIds.slice(0, 30)));
                         const parentsSnap = await getDocs(parentsQuery);
                         const parentUserIds = parentsSnap.docs.map(d => d.id);
                         if (parentUserIds.length > 0) {
                             const parentUsersQuery = query(collection(firestore, 'users'), where(documentId(), 'in', parentUserIds.slice(0, 30)));
                             const parentUsersSnap = await getDocs(parentUsersQuery);
                             parentUsersSnap.forEach(d => userMap.set(d.id, d.data() as User));
                         }
                    }
                } else if (userProfile.role === 'student') {
                    // ✅ user is guaranteed non-null here due to the guard above
                    const classesQuery = query(collection(firestore, 'classes'), where('learnerIds', 'array-contains', user.uid));
                    const classSnap = await getDocs(classesQuery);
                    const teacherIds = [...new Set(classSnap.docs.map(d => (d.data() as Class).teacherId))];
                    if (teacherIds.length > 0) {
                        const teachersQuery = query(collection(firestore, 'users'), where(documentId(), 'in', teacherIds.slice(0, 30)));
                        const teachersSnap = await getDocs(teachersQuery);
                        teachersSnap.forEach(d => userMap.set(d.id, d.data() as User));
                    }
                } else if (userProfile.role === 'parent') {
                    // ✅ user is guaranteed non-null here due to the guard above
                    const parentSnap = await getDocs(query(collection(firestore, 'parents'), where('userId', '==', user.uid)));
                    const childIds = parentSnap.docs.flatMap(d => (d.data() as Parent).childIds);
                     if (childIds.length > 0) {
                        const classesQuery = query(collection(firestore, 'classes'), where('learnerIds', 'array-contains-any', childIds.slice(0, 30)));
                        const classSnap = await getDocs(classesQuery);
                        const teacherIds = [...new Set(classSnap.docs.map(d => (d.data() as Class).teacherId))];
                         if (teacherIds.length > 0) {
                            const teachersQuery = query(collection(firestore, 'users'), where(documentId(), 'in', teacherIds.slice(0, 30)));
                            const teachersSnap = await getDocs(teachersQuery);
                            teachersSnap.forEach(d => userMap.set(d.id, d.data() as User));
                        }
                    }
                }
                fetched = Array.from(userMap.values());
            } catch (e: any) {
                console.error("Failed to fetch recipients:", e);
                toast({ title: "Error", description: "Could not load recipients.", variant: "destructive" });
            }
            
            setRecipients(fetched);
            setIsLoadingRecipients(false);
        };

        fetchRecipients();
    }, [open, userProfile, firestore, user, toast]);

    const handleSelectRecipient = async (recipient: User) => {
        if (!user || !userProfile) return;

        try {
            const participantIds = [user.uid, recipient.id].sort();
            const q = query(collection(firestore, 'conversations'), where('participantIds', '==', participantIds), limit(1));
            const existingConvoSnap = await getDocs(q);

            let convoId: string;
            if (!existingConvoSnap.empty) {
                convoId = existingConvoSnap.docs[0].id;
            } else {
                const newConvoRef = doc(collection(firestore, 'conversations'));
                const participantInfo = {
                    [user.uid]: { firstName: userProfile.firstName, lastName: userProfile.lastName, role: userProfile.role },
                    [recipient.id]: { firstName: recipient.firstName, lastName: recipient.lastName, role: recipient.role },
                };
                await setDoc(newConvoRef, {
                    id: newConvoRef.id,
                    participantIds,
                    participantInfo,
                    lastMessage: null,
                    updatedAt: serverTimestamp(),
                });
                convoId = newConvoRef.id;
            }

            onConversationStarted(convoId);
            setOpen(false);
        } catch (e: any) {
            console.error('Failed to start conversation:', e);
            toast({ title: 'Error', description: 'Could not start the conversation. Please try again.', variant: 'destructive' });
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2" /> New Message
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Start a new conversation</DialogTitle>
                    <DialogDescription>Select a person to message.</DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-72">
                    <div className="p-4 space-y-3">
                    {isLoadingRecipients && <div className="flex justify-center"><Loader2 className="animate-spin" /></div>}
                    {!isLoadingRecipients && recipients.length === 0 && <p className="text-center text-sm text-muted-foreground">No recipients found.</p>}
                    {recipients.map(r => (
                        <div key={r.id} onClick={() => handleSelectRecipient(r)} className="flex items-center gap-3 p-2 rounded-md hover:bg-accent cursor-pointer">
                            <Avatar>
                                <AvatarImage src={(r as any).avatarUrl} />
                                <AvatarFallback>{getInitials(r.firstName, r.lastName)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-semibold">{r.firstName} {r.lastName}</p>
                                <p className="text-sm text-muted-foreground capitalize">{r.role}</p>
                            </div>
                        </div>
                    ))}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}


// --- Main Communication Page Component ---
export default function CommunicationPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const conversationsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(firestore, 'conversations'), 
      where('participantIds', 'array-contains', user.uid)
    );
  }, [firestore, user]);
  const { data: conversations, isLoading: areConversationsLoading } = useCollection<Conversation>(conversationsQuery);
  
  const sortedConversations = useMemo(() => {
    if (!conversations) return [];
    return [...conversations].sort((a, b) => {
        const timeA = a.updatedAt?.toDate().getTime() || 0;
        const timeB = b.updatedAt?.toDate().getTime() || 0;
        return timeB - timeA;
    });
  }, [conversations]);

  const messagesQuery = useMemoFirebase(() => {
    if (!selectedConversationId) return null;
    return query(
      collection(firestore, 'conversations', selectedConversationId, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(50)
    );
  }, [firestore, selectedConversationId]);
  const { data: messages, isLoading: areMessagesLoading } = useCollection<ChatMessage>(messagesQuery);

  const selectedConversation = useMemo(() => {
      return conversations?.find(c => c.id === selectedConversationId);
  }, [conversations, selectedConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    // ✅ user null check already present here — good
    if (!newMessage.trim() || !selectedConversationId || !user) return;
    
    setIsSending(true);
    try {
        const batch = writeBatch(firestore);
        const conversationRef = doc(firestore, 'conversations', selectedConversationId);
        const messageRef = doc(collection(firestore, 'conversations', selectedConversationId, 'messages'));
        
        const timestamp = serverTimestamp();
        
        batch.set(messageRef, {
            senderId: user.uid,
            text: newMessage,
            createdAt: timestamp,
        });

        batch.update(conversationRef, {
            lastMessage: {
                text: newMessage,
                senderId: user.uid,
                timestamp: new Date(),
            },
            updatedAt: timestamp,
        });

        await batch.commit();
        setNewMessage('');
    } catch(error: any) {
        toast({ title: 'Failed to send message', description: error.message, variant: 'destructive' });
    } finally {
        setIsSending(false);
    }
  };

  const getOtherParticipant = (convo: Conversation) => {
      if (!user) return null;
      const otherId = convo.participantIds.find(id => id !== user.uid);
      return otherId ? convo.participantInfo[otherId] : null;
  }

  return (
    <AppLayout>
      <div className="flex-1 p-0 h-full">
         <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] h-full">
            {/* Left Panel: Conversation List */}
            <div className="flex flex-col border-r h-full bg-muted/50">
                 <div className="p-4 border-b">
                     <NewMessageDialog onConversationStarted={setSelectedConversationId} />
                 </div>
                 <ScrollArea className="flex-1">
                     {areConversationsLoading && <div className="p-4 text-center"><Loader2 className="animate-spin mx-auto"/></div>}
                     {sortedConversations.map(convo => {
                         const otherParticipant = getOtherParticipant(convo);
                         return (
                            <div 
                                key={convo.id} 
                                onClick={() => setSelectedConversationId(convo.id)}
                                className={`p-4 border-b cursor-pointer hover:bg-accent ${selectedConversationId === convo.id ? 'bg-accent' : ''}`}
                            >
                                <div className="flex items-center gap-3">
                                    <Avatar>
                                        <AvatarImage src={otherParticipant?.avatarUrl} />
                                        <AvatarFallback>{getInitials(otherParticipant?.firstName, otherParticipant?.lastName)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 overflow-hidden">
                                        <div className="flex justify-between">
                                            <p className="font-semibold truncate">{otherParticipant?.firstName} {otherParticipant?.lastName}</p>
                                            {convo.updatedAt && <p className="text-xs text-muted-foreground">{formatDistanceToNowStrict(convo.updatedAt.toDate())}</p>}
                                        </div>
                                        <p className="text-sm text-muted-foreground truncate">
                                          {convo.lastMessage?.senderId === user?.uid && 'You: '}
                                          {convo.lastMessage?.text}
                                        </p>
                                    </div>
                                </div>
                            </div>
                         )
                     })}
                     {!areConversationsLoading && conversations?.length === 0 && (
                         <div className="p-8 text-center text-muted-foreground">
                            <Mail className="mx-auto h-10 w-10 mb-2"/>
                            <p>No conversations yet. Start a new message.</p>
                         </div>
                     )}
                 </ScrollArea>
            </div>
            
            {/* Right Panel: Chat Window */}
            <div className="flex flex-col h-full">
                {selectedConversation ? (
                    <>
                    <CardHeader className="flex flex-row items-center gap-3 p-4 border-b">
                         <Avatar>
                            <AvatarImage src={getOtherParticipant(selectedConversation)?.avatarUrl} />
                            <AvatarFallback>{getInitials(getOtherParticipant(selectedConversation)?.firstName, getOtherParticipant(selectedConversation)?.lastName)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <CardTitle>{getOtherParticipant(selectedConversation)?.firstName} {getOtherParticipant(selectedConversation)?.lastName}</CardTitle>
                            <CardDescription className="capitalize">{getOtherParticipant(selectedConversation)?.role}</CardDescription>
                        </div>
                    </CardHeader>

                    <ScrollArea className="flex-1 p-4">
                        <div className="space-y-4">
                        {areMessagesLoading && <div className="p-4 text-center"><Loader2 className="animate-spin mx-auto"/></div>}
                        {messages?.map(message => (
                            <div key={message.id} className={`flex items-end gap-2 ${message.senderId === user?.uid ? 'justify-end' : ''}`}>
                                {message.senderId !== user?.uid && (
                                    <Avatar className="h-8 w-8 self-start">
                                        <AvatarImage src={getOtherParticipant(selectedConversation)?.avatarUrl} />
                                        <AvatarFallback>{getInitials(getOtherParticipant(selectedConversation)?.firstName, getOtherParticipant(selectedConversation)?.lastName)}</AvatarFallback>
                                    </Avatar>
                                )}
                                <div className={`rounded-lg px-4 py-2 max-w-[80%] ${message.senderId === user?.uid ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                    <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                        </div>
                    </ScrollArea>
                    <CardFooter className="p-4 border-t">
                        <div className="w-full flex items-center gap-2">
                          <Input 
                            placeholder="Type your message..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !isSending && handleSendMessage()}
                            disabled={isSending}
                          />
                          <Button onClick={handleSendMessage} disabled={isSending || !newMessage.trim()}>
                            {isSending ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4"/>}
                          </Button>
                        </div>
                    </CardFooter>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                        <Mail className="h-16 w-16 mb-4" />
                        <h2 className="text-xl font-semibold">Select a conversation</h2>
                        <p>Or start a new one to begin chatting.</p>
                    </div>
                )}
            </div>
         </div>
      </div>
    </AppLayout>
  );
}
