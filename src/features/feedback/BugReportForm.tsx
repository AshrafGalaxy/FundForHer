'use client';
import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDropzone } from 'react-dropzone';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Loader2, UploadCloud, X, Send } from 'lucide-react';
import { useFirestore, useAuth } from '@/firebase';
import { useStorage } from '@/firebase/index';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { cn } from '@/lib/utils';
import Image from 'next/image';

const bugFormSchema = z.object({
    title: z.string().min(5, "Title must be at least 5 characters.").max(100),
    description: z.string().min(10, "Please provide more details about the bug."),
    stepsToReproduce: z.string().optional(),
});

type BugFormValues = z.infer<typeof bugFormSchema>;

export function BugReportForm() {
    const [isLoading, setIsLoading] = useState(false);
    const [files, setFiles] = useState<File[]>([]);
    const [uploadProgress, setUploadProgress] = useState<number>(0);
    const { toast } = useToast();

    const db = useFirestore();
    const storage = useStorage();
    const auth = useAuth();

    const form = useForm<BugFormValues>({
        resolver: zodResolver(bugFormSchema),
        defaultValues: {
            title: '',
            description: '',
            stepsToReproduce: '',
        },
    });

    const onDrop = useCallback((acceptedFiles: File[]) => {
        // Append new files up to max of 3
        setFiles(prev => {
            const newFiles = [...prev, ...acceptedFiles];
            return newFiles.slice(0, 3); // Max 3 screenshots
        });
    }, []);

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/jpeg': [],
            'image/png': [],
            'image/webp': []
        },
        maxSize: 5 * 1024 * 1024, // 5MB
    });

    const uploadScreenshot = async (file: File): Promise<string> => {
        if (!storage) throw new Error("Storage not initialized");
        const user = auth?.currentUser;
        const uid = user?.uid || 'anonymous';
        // Create unique path
        const filePath = `bug_reports/${uid}/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, filePath);

        return new Promise((resolve, reject) => {
            const uploadTask = uploadBytesResumable(storageRef, file);
            uploadTask.on(
                'state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setUploadProgress(progress);
                },
                (error) => reject(error),
                async () => {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    resolve(downloadURL);
                }
            );
        });
    };

    async function onSubmit(values: BugFormValues) {
        if (!db) {
            toast({ title: "Error", description: "Database is unreachable.", variant: "destructive" });
            return;
        }

        setIsLoading(true);
        setUploadProgress(0);

        try {
            // Upload all images and collect URLs
            const imageUrls: string[] = [];
            for (let i = 0; i < files.length; i++) {
                setUploadProgress(1); // Set visual state to uploading
                const url = await uploadScreenshot(files[i]);
                imageUrls.push(url);
            }

            const user = auth?.currentUser;
            await addDoc(collection(db, 'reports'), {
                ...values,
                screenshots: imageUrls,
                userId: user?.uid || 'anonymous',
                userEmail: user?.email || 'anonymous',
                status: 'open',
                userAgent: navigator.userAgent,
                submittedAt: serverTimestamp(),
                type: 'bug'
            });

            // Trigger email notification
            await fetch('/api/notify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'bug',
                    userId: user?.uid || 'anonymous',
                    userEmail: user?.email || 'anonymous',
                    title: values.title,
                    description: values.description,
                    stepsToReproduce: values.stepsToReproduce,
                    screenshots: imageUrls,
                    userAgent: navigator.userAgent,
                })
            }).catch(e => console.error("Email notification failed", e));

            toast({
                title: 'Bug Report Submitted',
                description: 'Thank you! Our developer team has been notified.',
            });

            form.reset();
            setFiles([]);
            setUploadProgress(0);
        } catch (error) {
            console.error("Error submitting bug report:", error);
            toast({
                title: "Submission Failed",
                description: "There was a problem uploading your report or screenshots.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="p-1 md:p-6">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                    <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Issue Title</FormLabel>
                                <FormControl>
                                    <Input placeholder="E.g., Dashboard not loading on mobile" {...field} />
                                </FormControl>
                                <FormDescription>A brief summary of what went wrong.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Description</FormLabel>
                                <FormControl>
                                    <Textarea
                                        placeholder="Describe the issue in detail. What did you expect to happen?"
                                        className="min-h-[100px]"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="stepsToReproduce"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Steps to Reproduce (Optional but helpful)</FormLabel>
                                <FormControl>
                                    <Textarea
                                        placeholder="1. Go to page X... 2. Click button Y... 3. Error Z happens..."
                                        className="min-h-[80px]"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Screenshot Upload Area */}
                    <div className="space-y-3">
                        <FormLabel>Screenshots (Optional)</FormLabel>
                        <div
                            {...getRootProps()}
                            className={cn(
                                "border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer flex flex-col items-center justify-center gap-2",
                                isDragActive ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/50",
                                files.length >= 3 && "opacity-50 pointer-events-none"
                            )}
                        >
                            <input {...getInputProps()} />
                            <UploadCloud className="w-8 h-8 text-muted-foreground" />
                            <div className="text-sm font-medium">
                                {isDragActive ? "Drop images here" : "Drag & drop screenshots here, or click to select"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                Up to 3 images, 5MB max each (PNG, JPG, WEBP)
                            </div>
                        </div>

                        {/* Previews */}
                        {files.length > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                                {files.map((file, index) => (
                                    <div key={index} className="relative group rounded-lg overflow-hidden border border-border aspect-video bg-muted">
                                        <Image
                                            src={URL.createObjectURL(file)}
                                            alt={`Screenshot preview ${index + 1}`}
                                            fill
                                            className="object-cover"
                                        />
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                                            className="absolute top-2 right-2 bg-background/80 hover:bg-destructive hover:text-destructive-foreground p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {uploadProgress > 0 ? `Uploading (${Math.round(uploadProgress)}%)...` : "Submitting..."}
                            </>
                        ) : (
                            <>
                                <Send className="mr-2 h-4 w-4" />
                                Submit Bug Report
                            </>
                        )}
                    </Button>
                </form>
            </Form>
        </div>
    );
}
