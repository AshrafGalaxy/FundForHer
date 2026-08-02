'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/app/auth-provider';
import { useFirestore, useStorage, useAuth as useFirebaseAuth } from '@/firebase';
import { getProviderProfile, updateProviderProfile } from '@/server/db/user-data';
import type { ProviderProfile } from '@/server/db/user-data';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Loader2, ShieldCheck, UploadCloud, Building2, Globe, FileText,
  Camera, CheckCircle2, Trash2, AlertTriangle,
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { collection, query, where, getDocs, writeBatch, doc, deleteDoc } from 'firebase/firestore';
import { deleteUser } from 'firebase/auth';


const KYC_BADGE: Record<string, { label: string; cls: string }> = {
  verified:         { label: '✓ Verified',        cls: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  pending:          { label: '⏳ Under Review',    cls: 'bg-amber-100 text-amber-700 border-amber-300' },
  rejected:         { label: '✗ Rejected',         cls: 'bg-red-100 text-red-700 border-red-300' },
  require_more_info:{ label: '⚠ More Info Needed', cls: 'bg-orange-100 text-orange-700 border-orange-300' },
};

export default function ProviderProfilePage() {
  const authContext = useAuth();
  const db          = useFirestore();
  const storage     = useStorage();
  const firebaseAuth = useFirebaseAuth();
  const { toast }  = useToast();
  const router     = useRouter();
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile]           = useState<ProviderProfile | null>(null);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoProgress, setLogoProgress] = useState(0);
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Editable fields
  const [companyName,  setCompanyName]  = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [websiteUrl,   setWebsiteUrl]   = useState('');
  const [description,  setDescription]  = useState('');

  const user = authContext?.user;

  useEffect(() => {
    if (!user || !db) return;
    getProviderProfile(db, user.uid).then(p => {
      if (!p) { router.push('/provider/dashboard'); return; }
      setProfile(p);
      setCompanyName(p.companyName || '');
      setCompanyPhone(p.companyPhone || '');
      setWebsiteUrl(p.websiteUrl || '');
      setDescription(p.description || '');
      setLoading(false);
    });
  }, [user, db]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Logo upload ────────────────────────────────────────────────────────────
  const handleLogoUpload = async (file: File) => {
    if (!storage || !user || !db) return;
    const ALLOWED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!ALLOWED.includes(file.type)) {
      toast({ title: 'Invalid file type', description: 'Logo must be JPG, PNG, or WEBP.', variant: 'destructive' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Logo must be under 2 MB.', variant: 'destructive' });
      return;
    }
    setLogoUploading(true);
    const ext = file.name.split('.').pop();
    const storageRef = ref(storage, `provider-logos/${user.uid}/logo.${ext}`);
    const task = uploadBytesResumable(storageRef, file);
    task.on(
      'state_changed',
      snap => setLogoProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      err => {
        toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
        setLogoUploading(false);
      },
      async () => {
        const downloadURL = await getDownloadURL(task.snapshot.ref);
        await updateProviderProfile(db, user.uid, { logoUrl: downloadURL });
        setProfile(prev => prev ? { ...prev, logoUrl: downloadURL } : prev);
        toast({ title: 'Logo updated!', description: 'Your logo now appears on all your scholarship listings.' });
        setLogoUploading(false);
        setLogoProgress(0);
      },
    );
  };

  // ── Save profile details ──────────────────────────────────────────────────
  const handleSave = async () => {
    if (!db || !user) return;
    setSaving(true);
    try {
      await updateProviderProfile(db, user.uid, {
        companyName,
        companyPhone,
        websiteUrl: websiteUrl || null,
        description: description || null,
      });
      setProfile(prev => prev ? { ...prev, companyName, companyPhone, websiteUrl, description } : prev);
      toast({ title: 'Profile saved!', description: 'Your provider profile has been updated.' });
    } catch (err: any) {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // ── Delete entire provider account (cascade) ──────────────────────────────
  const handleDeleteAccount = async () => {
    if (!db || !user || !firebaseAuth) return;
    setDeletingAccount(true);
    try {
      // 1. Fetch all scholarships by this provider
      const schSnap = await getDocs(
        query(collection(db, 'scholarships'), where('providerId', '==', user.uid))
      );

      // 2. Fetch all applications for those scholarships
      const appDeletes: Promise<void>[] = [];
      for (const schDoc of schSnap.docs) {
        const appsSnap = await getDocs(
          query(collection(db, 'applications'), where('scholarshipId', '==', schDoc.id))
        );
        const allDocs = appsSnap.docs;
        // Batch in chunks of 499 (Firestore batch limit is 500)
        for (let i = 0; i < allDocs.length; i += 499) {
          const chunk = allDocs.slice(i, i + 499);
          const b = writeBatch(db);
          chunk.forEach(d => b.delete(d.ref));
          appDeletes.push(b.commit());
        }
      }
      await Promise.all(appDeletes);

      // 3. Batch-delete all scholarships
      if (schSnap.size > 0) {
        const schBatch = writeBatch(db);
        schSnap.docs.forEach(d => schBatch.delete(d.ref));
        await schBatch.commit();
      }

      // 4. Delete mentorship requests where mentorId === user.uid
      const mentorSnap = await getDocs(
        query(collection(db, 'mentorship_requests'), where('mentorId', '==', user.uid))
      );
      if (mentorSnap.size > 0) {
        const mb = writeBatch(db);
        mentorSnap.docs.forEach(d => mb.delete(d.ref));
        await mb.commit();
      }

      // 5. Delete provider Firestore document
      await deleteDoc(doc(db, 'providers', user.uid));

      // 6. Delete Firebase Auth account (must be last)
      await deleteUser(firebaseAuth.currentUser!);

      toast({
        title: 'Account Deleted',
        description: 'Your provider account and all associated data have been permanently removed.',
      });
      router.push('/provider/login');
    } catch (err: any) {
      // If auth deletion fails with requires-recent-login, guide user
      if (err.code === 'auth/requires-recent-login') {
        toast({
          title: 'Re-authentication Required',
          description: 'For security, please log out and log back in, then try deleting your account again.',
          variant: 'destructive',
        });
      } else {
        toast({ title: 'Delete Failed', description: err.message, variant: 'destructive' });
      }
    } finally {
      setDeletingAccount(false);
    }
  };

  // ── Loading / not found ──────────────────────────────────────────────────
  if (loading) return (
    <div className="flex justify-center items-center h-screen">
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
    </div>
  );
  if (!profile) return null;

  const badge = KYC_BADGE[profile.kycStatus] ?? KYC_BADGE.pending;

  return (
    <div className="container max-w-3xl mx-auto px-4 py-8 space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-headline font-bold">Provider Profile</h1>
        <p className="text-muted-foreground mt-1 text-sm">Manage your organisation details and branding.</p>
      </div>

      {/* ── Logo + Identity Card ─────────────────────────────────────────── */}
      <Card className="overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-primary/20 via-primary/10 to-secondary/20" />
        <CardContent className="relative pt-0 pb-6 px-6">
          <div className="flex items-end gap-6 -mt-10 mb-6">
            <div className="relative">
              <Avatar className="w-20 h-20 border-4 border-background shadow-lg">
                {profile.logoUrl && <AvatarImage src={profile.logoUrl} alt={profile.companyName} className="object-contain p-1" />}
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-2xl">
                  {profile.companyName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => logoInputRef.current?.click()}
                disabled={logoUploading}
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors"
                title="Upload logo"
              >
                {logoUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="pb-2">
              <h2 className="font-headline text-xl font-bold">{profile.companyName}</h2>
              <Badge className={cn('mt-1 text-xs border', badge.cls)}>{badge.label}</Badge>
            </div>
          </div>

          <input
            ref={logoInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); e.target.value = ''; }}
          />

          {logoUploading && (
            <div className="mb-4">
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-muted-foreground">Uploading logo...</span>
                <span>{logoProgress}%</span>
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${logoProgress}%` }} />
              </div>
            </div>
          )}

          <button
            onClick={() => logoInputRef.current?.click()}
            disabled={logoUploading}
            className="w-full border-2 border-dashed border-muted-foreground/20 rounded-xl p-4 text-center hover:border-primary/40 hover:bg-muted/30 transition-all group cursor-pointer"
          >
            <UploadCloud className="w-6 h-6 text-muted-foreground/50 group-hover:text-primary mx-auto mb-1.5 transition-colors" />
            <p className="text-sm text-muted-foreground">Click to upload company logo</p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">JPG, PNG, WEBP · Max 2 MB · Shown on all scholarship cards</p>
          </button>
        </CardContent>
      </Card>

      {/* ── Editable Organisation Fields ────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-lg flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" /> Organisation Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="cname">Company / Organisation Name</Label>
              <Input id="cname" value={companyName} onChange={e => setCompanyName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cphone">Contact Phone</Label>
              <Input id="cphone" value={companyPhone} onChange={e => setCompanyPhone(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="website" className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" /> Website URL
            </Label>
            <Input id="website" placeholder="https://yourorganisation.com" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="desc" className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Mission Statement / About
            </Label>
            <Textarea
              id="desc"
              placeholder="Briefly describe your organisation's scholarship mission..."
              className="h-24 resize-none"
              value={description}
              onChange={e => setDescription(e.target.value)}
              maxLength={400}
            />
            <p className="text-xs text-muted-foreground text-right">{description.length}/400</p>
          </div>

          <Separator />

          {/* Read-only KYC fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs uppercase tracking-wide">Registration Number</Label>
              <p className="text-sm font-mono bg-muted/40 border rounded-md px-3 py-2">{profile.registrationNumber || '—'}</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs uppercase tracking-wide">GST Number</Label>
              <p className="text-sm font-mono bg-muted/40 border rounded-md px-3 py-2">{profile.gstNumber || '—'}</p>
            </div>
          </div>

          {/* Organisation metadata */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs uppercase tracking-wide">Organisation Type</Label>
              <p className="text-sm bg-muted/40 border rounded-md px-3 py-2">{profile.orgType || '—'}</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs uppercase tracking-wide">State</Label>
              <p className="text-sm bg-muted/40 border rounded-md px-3 py-2">{profile.state || '—'}</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs uppercase tracking-wide">City</Label>
              <p className="text-sm bg-muted/40 border rounded-md px-3 py-2">{profile.city || '—'}</p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-muted-foreground/50" />
            Registration and GST numbers are locked after KYC verification. Contact support to update.
          </p>

          <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Save Changes
          </Button>
        </CardContent>
      </Card>

      {/* ── Danger Zone: Delete Account ─────────────────────────────────── */}
      <Card className="border-destructive/40 bg-destructive/5">
        <CardHeader>
          <CardTitle className="font-headline text-lg flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" /> Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-destructive/30 rounded-xl bg-background">
            <div>
              <p className="font-semibold text-sm">Delete Provider Account</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Permanently deletes your provider profile, <strong>all your scholarships</strong>, and{' '}
                <strong>all associated applications</strong>. This action cannot be undone.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="shrink-0 gap-2" disabled={deletingAccount}>
                  {deletingAccount ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Delete Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="w-5 h-5" /> Permanently Delete Account?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2">
                    <p>This will permanently and irrecoverably delete:</p>
                    <ul className="list-disc list-inside text-sm space-y-1 mt-2">
                      <li>Your provider profile ({profile.companyName})</li>
                      <li>All scholarships you have posted</li>
                      <li>All student applications received</li>
                      <li>All mentorship requests you received</li>
                      <li>Your login credentials</li>
                    </ul>
                    <p className="font-semibold text-destructive mt-3">
                      There is no way to recover this data once deleted.
                    </p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel — Keep Account</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={handleDeleteAccount}
                  >
                    Yes, Delete Everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
