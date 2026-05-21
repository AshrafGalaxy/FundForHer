'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/app/auth-provider';
import { useFirestore, useStorage } from '@/firebase';
import { getProviderProfile, updateProviderProfile } from '@/server/db/user-data';
import type { ProviderProfile } from '@/server/db/user-data';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Loader2, ShieldCheck, UploadCloud, Building2, Globe, FileText, Camera, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

const KYC_BADGE: Record<string, { label: string; cls: string }> = {
  verified: { label: '✓ Verified', cls: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  pending: { label: '⏳ Under Review', cls: 'bg-amber-100 text-amber-700 border-amber-300' },
  rejected: { label: '✗ Rejected', cls: 'bg-red-100 text-red-700 border-red-300' },
  require_more_info: { label: '⚠ More Info Needed', cls: 'bg-orange-100 text-orange-700 border-orange-300' },
};

export default function ProviderProfilePage() {
  const authContext = useAuth();
  const db = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const router = useRouter();
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoProgress, setLogoProgress] = useState(0);

  // Editable fields
  const [companyName, setCompanyName] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [description, setDescription] = useState('');

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
  }, [user, db]);

  const handleLogoUpload = async (file: File) => {
    if (!storage || !user || !db) return;

    // Client-side validation
    const ALLOWED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!ALLOWED.includes(file.type)) {
      toast({ title: 'Invalid file type', description: 'Logo must be JPG, PNG, or WEBP.', variant: 'destructive' });
      return;
    }
    if (file.size > 1 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Logo must be under 1 MB.', variant: 'destructive' });
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

      {/* Logo + Identity Card */}
      <Card className="overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-primary/20 via-primary/10 to-secondary/20" />
        <CardContent className="relative pt-0 pb-6 px-6">
          {/* Logo upload area */}
          <div className="flex items-end gap-6 -mt-10 mb-6">
            <div className="relative">
              <Avatar className="w-20 h-20 border-4 border-background shadow-lg">
                {profile.logoUrl ? (
                  <AvatarImage src={profile.logoUrl} alt={profile.companyName} />
                ) : null}
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

          {/* Logo upload input (hidden) */}
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

          {/* Upload instructions */}
          <button
            onClick={() => logoInputRef.current?.click()}
            disabled={logoUploading}
            className="w-full border-2 border-dashed border-muted-foreground/20 rounded-xl p-4 text-center hover:border-primary/40 hover:bg-muted/30 transition-all group cursor-pointer"
          >
            <UploadCloud className="w-6 h-6 text-muted-foreground/50 group-hover:text-primary mx-auto mb-1.5 transition-colors" />
            <p className="text-sm text-muted-foreground">Click to upload company logo</p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">JPG, PNG, WEBP · Max 1 MB · Shown on all scholarship cards</p>
          </button>
        </CardContent>
      </Card>

      {/* Editable Fields */}
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
            <Textarea id="desc" placeholder="Briefly describe your organisation's scholarship mission..." className="h-24 resize-none" value={description} onChange={e => setDescription(e.target.value)} maxLength={400} />
            <p className="text-xs text-muted-foreground text-right">{description.length}/400</p>
          </div>

          <Separator />

          {/* Read-only fields */}
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
    </div>
  );
}
