'use client';

import { useState, useEffect } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Loader2, Cog, Save } from 'lucide-react';
import type { Teacher } from '@/lib/types';

export default function SettingsPage() {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [signatureUrl, setSignatureUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const teacherRef = useMemoFirebase(() => user ? doc(firestore, 'teachers', user.uid) : null, [firestore, user]);
  const { data: teacherData, isLoading: isTeacherLoading } = useDoc<Teacher>(teacherRef);

  useEffect(() => {
    if (teacherData?.signatureUrl) {
      setSignatureUrl(teacherData.signatureUrl);
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
      await setDoc(teacherRef, { signatureUrl }, { merge: true });

      toast({
        title: 'Settings Saved!',
        description: 'Your signature has been updated.',
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

        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Teacher Profile</CardTitle>
            <CardDescription>
              Manage your personal information and preferences.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
          <CardFooter>
            <Button onClick={handleSaveSettings} disabled={isLoading || isTeacherLoading} className="w-full">
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Settings
            </Button>
          </CardFooter>
        </Card>
      </div>
    </AppLayout>
  );
}

// useRouter needs to be imported for client components
import { useRouter } from 'next/navigation';

