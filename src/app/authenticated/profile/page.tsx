
// src/app/authenticated/profile/page.tsx
'use client';
import { type UserProfile, updateUserProfile, getUserProfile } from '@/server/db/user-data';

import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { deleteAccount, logout } from '@/lib/auth';
import {
  LogOut, Edit, GraduationCap, BookUser, FileText, Shield, Trash2, AlertTriangle,
  Loader2, BadgeCheck, Briefcase, User as UserIcon, Pencil, Check, X,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { EditProfileForm } from '@/features/profile/EditProfileForm';
import { DownloadResumeButton } from '@/features/profile/DownloadResumeButton';
import { ScholarshipActivityChart } from '@/features/profile/ScholarshipActivityChart';
import { TiltCard } from '@/features/profile/TiltCard';
import { PersonalTab } from '@/features/profile/tabs/PersonalTab';
import { AcademicTab } from '@/features/profile/tabs/AcademicTab';
import { ExperienceTab } from '@/features/profile/tabs/ExperienceTab';
import { DocumentVaultTab } from '@/features/profile/tabs/DocumentVaultTab';
import { AvatarUploadModal } from '@/features/profile/AvatarUploadModal';
import { useAuth } from '@/app/auth-provider';
import { useAuth as useFirebaseAuth, useFirestore } from '@/firebase';
import { linkWithPopup, GoogleAuthProvider, updateProfile } from 'firebase/auth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import type { DocumentVaultEntry } from '@/server/db/user-data';

// ── Avatar Frame Styles ───────────────────────────────────────────────────────
const FRAMES = [
  { key: 'default',   label: '🔵 Default',   ring: 'ring-2 ring-background',                        locked: false },
  { key: 'community', label: '🌸 Community', ring: 'ring-2 ring-pink-400 ring-offset-2',             locked: false },
  { key: 'gold',      label: '🌟 Gold',       ring: 'ring-2 ring-amber-400 ring-offset-2',           locked: false },
  { key: 'verified',  label: '💎 Verified',   ring: 'ring-2 ring-blue-500 ring-offset-2 ring-offset-background', locked: false },
] as const;

type FrameKey = typeof FRAMES[number]['key'];

// ── Profile Completion ────────────────────────────────────────────────────────
function calculateCompletion(p: UserProfile): number {
  let score = 0;
  // Personal basics (10)
  if (p.fullName) score += 2; if (p.email) score += 2; if (p.phone) score += 2; if (p.dob) score += 2; if (p.address) score += 2;
  // Personal extended (15)
  if (p.gender) score += 3; if (p.category) score += 3; if (p.stateOfDomicile) score += 3; if (p.annualFamilyIncome) score += 3; if (p.languages?.length) score += 3;
  // Education (30)
  if (p.educationEntries?.length) { score += 20; if (p.educationEntries.length >= 2) score += 10; }
  else if (p.qualification) score += 10;
  // Test scores (5)
  if (p.testScores?.length) score += 5;
  // Experience (10)
  if (p.internships?.length || p.fellowships?.length) score += 10;
  // Awards (5)
  if (p.scholarshipsWon?.length || p.achievements?.length) score += 5;
  // Certifications (5)
  if (p.certifications?.length) score += 5;
  // Documents (15)
  if (p.documents?.length) {
    if (p.documents.length >= 2) score += 10;
    if (p.documents.length >= 5) score += 5;
  } else if (p.aadhar) score += 5;
  // Bio + Tagline (5)
  if (p.tagline) score += 2; if (p.bio) score += 3;
  return Math.min(score, 100);
}

// ── Inline text edit helper ───────────────────────────────────────────────────
function InlineEdit({ value, onSave, placeholder, maxLength, multiline = false, className }: {
  value: string; onSave: (v: string) => Promise<void>; placeholder: string; maxLength: number;
  multiline?: boolean; className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);

  const save = async () => {
    if (draft === value) { setEditing(false); return; }
    setSaving(true);
    try { await onSave(draft); setEditing(false); } finally { setSaving(false); }
  };

  if (editing) {
    const sharedProps = { ref, value: draft, maxLength, onChange: (e: any) => setDraft(e.target.value), onKeyDown: (e: any) => { if (!multiline && e.key === 'Enter') save(); if (e.key === 'Escape') { setEditing(false); setDraft(value); } }, className: cn('text-sm bg-card border rounded px-2 py-1 w-full', className), disabled: saving };
    return (
      <div className="flex items-start gap-2 w-full">
        {multiline ? <textarea {...sharedProps} rows={3} className={cn(sharedProps.className, 'resize-none')} /> : <input {...sharedProps} />}
        <div className="flex flex-col gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600" onClick={save} disabled={saving}>{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}</Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => { setEditing(false); setDraft(value); }}><X className="h-3.5 w-3.5" /></Button>
        </div>
      </div>
    );
  }

  return (
    <button className={cn('group text-left w-full flex items-center gap-1.5 text-sm', !value && 'text-muted-foreground italic', className)} onClick={() => setEditing(true)}>
      <span className="flex-1">{value || placeholder}</span>
      <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-60 shrink-0 transition-opacity" />
    </button>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const auth = useFirebaseAuth();
  const db = useFirestore();
  const authContext = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const authLoading = authContext ? authContext.loading : true;
  const user = authContext ? authContext.user : null;

  useEffect(() => {
    if (!authLoading && user && db) {
      setProfileLoading(true);
      getUserProfile(db, user.uid).then(p => setUserProfile(p)).catch(console.error).finally(() => setProfileLoading(false));
    } else if (!authLoading && !user) { setProfileLoading(false); }
  }, [authLoading, user, db]);

  const handleLogout = async () => { if (!auth) return; await logout(auth); router.push('/login'); };

  const handleDeleteAccount = async () => {
    if (!user || !auth || !db) return;
    setIsDeleting(true);
    try {
      await deleteAccount(auth, db, user.uid);
      toast({ title: 'Account Deleted', description: 'Your account has been permanently removed.' });
      router.push('/login');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Deletion Failed', description: err.message });
    } finally { setIsDeleting(false); }
  };

  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    const n = name.split(' ');
    return n.length > 1 ? `${n[0][0]}${n[n.length - 1][0]}` : name[0] || 'U';
  };

  // Generic single-field save
  const handleInlineSave = async (fieldKey: string, newValue: any) => {
    if (!user || !db || !userProfile) return;
    if (fieldKey === 'fullName' && newValue !== user.displayName) await updateProfile(user, { displayName: newValue }).catch(console.error);
    await updateUserProfile(db, user.uid, { [fieldKey]: newValue });
    setUserProfile(prev => prev ? { ...prev, [fieldKey]: newValue } : null);
    toast({ title: 'Saved ✓' });
  };

  // Batch section save
  const handleBatchSave = async (data: Partial<UserProfile>) => {
    if (!user || !db) return;
    await updateUserProfile(db, user.uid, data);
    setUserProfile(prev => prev ? { ...prev, ...data } : null);
    toast({ title: 'Section Saved ✓', description: 'Your profile has been updated.' });
  };

  if (authLoading || profileLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Skeleton className="h-[500px] w-full rounded-2xl" />
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!userProfile || !user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-16 bg-card rounded-2xl shadow">
          <h2 className="text-2xl font-headline font-semibold">Profile Not Found</h2>
          <p className="text-muted-foreground mt-2">Please try logging out and back in.</p>
          <Button onClick={handleLogout} variant="destructive" className="mt-4"><LogOut className="mr-2 h-4 w-4" /> Logout</Button>
        </div>
      </div>
    );
  }

  const completionPct = calculateCompletion(userProfile);
  const frame = FRAMES.find(f => f.key === (userProfile.avatarFrame ?? 'default')) ?? FRAMES[0];

  const tierBadge =
    completionPct === 100 ? <Badge className="bg-blue-600 text-white text-[10px] border-0">💎 Verified</Badge> :
    completionPct >= 70   ? <Badge className="bg-yellow-400 text-yellow-900 text-[10px] border-0">🥇 Gold</Badge> :
    completionPct >= 40   ? <Badge variant="secondary" className="text-[10px]">🥈 Silver</Badge> :
                             <Badge variant="outline" className="text-[10px]">🥉 Bronze</Badge>;

  return (
    <div className="bg-secondary/30 min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

          {/* ── LEFT SIDEBAR ─────────────────────────────────────────── */}
          <div className="lg:col-span-1 space-y-6">
            <TiltCard>
              <Card className="shadow-lg overflow-hidden">
                {/* Top gradient stripe */}
                <div className="h-24 bg-gradient-to-br from-theme-400 via-primary to-theme-600 relative">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.15),transparent)]" />
                </div>

                <CardContent className="px-5 pb-6 pt-0">
                  {/* Avatar */}
                  <AvatarUploadModal user={user} currentPhotoUrl={user.photoURL} onUploadSuccess={(url) => setUserProfile(p => p ? { ...p, photoURL: url } : null)}>
                    <div className="relative group cursor-pointer w-24 h-24 mx-auto -mt-12 mb-3">
                      <Avatar className={cn('h-24 w-24 border-4 border-background shadow-lg transition-transform group-hover:scale-105', frame.ring)}>
                        <AvatarImage src={user.photoURL ?? ''} alt={user.displayName ?? ''} className="object-cover" />
                        <AvatarFallback className="text-3xl font-bold bg-primary text-primary-foreground">{getInitials(user.displayName)}</AvatarFallback>
                      </Avatar>
                      <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Edit className="h-5 w-5 text-white" />
                      </div>
                    </div>
                  </AvatarUploadModal>

                  {/* Name + Tagline + Bio */}
                  <div className="text-center space-y-1 mb-4">
                    <h2 className="text-xl font-headline font-bold text-foreground">{userProfile.fullName}</h2>
                    <p className="text-xs text-muted-foreground">{userProfile.email}</p>
                    <InlineEdit value={userProfile.tagline ?? ''} onSave={v => handleInlineSave('tagline', v)} placeholder="+ Add your tagline (e.g. STEM researcher & change-maker)" maxLength={80} className="text-xs text-theme-600 dark:text-theme-400 font-medium text-center justify-center" />
                    <InlineEdit value={userProfile.bio ?? ''} onSave={v => handleInlineSave('bio', v)} placeholder="+ Add a short bio..." maxLength={300} multiline className="text-xs text-muted-foreground text-center justify-center" />
                  </div>

                  {/* Avatar Frame picker */}
                  <div className="mb-4">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2 text-center">Profile Frame</p>
                    <div className="flex justify-center gap-2 flex-wrap">
                      {FRAMES.map(f => (
                        <button
                          key={f.key}
                          onClick={() => handleInlineSave('avatarFrame', f.key)}
                          className={cn('text-[10px] px-2 py-1 rounded-full border transition-all', userProfile.avatarFrame === f.key || (!userProfile.avatarFrame && f.key === 'default') ? 'border-primary bg-primary/10 text-primary font-semibold' : 'border-border text-muted-foreground hover:border-primary/50')}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Completion */}
                  <div className="mb-4 bg-secondary/40 rounded-xl p-3 border">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-medium text-muted-foreground">Profile Status</span>
                      {tierBadge}
                    </div>
                    <Progress value={completionPct} className="h-2 [&>div]:bg-theme-500" />
                    <p className="text-xs text-center mt-1.5 font-semibold text-theme-600 dark:text-theme-400">{completionPct}% Complete</p>
                    {completionPct < 100 && (
                      <p className="text-[10px] text-muted-foreground text-center mt-1 flex items-center justify-center gap-1">
                        <AlertTriangle className="h-3 w-3 text-amber-500" /> Fill more sections to unlock better matches
                      </p>
                    )}
                  </div>

                  <DownloadResumeButton userProfile={userProfile} completionPercentage={completionPct} />

                  <EditProfileForm user={user} userProfile={userProfile} onProfileUpdate={setUserProfile} isOpen={isEditDialogOpen} setIsOpen={setIsEditDialogOpen}>
                    <Button onClick={() => setIsEditDialogOpen(true)} className="mt-3 w-full" variant="outline" size="sm">
                      <Edit className="mr-2 h-3.5 w-3.5" /> Quick Edit
                    </Button>
                  </EditProfileForm>

                  {/* Danger zone */}
                  <div className="mt-4 pt-4 border-t flex flex-col gap-2">
                    <Button onClick={handleLogout} variant="ghost" size="sm" className="w-full text-muted-foreground justify-start gap-2">
                      <LogOut className="h-4 w-4" /> Sign Out
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-full text-destructive/70 hover:text-destructive hover:bg-destructive/10 justify-start gap-2">
                          <Trash2 className="h-4 w-4" /> Delete Account
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                          <AlertDialogDescription>This permanently removes all your data. This action cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Delete Forever
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            </TiltCard>

            {/* Activity Chart */}
            <ScholarshipActivityChart userId={user.uid} userProfile={userProfile} />
          </div>

          {/* ── RIGHT TABBED CONTENT ─────────────────────────────────── */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="personal" className="w-full">
              <TabsList className="w-full grid grid-cols-4 mb-6 h-auto bg-card border rounded-xl p-1 shadow-sm">
                <TabsTrigger value="personal" className="flex-col gap-1 py-2.5 text-xs data-[state=active]:shadow-sm rounded-lg">
                  <UserIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Personal</span>
                </TabsTrigger>
                <TabsTrigger value="academic" className="flex-col gap-1 py-2.5 text-xs data-[state=active]:shadow-sm rounded-lg">
                  <GraduationCap className="h-4 w-4" />
                  <span className="hidden sm:inline">Academic</span>
                </TabsTrigger>
                <TabsTrigger value="experience" className="flex-col gap-1 py-2.5 text-xs data-[state=active]:shadow-sm rounded-lg">
                  <Briefcase className="h-4 w-4" />
                  <span className="hidden sm:inline">Experience</span>
                </TabsTrigger>
                <TabsTrigger value="documents" className="flex-col gap-1 py-2.5 text-xs data-[state=active]:shadow-sm rounded-lg">
                  <Shield className="h-4 w-4" />
                  <span className="hidden sm:inline">Documents</span>
                  {(userProfile.documents?.length ?? 0) > 0 && (
                    <Badge className="h-4 px-1 text-[9px] bg-emerald-500 text-white border-0 -mt-0.5">
                      {userProfile.documents!.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <Card className="shadow-sm border-border/60">
                <CardContent className="p-6 sm:p-8">
                  <TabsContent value="personal" className="mt-0">
                    <PersonalTab profile={userProfile} onSave={handleInlineSave} onBatchSave={handleBatchSave} />
                  </TabsContent>
                  <TabsContent value="academic" className="mt-0">
                    <AcademicTab profile={userProfile} onBatchSave={handleBatchSave} />
                  </TabsContent>
                  <TabsContent value="experience" className="mt-0">
                    <ExperienceTab profile={userProfile} onBatchSave={handleBatchSave} />
                  </TabsContent>
                  <TabsContent value="documents" className="mt-0">
                    <DocumentVaultTab
                      profile={userProfile}
                      onVaultUpdate={docs => setUserProfile(p => p ? { ...p, documents: docs } : null)}
                    />
                  </TabsContent>
                </CardContent>
              </Card>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
