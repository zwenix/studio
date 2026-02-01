'use client';
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Camera, FileUp, Loader2, ScanText, ClipboardCopy } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useToast } from '@/hooks/use-toast';
import { extractTextFromImage } from '@/ai/flows/extract-text-from-images';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


export default function OcrPage() {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [extractedText, setExtractedText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    // Camera state
    const [isCameraOpen, setCameraOpen] = useState(false);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

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

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': ['.jpeg', '.png', '.jpg', '.webp'] },
        multiple: false,
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
            // Stop camera stream when dialog is closed
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
            toast({ title: 'No file selected', description: 'Please upload an image to extract text.', variant: 'destructive' });
            return;
        }

        setIsLoading(true);
        setExtractedText('');

        try {
            const result = await extractTextFromImage({ photoDataUri: preview });
            setExtractedText(result.extractedText);
        } catch (error) {
            console.error('OCR failed:', error);
            toast({ title: 'Extraction Failed', description: 'Could not extract text from the image. Please try again.', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };
    
    const copyToClipboard = () => {
        navigator.clipboard.writeText(extractedText);
        toast({ title: "Copied to clipboard!" });
    };

    return (
        <AppLayout>
            <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
                <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center">
                    <ScanText className="mr-3 h-8 w-8" />
                    OCR & Handwriting Tool
                </h1>

                <div className="grid gap-8 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Upload Image</CardTitle>
                            <CardDescription>Upload an image with text or handwriting to convert it to digital text.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}>
                                <input {...getInputProps()} />
                                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                    <FileUp className="h-10 w-10" />
                                    {isDragActive ? <p>Drop the file here...</p> : <p>Drag & drop an image here, or click to select</p>}
                                </div>
                            </div>
                            {preview && (
                                <div className="mt-4">
                                    <h4 className="font-semibold mb-2">Preview:</h4>
                                    <img src={preview} alt="Preview" className="max-h-60 w-auto rounded-md border" />
                                </div>
                            )}
                            <div className="flex gap-4">
                                <Button onClick={handleExtract} disabled={!file || isLoading} className="w-full">
                                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScanText className="mr-2 h-4 w-4" />}
                                    Extract Text
                                </Button>
                                <Dialog open={isCameraOpen} onOpenChange={setCameraOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" className="w-full">
                                            <Camera className="mr-2 h-4 w-4" /> Use Camera
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Camera Upload</DialogTitle>
                                            <DialogDescription>Position the document in the frame and capture.</DialogDescription>
                                        </DialogHeader>
                                        {hasCameraPermission === false ? (
                                            <Alert variant="destructive">
                                                <AlertTitle>Camera Access Required</AlertTitle>
                                                <AlertDescription>Please allow camera access in your browser to use this feature.</AlertDescription>
                                            </Alert>
                                        ) : (
                                            <>
                                                <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay muted playsInline />
                                                <canvas ref={canvasRef} className="hidden" />
                                            </>
                                        )}
                                        <DialogFooter>
                                            <Button onClick={handleCapture} disabled={hasCameraPermission !== true}>Capture Photo</Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="flex flex-col">
                        <CardHeader>
                            <CardTitle>Extracted Text</CardTitle>
                            <CardDescription>The recognized text from your image will appear below.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col">
                            <div className="relative flex-1">
                                <Textarea
                                    readOnly
                                    value={isLoading ? 'Extracting text, please wait...' : extractedText}
                                    placeholder="Your extracted text will be displayed here."
                                    className="h-full resize-none"
                                />
                                {extractedText && (
                                    <Button size="icon" variant="ghost" className="absolute top-2 right-2" onClick={copyToClipboard}>
                                        <ClipboardCopy className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
