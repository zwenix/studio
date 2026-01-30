'use client';

import React, { useState } from 'react';
import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Mail, Send, PlusCircle } from 'lucide-react';
import { mockConversations, mockMessages } from '@/lib/mock-data';
import type { Conversation, Message } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function CommunicationPage() {
  const [conversations, setConversations] = useState<Conversation[]>(mockConversations);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>('conv1');
  const [messages, setMessages] = useState<{ [key: string]: Message[] }>(mockMessages);
  const [newMessage, setNewMessage] = useState('');

  const selectedConversation = conversations.find(c => c.id === selectedConversationId);
  const selectedMessages = selectedConversationId ? messages[selectedConversationId] || [] : [];

  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
    setConversations(convs => convs.map(c => c.id === id ? { ...c, unread: false } : c));
  };
  
  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversationId) return;

    const message: Message = {
      id: `m-${Date.now()}`,
      sender: 'me',
      content: newMessage,
      timestamp: 'Just now',
    };
    
    setMessages(prev => ({
      ...prev,
      [selectedConversationId]: [...(prev[selectedConversationId] || []), message]
    }));
    
    setNewMessage('');
  };

  return (
    <AppLayout>
      <div className="p-4 sm:p-8 pt-6 h-full flex flex-col">
        <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center mb-4">
          <Mail className="mr-3 h-8 w-8" />
          Communication Portal
        </h1>

        <div className="grid md:grid-cols-3 gap-8 flex-1">
          <Card className="md:col-span-1 flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Inbox</CardTitle>
              <Button size="icon" variant="ghost">
                <PlusCircle className="h-5 w-5" />
              </Button>
            </CardHeader>
            <CardContent className="p-0 flex-1">
              <ScrollArea className="h-full">
                <div className="space-y-1">
                  {conversations.map(conv => (
                    <button
                      key={conv.id}
                      onClick={() => handleSelectConversation(conv.id)}
                      className={cn(
                        "flex items-center gap-3 p-3 w-full text-left transition-colors hover:bg-muted",
                        selectedConversationId === conv.id && "bg-muted"
                      )}
                    >
                      <Avatar className="h-10 w-10 border">
                        <AvatarImage src={conv.participant.avatarUrl} alt={conv.participant.name} />
                        <AvatarFallback>{conv.participant.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 truncate">
                        <p className="font-semibold">{conv.participant.name}</p>
                        <p className="text-sm text-muted-foreground truncate">{conv.lastMessage}</p>
                      </div>
                      <div className="text-xs text-muted-foreground text-right">
                        <p>{conv.timestamp}</p>
                        {conv.unread && <div className="w-2 h-2 rounded-full bg-primary ml-auto mt-1"></div>}
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="md:col-span-2 flex flex-col h-full">
            {selectedConversation ? (
              <>
                <CardHeader className="border-b">
                  <CardTitle className="text-lg">{selectedConversation.participant.name}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
                  {selectedMessages.map((message) => (
                    <div key={message.id} className={`flex items-start gap-3 ${message.sender === 'me' ? 'justify-end' : ''}`}>
                      {message.sender === 'them' && (
                        <Avatar className="h-8 w-8 border">
                          <AvatarImage src={selectedConversation.participant.avatarUrl} />
                          <AvatarFallback>{selectedConversation.participant.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                      )}
                      <div className={cn("rounded-lg px-4 py-2 max-w-[80%]", message.sender === 'me' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        <p className="text-xs text-right mt-1 opacity-70">{message.timestamp}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
                <CardFooter className="p-4 border-t">
                    <div className="relative w-full">
                        <Textarea
                            placeholder="Type your message..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                            className="pr-24"
                            rows={1}
                        />
                        <Button onClick={handleSendMessage} className="absolute top-1/2 right-2 transform -translate-y-1/2">
                            <Send className="mr-2 h-4 w-4" /> Send
                        </Button>
                    </div>
                </CardFooter>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Mail className="h-12 w-12" />
                <p className="mt-4 text-center">Select a conversation to start chatting.</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
