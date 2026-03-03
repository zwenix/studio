'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { 
    Camera, 
    FileUp, 
    Loader2, 
    ScanText, 
    ClipboardCopy, 
    Save, 
    Printer, 
    GraduationCap, 
    ClipboardCheck, 
    Trash2, 
    Edit3,
    History,
    FileText,
    ArrowRight
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useToast } from '@/hooks/use-toast';
import { extractTextFromImage } from '@/ai/flows/extract-text-from-images';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, limit, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, getDocs, setDoc, where } from 'firebase/firestore';
import type { User as UserProfile, OcrUpload, Learner, Parent as ParentType } from '@/lib/types';
import { useRouter } from 'next/navigation';

const OCR_LIMITS = {
    teacher: 20,
    student: 5,
    parent: 1,
    admin: 100,
};

const CONTENT_TYPES = [
    "Assessment",
    "Exercise",
    "Lesson Plan",
    "Handwritten Note",
    "Homework",
    "Reading Material",
    "Memo",
    "Other"
];

export default function OcrPage() {
    const router = useRouter();
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    // User Profile
    const { data: userProfile } = useDoc<UserProfile>(useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]));

    // State
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [extractedText, setExtractedText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [contentType, setContentType] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);
    
    // History State
    const [isEditingId, setIsEditingId] = useState<string | null>(null);
    const [editedText, setEditingText] = useState('');

    // Send to Learner Dialog
    const [isSendOpen, setIsSendOpen] = useState(false);
    const [selectedLearnerId, setSelectedLearnerId] = useState('');
    const [isSendingToLearner, setIsSendingToLearner] = useState(false);

    // Camera state
    const [isCameraOpen, setCameraOpen] = useState(false);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // OCR History Query
    const ocrHistoryQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, 'users', user.uid, 'ocrUploads'), orderBy('createdAt', 'desc'));
    }, [firestore, user]);
    const { data: ocrHistory } = useCollection<OcrUpload>(ocrHistoryQuery);

    // Fetch Learners for "Send to" feature
    const learnersQuery = useMemoFirebase(() => {
        if (!userProfile) return null;
        if (userProfile.role === 'teacher') return query(collection(firestore, 'users'), where('role', '==', 'student'));
        if (userProfile.role === 'parent') {
            // This is complex, would normally fetch based on parent's childIds
            return null; 
        }
        return null;
    }, [firestore, userProfile]);
    const { data: allLearners } = useCollection<UserProfile>(learnersQuery);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            const currentFile = acceptedFiles[0];
            setFile(currentFile);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result as string);
            };
            reader.readAsDataURL(currentFile);
        }
    }, []);

    const { getRootProps, getInputProps, open, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': ['.jpeg', '.png', '.jpg', '.webp'] },
        multiple: false,
        noClick: true,
    });

    useEffect(() => {
        if (isCameraOpen) {
            const getCameraPermission = async () => {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                    setHasCameraPermission(true);
                    streamRef.current = stream;

                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                } catch (error) {
                    console.error('Error accessing camera:', error);
                    setHasCameraPermission(false);
                    toast({
                        variant: 'destructive',
                        title: 'Camera Access Denied',
                        description: 'Please enable camera permissions in your browser settings.',
                    });
                }
            };
            getCameraPermission();
        } else {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
        }
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, [isCameraOpen, toast]);

    const handleCapture = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        if (context) {
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/png');
            setPreview(dataUrl);
            fetch(dataUrl)
                .then(res => res.blob())
                .then(blob => {
                    const capturedFile = new File([blob], "capture.png", { type: "image/png" });
                    setFile(capturedFile);
                });
            setCameraOpen(false);
        }
    };

    const handleExtract = async () => {
        if (!file || !preview) {
            toast({ title: 'No file selected', description: 'Please upload an image.', variant: 'destructive' });
            return;
        }
        if (!contentType) {
            toast({ title: 'Type Required', description: 'Please specify the content type.', variant: 'destructive' });
            return;
        }

        setIsLoading(true);
        setExtractedText('');

        try {
            const result = await extractTextFromImage({ photoDataUri: preview });
            setExtractedText(result.extractedText);
        } catch (error) {
            toast({ title: 'Extraction Failed', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveToHistory = async () => {
        if (!extractedText || !user || !userProfile) return;
        setIsSaving(true);
        try {
            const userLimit = OCR_LIMITS[userProfile.role as keyof typeof OCR_LIMITS] || 5;
            const userOcrCollection = collection(firestore, 'users', user.uid, 'ocrUploads');
            
            // Check limits
            const snapshot = await getDocs(query(userOcrCollection, orderBy('createdAt', 'asc')));
            if (snapshot.size >= userLimit) {
                // Delete oldest
                const oldestDoc = snapshot.docs[0];
                await deleteDoc(doc(firestore, 'users', user.uid, 'ocrUploads', oldestDoc.id));
            }

            await addDoc(userOcrCollection, {
                userId: user.uid,
                contentType,
                text: extractedText,
                createdAt: serverTimestamp(),
            });

            toast({ title: 'Saved to History' });
        } catch (error: any) {
            toast({ title: 'Save Failed', description: error.message, variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSendToLearner = async () => {
        if (!selectedLearnerId || !extractedText || !user) return;
        setIsSendingToLearner(true);
        try {
            const recordRef = collection(firestore, 'learners', selectedLearnerId, 'academicRecords');
            await addDoc(recordRef, {
                learnerId: selectedLearnerId,
                senderId: user.uid,
                type: contentType,
                content: extractedText,
                createdAt: serverTimestamp(),
                teacherNotified: true, // Simulate notification
            });
            toast({ title: 'Sent to Learner Profile', description: 'This content is now part of the student\'s record.' });
            setIsSendOpen(false);
        } catch (error: any) {
            toast({ title: 'Sending Failed', variant: 'destructive' });
        } finally {
            setIsSendingToLearner(false);
        }
    };

    const handlePrint = (text: string, title: string = 'Extracted Text') => {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                    <head><title>${title}</title><style>body{font-family:sans-serif;padding:2rem;line-height:1.6;}h1{border-bottom:2px solid #eee;padding-bottom:1rem;}</style></head>
                    <body><h1>${title}</h1><pre style="white-space:pre-wrap;">${text}</pre></body>
                </html>
            `);
            printWindow.document.close();
            printWindow.print();
        }
    };

    const handleDelete = async (id: string) => {
        if (!user) return;
        try {
            await deleteDoc(doc(firestore, 'users', user.uid, 'ocrUploads', id));
            toast({ title: 'Item deleted' });
        } catch (e) {
            toast({ title: 'Delete failed', variant: 'destructive' });
        }
    };

    const handleUpdate = async () => {
        if (!user || !isEditingId) return;
        try {
            await updateDoc(doc(firestore, 'users', user.uid, 'ocrUploads', isEditingId), {
                text: editedText
            });
            toast({ title: 'Updated successfully' });
            setIsEditingId(null);
        } catch (e) {
            toast({ title: 'Update failed', variant: 'destructive' });
        }
    };

    return (
        <AppLayout>
            <div className="flex-1 space-y-8 p-4 sm:p-8 pt-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center">
                        <ScanText className="mr-3 h-8 w-8 text-primary" />
                        OCR & Handwriting Tool
                    </h1>
                    {userProfile && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
                            <History className="h-4 w-4" />
                            Storage: {ocrHistory?.length || 0} / {OCR_LIMITS[userProfile.role as keyof typeof OCR_LIMITS]}
                        </div>
                    )}
                </div>

                <div className="grid gap-8 md:grid-cols-2">
                    {/* Input Column */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>1. Select Content Type</CardTitle>
                                <CardDescription>Identify what you are scanning.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <Label>Content Category</Label>
                                    <Select value={contentType} onValueChange={setContentType}>
                                        <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                                        <SelectContent>
                                            {CONTENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>2. Upload or Capture</CardTitle>
                                <CardDescription>Provide an image with text or handwriting.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragActive ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}>
                                    <input {...getInputProps()} />
                                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                        <FileUp className="h-10 w-10" />
                                        <p>Drag & drop image or use buttons below</p>
                                    </div>
                                </div>
                                
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <Button onClick={open} variant="outline" className="flex-1">
                                        <FileUp className="mr-2 h-4 w-4" /> Upload
                                    </Button>
                                    <Dialog open={isCameraOpen} onOpenChange={setCameraOpen}>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" className="flex-1">
                                                <Camera className="mr-2 h-4 w-4" /> Camera
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader><DialogTitle>Camera Capture</DialogTitle></DialogHeader>
                                            {hasCameraPermission === false ? (
                                                <Alert variant="destructive"><AlertTitle>Access Required</AlertTitle></Alert>
                                            ) : (
                                                <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay muted playsInline />
                                            )}
                                            <DialogFooter><Button onClick={handleCapture}>Capture</Button></DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </div>

                                {preview && (
                                    <div className="mt-4 border rounded-md p-2 bg-muted/30">
                                        <img src={preview} alt="Preview" className="max-h-40 mx-auto rounded" />
                                    </div>
                                )}

                                <Button onClick={handleExtract} disabled={!file || isLoading || !contentType} className="w-full">
                                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScanText className="mr-2 h-4 w-4" />}
                                    Extract Text
                                </Button>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Result Column */}
                    <Card className="flex flex-col">
                        <CardHeader>
                            <CardTitle>3. Action Center</CardTitle>
                            <CardDescription>Extracted text results and tools.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col space-y-4">
                            <div className="relative flex-1">
                                <Textarea
                                    readOnly={!extractedText}
                                    value={isLoading ? 'Analyzing image...' : extractedText}
                                    onChange={(e) => setExtractedText(e.target.value)}
                                    placeholder="Extracted text will appear here."
                                    className="h-full min-h-[300px] resize-none"
                                />
                                {extractedText && (
                                    <Button size="icon" variant="ghost" className="absolute top-2 right-2" onClick={() => { navigator.clipboard.writeText(extractedText); toast({ title: "Copied!" }); }}>
                                        <ClipboardCopy className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>

                            {extractedText && (
                                <div className="grid grid-cols-2 gap-2">
                                    <Button variant="secondary" onClick={handleSaveToHistory} disabled={isSaving}>
                                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                        Save to History
                                    </Button>
                                    <Button variant="secondary" onClick={() => handlePrint(extractedText, contentType)}>
                                        <Printer className="mr-2 h-4 w-4" /> Print
                                    </Button>
                                    <Button variant="secondary" onClick={() => {
                                        // Pass to autograder via query or state management
                                        // For simplicity, we navigate and could potentially use a global store
                                        router.push('/autograding');
                                    }}>
                                        <ClipboardCheck className="mr-2 h-4 w-4" /> Autograde
                                    </Button>
                                    <Dialog open={isSendOpen} onOpenChange={setIsSendOpen}>
                                        <DialogTrigger asChild>
                                            <Button variant="secondary">
                                                <GraduationCap className="mr-2 h-4 w-4" /> Send to Learner
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>File to Learner Record</DialogTitle>
                                                <DialogDescription>Select a student to add this to their academic history.</DialogDescription>
                                            </DialogHeader>
                                            <div className="space-y-4 py-4">
                                                <Label>Select Student</Label>
                                                <Select value={selectedLearnerId} onValueChange={setSelectedLearnerId}>
                                                    <SelectTrigger><SelectValue placeholder="Choose learner..." /></SelectTrigger>
                                                    <SelectContent>
                                                        {allLearners?.map(l => <SelectItem key={l.id} value={l.id}>{l.firstName} {l.lastName}</SelectItem>)}
                                                        {(!allLearners || allLearners.length === 0) && <SelectItem value="none" disabled>No students found</SelectItem>}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <DialogFooter>
                                                <Button variant="outline" onClick={() => setIsSendOpen(false)}>Cancel</Button>
                                                <Button onClick={handleSendToLearner} disabled={!selectedLearnerId || isSendingToLearner}>
                                                    {isSendingToLearner ? <Loader2 className="h-4 w-4 animate-spin" /> : 'File Record'}
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* History Section */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <History className="h-5 w-5 text-primary" />
                            <CardTitle>Capture History</CardTitle>
                        </div>
                        <CardDescription>Your recently scanned documents and notes.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {!ocrHistory || ocrHistory.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                                    No saved items yet.
                                </div>
                            ) : (
                                ocrHistory.map(item => (
                                    <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors gap-4">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-primary/10 rounded-md">
                                                <FileText className="h-5 w-5 text-primary" />
                                            </div>
                                            <div>
                                                <p className="font-semibold">{item.contentType}</p>
                                                <p className="text-xs text-muted-foreground">{item.createdAt?.toDate().toLocaleString()}</p>
                                                <p className="text-sm line-clamp-1 mt-1">{item.text}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <Button variant="ghost" size="icon" onClick={() => {
                                                setIsEditingId(item.id);
                                                setEditingText(item.text);
                                            }}><Edit3 className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" onClick={() => handlePrint(item.text, item.contentType)}><Printer className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(item.id)}><Trash2 className="h-4 w-4" /></Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Edit Dialog */}
                <Dialog open={!!isEditingId} onOpenChange={(open) => !open && setIsEditingId(null)}>
                    <DialogContent className="max-w-2xl h-[70vh] flex flex-col">
                        <DialogHeader><DialogTitle>Edit Capture</DialogTitle></DialogHeader>
                        <div className="flex-1 py-4">
                            <Textarea 
                                className="h-full resize-none" 
                                value={editedText} 
                                onChange={(e) => setEditingText(e.target.value)}
                            />
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsEditingId(null)}>Cancel</Button>
                            <Button onClick={handleUpdate}>Update Changes</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
