'use client';

import { useState, useRef } from 'react';
import { UploadCloud, FileText, Trash2, Eye, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useStorage } from '@/firebase';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { cn } from '@/lib/utils';
import type { DocumentVaultEntry } from '@/server/db/user-data';

const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const ACCEPTED_EXT = '.pdf,.jpg,.jpeg,.png';

interface DocumentUploadCardProps {
  userId: string;
  docType: string;
  label: string;
  description?: string;
  existing?: DocumentVaultEntry;
  onUploaded: (entry: DocumentVaultEntry) => void;
  onDeleted: () => void;
}

export function DocumentUploadCard({
  userId,
  docType,
  label,
  description,
  existing,
  onUploaded,
  onDeleted,
}: DocumentUploadCardProps) {
  const storage = useStorage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

  const handleFile = async (file: File) => {
    setError('');

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Only PDF, JPG, and PNG files are accepted.');
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError(`File exceeds the 2 MB limit (${(file.size / 1024 / 1024).toFixed(1)} MB).`);
      return;
    }
    if (!storage) { setError('Storage not available.'); return; }

    setUploading(true);
    const storagePath = `documents/${userId}/${docType}/${file.name}`;
    const storageRef = ref(storage, storagePath);
    const task = uploadBytesResumable(storageRef, file);

    task.on('state_changed',
      snap => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      err => { setError(err.message); setUploading(false); },
      async () => {
        // Capture the permanent downloadURL and store it in the vault entry
        // This eliminates redundant Storage reads on every preview open
        const downloadURL = await getDownloadURL(task.snapshot.ref);
        const entry: DocumentVaultEntry = {
          docType,
          label,
          storagePath,
          downloadURL,
          fileName: file.name,
          fileSizeBytes: file.size,
          uploadedAt: new Date().toISOString(),
        };
        onUploaded(entry);
        setUploading(false);
        setProgress(0);
      },
    );

  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleDelete = async () => {
    if (!storage || !existing) return;
    try {
      await deleteObject(ref(storage, existing.storagePath));
    } catch { /* file may already be gone */ }
    onDeleted();
  };

  const handlePreview = async () => {
    if (!existing) return;
    setPreviewOpen(true);
    // Use cached downloadURL to avoid redundant Storage read
    if (existing.downloadURL) {
      setPreviewUrl(existing.downloadURL);
      return;
    }
    if (!storage) return;
    setPreviewLoading(true);
    try {
      const url = await getDownloadURL(ref(storage, existing.storagePath));
      setPreviewUrl(url);
    } catch {
      setPreviewUrl('');
    } finally {
      setPreviewLoading(false);
    }
  };


  const sizeKB = existing ? Math.round(existing.fileSizeBytes / 1024) : 0;
  const uploadedDate = existing ? new Date(existing.uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

  return (
    <div
      className={cn(
        'border rounded-xl p-4 transition-all bg-card',
        existing ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-900/10' : 'border-dashed border-muted-foreground/30 hover:border-primary/40',
      )}
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className={cn('p-2 rounded-lg shrink-0 mt-0.5', existing ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600' : 'bg-secondary text-muted-foreground')}>
            {existing ? <CheckCircle2 className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground leading-tight">{label}</p>
            {existing ? (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {existing.fileName} · {sizeKB} KB · {uploadedDate}
              </p>
            ) : (
              description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            )}
            {error && (
              <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1 mt-1">
                <AlertCircle className="h-3 w-3 shrink-0" /> {error}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {existing ? (
            <>
              <Button type="button" variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-primary hover:text-primary" onClick={handlePreview}>
                <Eye className="h-3.5 w-3.5" /> Preview
              </Button>
              <Button type="button" variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                <UploadCloud className="h-3.5 w-3.5" /> Replace
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive/60 hover:text-destructive hover:bg-destructive/10" onClick={handleDelete}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : (
            <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
              {uploading ? `${progress}%` : 'Upload'}
            </Button>
          )}
        </div>
      </div>

      {uploading && (
        <div className="mt-3 h-1.5 bg-secondary rounded-full overflow-hidden">
          <div className="h-full bg-primary transition-all duration-300 rounded-full" style={{ width: `${progress}%` }} />
        </div>
      )}

      <input ref={fileInputRef} type="file" accept={ACCEPTED_EXT} className="hidden" onChange={handleInputChange} />

      {/* Lazy Preview Modal — only fetches URL when button clicked */}
      <Dialog open={previewOpen} onOpenChange={o => { setPreviewOpen(o); if (!o) setPreviewUrl(''); }}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-base truncate">{existing?.fileName}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-[60vh] flex items-center justify-center bg-secondary/30 rounded-lg overflow-hidden">
            {previewLoading ? (
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            ) : previewUrl ? (
              existing?.fileName?.endsWith('.pdf') ? (
                <iframe src={previewUrl} className="w-full h-[65vh] border-0 rounded" title={existing.fileName} />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt={existing?.fileName} className="max-w-full max-h-[65vh] object-contain rounded" />
              )
            ) : (
              <p className="text-sm text-muted-foreground">Could not load preview.</p>
            )}
          </div>
          {previewUrl && (
            <div className="flex justify-end">
              <Button asChild variant="outline" size="sm" className="gap-2">
                <a href={previewUrl} target="_blank" rel="noopener noreferrer">Open in New Tab</a>
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
