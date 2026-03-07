'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Camera, Image as ImageIcon, Loader2, UploadCloud, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useStorage } from '@/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';
import Image from 'next/image';

interface AvatarUploadModalProps {
    user: import('firebase/auth').User;
    currentPhotoUrl: string | null;
    children: React.ReactNode;
    onUploadSuccess: (newUrl: string) => void;
}

export function AvatarUploadModal({ user, currentPhotoUrl, children, onUploadSuccess }: AvatarUploadModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(currentPhotoUrl);
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const storage = useStorage();
    const { toast } = useToast();

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const selected = acceptedFiles[0];
        if (selected) {
            if (selected.size > 5 * 1024 * 1024) {
                toast({ title: 'File too large', description: 'Please choose an image under 5MB.', variant: 'destructive' });
                return;
            }
            setFile(selected);
            const objectUrl = URL.createObjectURL(selected);
            setPreview(objectUrl);
        }
    }, [toast]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/jpeg': [], 'image/png': [], 'image/webp': [] },
        maxFiles: 1,
    });

    const handleUpload = async () => {
        if (!file || !storage || !user) return;

        setIsUploading(true);
        const fileExt = file.name.split('.').pop();
        const storageRef = ref(storage, `avatars/${user.uid}/profile.${fileExt}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on(
            'state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setProgress(progress);
            },
            (error) => {
                setIsUploading(false);
                toast({ title: 'Upload Failed', description: error.message, variant: 'destructive' });
            },
            async () => {
                try {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    await updateProfile(user, { photoURL: downloadURL });
                    onUploadSuccess(downloadURL);
                    setIsOpen(false);
                    setFile(null);
                    setProgress(0);
                    toast({ title: 'Success', description: 'Profile picture updated successfully!' });
                } catch (err: any) {
                    toast({ title: 'Display Update Failed', description: err.message, variant: 'destructive' });
                } finally {
                    setIsUploading(false);
                }
            }
        );
    };

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
        if (!open) {
            setFile(null);
            setPreview(currentPhotoUrl);
            setProgress(0);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Update Profile Picture</DialogTitle>
                    <DialogDescription>
                        Choose a new photo to personalize your profile. Max size 5MB.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col items-center gap-6 py-4">
                    <div
                        {...getRootProps()}
                        className={`w-full border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-4 cursor-pointer transition-colors duration-200 ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                            }`}
                    >
                        <input {...getInputProps()} />

                        <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-background shadow-lg group">
                            {preview ? (
                                <Image src={preview} alt="Preview" fill className="object-cover" />
                            ) : (
                                <div className="w-full h-full bg-muted flex items-center justify-center">
                                    <ImageIcon className="w-12 h-12 text-muted-foreground/50" />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Camera className="w-8 h-8 text-white" />
                            </div>
                        </div>

                        <div className="text-center space-y-1">
                            <p className="text-sm font-medium">
                                {isDragActive ? 'Drop your image here' : 'Drag & drop or click to select'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Supports JPG, PNG, WEBP
                            </p>
                        </div>
                    </div>

                    {isUploading && (
                        <div className="w-full space-y-2">
                            <div className="flex justify-between text-xs font-medium">
                                <span>Uploading...</span>
                                <span>{Math.round(progress)}%</span>
                            </div>
                            <div className="w-full bg-secondary rounded-full h-2">
                                <div
                                    className="bg-primary h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 w-full sm:justify-end">
                        <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isUploading}>
                            Cancel
                        </Button>
                        <Button onClick={handleUpload} disabled={!file || isUploading} className="min-w-[100px]">
                            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><UploadCloud className="w-4 h-4 mr-2" /> Save</>}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
