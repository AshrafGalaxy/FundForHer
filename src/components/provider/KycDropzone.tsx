'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileText, Loader2, UploadCloud, X, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useStorage } from '@/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import type { User } from 'firebase/auth';

interface KycDropzoneProps {
    user: User;
    onUploadSuccess: (newUrl: string) => void;
}

export function KycDropzone({ user, onUploadSuccess }: KycDropzoneProps) {
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isSuccess, setIsSuccess] = useState(false);
    const storage = useStorage();
    const { toast } = useToast();

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const selected = acceptedFiles[0];
        if (selected) {
            if (selected.size > 10 * 1024 * 1024) {
                toast({ title: 'File too large', description: 'Please choose a document under 10MB.', variant: 'destructive' });
                return;
            }
            setFile(selected);
            setIsSuccess(false);
        }
    }, [toast]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'application/pdf': ['.pdf'], 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'] },
        maxFiles: 1,
    });

    const handleUpload = async () => {
        if (!file || !storage || !user) return;

        setIsUploading(true);
        const fileExt = file.name.split('.').pop();
        const storageRef = ref(storage, `kyc/${user.uid}/document.${fileExt}`);
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
                    onUploadSuccess(downloadURL);
                    setIsSuccess(true);
                    toast({ title: 'Success', description: 'KYC Document uploaded safely!' });
                } catch (err: any) {
                    toast({ title: 'Upload Sync Failed', description: err.message, variant: 'destructive' });
                } finally {
                    setIsUploading(false);
                }
            }
        );
    };

    return (
        <div className="flex flex-col items-center gap-6 py-4 w-full">
            <div
                {...getRootProps()}
                className={`w-full border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-4 cursor-pointer transition-colors duration-200 ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                    }`}
            >
                <input {...getInputProps()} />

                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                    <FileText className="w-8 h-8 text-primary" />
                </div>

                <div className="text-center space-y-1">
                    {file ? (
                        <p className="text-sm font-semibold text-primary truncate max-w-[250px]">
                            {file.name}
                        </p>
                    ) : (
                        <>
                            <p className="text-sm font-medium">
                                {isDragActive ? 'Drop your document here' : 'Drag & drop your GSTIN or Registration PDF'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Supports PDF, JPG, PNG (Max 10MB)
                            </p>
                        </>
                    )}

                </div>
            </div>

            {isUploading && (
                <div className="w-full space-y-2">
                    <div className="flex justify-between text-xs font-medium">
                        <span>Encrypting & Uploading...</span>
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

            {!isSuccess && file && !isUploading && (
                <Button onClick={handleUpload} className="w-full">
                    <UploadCloud className="w-4 h-4 mr-2" />
                    Securely Upload Document
                </Button>
            )}

            {isSuccess && (
                <div className="w-full flex items-center justify-center p-3 bg-green-500/10 text-green-600 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    <span className="font-medium text-sm">Document Verified & Secured</span>
                </div>
            )}
        </div>
    );
}
