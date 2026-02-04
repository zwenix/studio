'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Loader2, Cog, Save, Users, BarChart, Book, Mail } from 'lucide-react';
import type { Teacher } from '@/lib/types';

export default function SettingsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [signatureUrl, setSignatureUrl] = useState('');
  const [aiDifficultyAdaptation, setAiDifficultyAdaptation] = useState(false);
  const [culturalContextIntegration, setCulturalContextIntegration] = useState(false);
  const [parentNotifications, setParentNotifications] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  
  const teacherRef = useMemoFirebase(() => user ? doc(firestore, 'teachers', user.uid) : null, [firestore, user]);
  const { data: teacherData, isLoading: isTeacherLoading } = useDoc<Teacher>(teacherRef);

  useEffect(() => {
    if (teacherData) {
      setSignatureUrl(teacherData.signatureUrl || '');
      setAiDifficultyAdaptation(teacherData.aiDifficultyAdaptation ?? false);
      setCulturalContextIntegration(teacherData.culturalContextIntegration ?? false);
      setParentNotifications(teacherData.parentNotifications ?? false);
    }
  }, [teacherData]);

  const handleSaveSettings = async () => {
    if (!user || !teacherRef) {
      toast({
        title: 'Not logged in',
        description: 'You must be logged in to save settings.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      await setDoc(teacherRef, { 
        signatureUrl,
        aiDifficultyAdaptation,
        culturalContextIntegration,
        parentNotifications
      }, { merge: true });

      toast({
        title: 'Settings Saved!',
        description: 'Your settings have been successfully updated.',
      });
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      toast({
        title: 'Error Saving Settings',
        description: error.message || 'Could not save your settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
        <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center">
          <Cog className="mr-3 h-8 w-8" />
          Settings
        </h1>
        
        <div className="grid gap-8 md:grid-cols-2">
            <div className="space-y-8">
                <Card>
                  <CardHeader>
                    <CardTitle>Teacher Profile</CardTitle>
                    <CardDescription>
                      Manage your personal information and preferences.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isTeacherLoading ? (
                        <div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
                    ) : (
                        <div className="space-y-2">
                        <Label htmlFor="signature-url">Signature/Stamp Image URL</Label>
                        <Input
                            id="signature-url"
                            name="signature-url"
                            autoComplete='off'
                            placeholder="https://example.com/signature.png"
                            value={signatureUrl}
                            onChange={(e) => setSignatureUrl(e.target.value)}
                            disabled={isLoading}
                        />
                        <p className="text-sm text-muted-foreground">
                            Upload your signature or school stamp to an image hosting service (like <a href="https://imgbb.com/" target="_blank" rel="noopener noreferrer" className="underline">imgbb.com</a>) and paste the direct image URL here.
                        </p>
                        </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>AI Configuration</CardTitle>
                    <CardDescription>
                      Customize how the AI assistant behaves.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                     <div className="flex items-center justify-between">
                        <Label htmlFor="ai-difficulty" className="flex flex-col space-y-1">
                            <span>AI Difficulty Adaptation</span>
                            <span className="font-normal leading-snug text-muted-foreground text-xs">
                            Automatically adjust content difficulty based on student performance.
                            </span>
                        </Label>
                        <Switch
                            id="ai-difficulty"
                            checked={aiDifficultyAdaptation}
                            onCheckedChange={setAiDifficultyAdaptation}
                            disabled={isLoading || isTeacherLoading}
                        />
                     </div>
                     <Separator />
                     <div className="flex items-center justify-between">
                        <Label htmlFor="cultural-context" className="flex flex-col space-y-1">
                            <span>Cultural Context Integration</span>
                            <span className="font-normal leading-snug text-muted-foreground text-xs">
                            Use local examples and familiar cultural contexts in lessons.
                            </span>
                        </Label>
                        <Switch
                            id="cultural-context"
                            checked={culturalContextIntegration}
                            onCheckedChange={setCulturalContextIntegration}
                            disabled={isLoading || isTeacherLoading}
                        />
                     </div>
                      <Separator />
                     <div className="flex items-center justify-between">
                        <Label htmlFor="parent-notifications" className="flex flex-col space-y-1">
                            <span>Parent Notifications</span>
                            <span className="font-normal leading-snug text-muted-foreground text-xs">
                            Auto-notify parents of progress updates and attendance.
                            </span>
                        </Label>
                        <Switch
                            id="parent-notifications"
                            checked={parentNotifications}
                            onCheckedChange={setParentNotifications}
                            disabled={isLoading || isTeacherLoading}
                        />
                     </div>
                  </CardContent>
                </Card>
                 <Button onClick={handleSaveSettings} disabled={isLoading || isTeacherLoading} className="w-full">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save All Settings
                 </Button>
            </div>
            <div className="space-y-8">
                 <Card>
                    <CardHeader>
                        <CardTitle>Class Management</CardTitle>
                        <CardDescription>Quick actions for managing your classes.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                        <Button variant="outline" className="justify-start" asChild>
                            <Link href="/my-classes"><Users className="mr-2 h-4 w-4" />Manage Students</Link>
                        </Button>
                         <Button variant="outline" className="justify-start" disabled>
                            <BarChart className="mr-2 h-4 w-4" />Assessment Results
                        </Button>
                         <Button variant="outline" className="justify-start" disabled>
                           <Users className="mr-2 h-4 w-4" />Attendance Register
                        </Button>
                    </CardContent>
                 </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Teaching Tools</CardTitle>
                        <CardDescription>Shortcuts to your most-used tools.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                        <Button variant="outline" className="justify-start" asChild>
                            <Link href="/content-generator"><Book className="mr-2 h-4 w-4" />Lesson Planner</Link>
                        </Button>
                        <Button variant="outline" className="justify-start" asChild>
                            <Link href="/communication"><Mail className="mr-2 h-4 w-4" />Parent Communication</Link>
                        </Button>
                        <Button variant="outline" className="justify-start" disabled>
                            Content Library
                        </Button>
                         <Button variant="outline" className="justify-start" disabled>
                            Backup Data
                        </Button>
                    </CardContent>
                 </Card>
            </div>
        </div>
      </div>
    </AppLayout>
  );
}
