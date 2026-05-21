'use client';

import { useState, useEffect, useRef, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth, useFirestore, useStorage } from '@/firebase';
import { doc, getDoc, setDoc, serverTimestamp, collection } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import type { Scholarship } from '@/lib/types';
import type { UserProfile } from '@/server/db/user-data';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2, ArrowLeft, Send, CheckCircle2, Wand2, FileText, Sparkles,
  MessageSquare, ShieldCheck, UploadCloud, X, FileIcon, ShieldAlert,
  ExternalLink, Globe, IndianRupee, Calendar, BookOpen, Target, Award,
  GraduationCap, LayoutDashboard, Clock, User, MapPin, Phone, Briefcase,
  ChevronDown, ChevronUp, Info, AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useCompletion } from '@ai-sdk/react';
import { useDropzone } from 'react-dropzone';
import { format, isValid } from 'date-fns';
import { CheckOddsWidget } from '@/components/scholarships/CheckOddsWidget';
import { cn } from '@/lib/utils';
import { computeMatchScore } from '@/lib/compute-match-score';

// ── Section Collapse wrapper ───────────────────────────────────────────────────
function FormSection({
  title, icon, defaultOpen = true, prefilled = false, optional = false, children,
}: {
  title: string; icon: React.ReactNode; defaultOpen?: boolean;
  prefilled?: boolean; optional?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border rounded-xl overflow-hidden shadow-sm">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 bg-secondary/30 hover:bg-secondary/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-primary">{icon}</span>
          <span className="font-semibold text-sm">{title}</span>
          {prefilled && (
            <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-0 gap-1">
              <Wand2 className="w-2.5 h-2.5" /> Auto-filled
            </Badge>
          )}
          {optional && (
            <Badge variant="outline" className="text-[10px] text-muted-foreground">Optional</Badge>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-5 space-y-4 bg-card">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Website Preview Modal ─────────────────────────────────────────────────────
function WebsiteModal({ url, title, onClose }: { url: string; title: string; onClose: () => void }) {
  const [iframeStatus, setIframeStatus] = useState<'loading' | 'loaded' | 'blocked'>('loading');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      if (iframeStatus === 'loading') setIframeStatus('blocked');
    }, 6000);
    return () => clearTimeout(timeoutRef.current);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex items-center justify-between gap-4 px-4 py-3 border-b bg-card shadow-sm shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="bg-primary/10 p-2 rounded-lg shrink-0"><Globe className="h-4 w-4 text-primary" /></div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{title}</p>
            <p className="text-xs text-muted-foreground truncate">{url}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button asChild variant="outline" size="sm" className="gap-2 hidden sm:flex">
            <a href={url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5" /> Open in New Tab</a>
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-9 w-9"><X className="h-4 w-4" /></Button>
        </div>
      </div>
      <div className="flex-1 relative overflow-hidden">
        {iframeStatus === 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 bg-background/80">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading official website...</p>
          </div>
        )}
        {iframeStatus === 'blocked' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 z-10 bg-background px-6 text-center">
            <div className="w-20 h-20 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <Globe className="h-10 w-10 text-orange-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-headline font-semibold">Website Preview Unavailable</h3>
              <p className="text-muted-foreground text-sm max-w-md">This website has disabled embedding for security reasons. Please open it directly in a new tab.</p>
              <p className="text-xs text-muted-foreground font-mono bg-secondary px-3 py-1.5 rounded-md break-all mt-2">{url}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild size="lg" className="gap-2 bg-theme-600 hover:bg-theme-700 text-white">
                <a href={url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /> Open Official Website</a>
              </Button>
              <Button variant="outline" size="lg" onClick={onClose}>Back to Application</Button>
            </div>
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={url}
          className={cn('w-full h-full border-0', iframeStatus === 'blocked' ? 'invisible' : '')}
          onLoad={() => {
            clearTimeout(timeoutRef.current);
            try {
              const d = iframeRef.current?.contentDocument;
              setIframeStatus(!d || d.body?.innerHTML === '' ? 'blocked' : 'loaded');
            } catch { setIframeStatus('blocked'); }
          }}
          title={`${title} — Official Website`}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>
    </div>
  );
}

// ── Scholarship Summary Sidebar ────────────────────────────────────────────────
function ScholarshipSummaryCard({ scholarship, matchScore }: { scholarship: Scholarship; matchScore?: number }) {
  const isExpired = scholarship.deadline && new Date(scholarship.deadline) < new Date();
  const deadlineStr = scholarship.deadline && isValid(new Date(scholarship.deadline))
    ? format(new Date(scholarship.deadline), 'MMM d, yyyy') : 'N/A';

  return (
    <Card className="bg-gradient-to-b from-theme-50/80 to-card dark:from-theme-900/30 border-theme-200 dark:border-theme-800 shadow-sm overflow-hidden">
      <div className="h-1 w-full bg-gradient-to-r from-theme-400 via-primary to-theme-600" />
      <CardHeader className="pb-3 pt-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base font-headline leading-snug line-clamp-2">{scholarship.title}</CardTitle>
            <CardDescription className="text-xs mt-1">{scholarship.provider}</CardDescription>
          </div>
          <Badge variant="outline" className={cn('shrink-0 text-[10px] font-semibold', isExpired ? 'border-red-400 text-red-500' : 'border-emerald-400 text-emerald-600 dark:text-emerald-400')}>
            {isExpired ? '⏱ Closed' : scholarship.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2.5 pb-4">
        <SummaryRow icon={<IndianRupee className="w-3.5 h-3.5" />} label="Award">
          <span style={{ fontFamily: 'sans-serif' }}>₹</span>{new Intl.NumberFormat('en-IN').format(scholarship.amount)}
        </SummaryRow>
        <SummaryRow icon={<Calendar className="w-3.5 h-3.5" />} label="Deadline">
          <span className={cn(isExpired && 'text-red-500 font-semibold')}>{deadlineStr}</span>
        </SummaryRow>
        <SummaryRow icon={<Target className="w-3.5 h-3.5" />} label="Level">
          {Array.isArray(scholarship.eligibilityLevel) ? scholarship.eligibilityLevel.join(', ') : scholarship.eligibilityLevel}
        </SummaryRow>
        <SummaryRow icon={<BookOpen className="w-3.5 h-3.5" />} label="Field">
          {Array.isArray(scholarship.fieldOfStudy) ? scholarship.fieldOfStudy.slice(0, 2).join(', ') : scholarship.fieldOfStudy}
        </SummaryRow>
        <SummaryRow icon={<Award className="w-3.5 h-3.5" />} label="Type">{scholarship.scholarshipType}</SummaryRow>
        {matchScore !== undefined && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-muted-foreground">Your Match Score</span>
              <span className={cn('text-sm font-bold', matchScore >= 75 ? 'text-emerald-600' : matchScore >= 50 ? 'text-amber-600' : 'text-red-600')}>
                {matchScore}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-secondary overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-700', matchScore >= 75 ? 'bg-emerald-500' : matchScore >= 50 ? 'bg-amber-500' : 'bg-red-500')}
                style={{ width: `${matchScore}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const SummaryRow = ({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) => (
  <div className="flex items-start gap-2.5 text-xs">
    <span className="text-theme-500 dark:text-theme-400 mt-0.5 shrink-0">{icon}</span>
    <span className="text-muted-foreground w-14 shrink-0">{label}</span>
    <span className="font-semibold text-foreground flex-1">{children}</span>
  </div>
);

function NoScholarshipSelected() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="w-24 h-24 bg-theme-100 dark:bg-theme-900/50 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <GraduationCap className="w-12 h-12 text-theme-500" />
        </div>
        <div>
          <h1 className="text-2xl font-headline font-bold text-foreground mb-2">No Scholarship Selected</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            To apply, first browse the dashboard and click <strong>"Apply Now"</strong> on any open scholarship.
          </p>
        </div>
        <Separator />
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg" className="gap-2 bg-theme-600 hover:bg-theme-700 text-white rounded-xl">
            <Link href="/authenticated/dashboard"><LayoutDashboard className="h-4 w-4" /> Browse Scholarships</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="gap-2 rounded-xl">
            <Link href="/authenticated/applications"><FileText className="h-4 w-4" /> My Applications</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Build rich AI profile payload ─────────────────────────────────────────────
function buildRichProfile(profile: UserProfile) {
  const edu = profile.educationEntries ?? [];
  const latestEdu = edu[0];

  return {
    // Identity
    name: profile.fullName,
    gender: profile.gender,
    category: profile.category,
    religion: profile.religion,
    hasDisability: profile.category === 'PwD',
    // Location
    state: profile.stateOfDomicile,
    city: profile.city,
    // Financial
    annualFamilyIncome: profile.annualFamilyIncome,
    rationCardType: profile.rationCardType,
    // Education (latest entry) — using actual EducationEntry field names
    currentEducationLevel: latestEdu?.degreeLevel,
    currentInstitution: latestEdu?.institution,
    currentDegree: latestEdu?.degreeName,
    currentField: latestEdu?.specialisation,
    currentScore: latestEdu ? `${latestEdu.score} ${latestEdu.scoreType === 'Percentage' ? '%' : '/ ' + (latestEdu.scoreOutOf || '10')}` : null,
    currentGraduationYear: latestEdu?.endYear,
    educationHistory: edu.map(e => ({
      level: e.degreeLevel,
      degree: e.degreeName,
      field: e.specialisation,
      institution: e.institution,
      score: `${e.score} ${e.scoreType === 'Percentage' ? '%' : '/ ' + (e.scoreOutOf || '10')}`,
      year: e.endYear,
      status: e.status,
    })),
    // Skills & Achievements
    skills: [...(profile.technicalSkills ?? []), ...(profile.programmingLanguages ?? [])],
    softSkills: profile.softSkills,
    languages: profile.languages,
    certifications: (profile.certifications ?? []).map(c => c.name),
    achievements: (profile.achievements ?? []).map(a => `${a.activityName} (${a.level}, ${a.year})`),
    // Experience
    internships: (profile.internships ?? []).length,
    fellowships: (profile.fellowships ?? []).length,
    scholarshipsWon: (profile.scholarshipsWon ?? []).map(s => s.name),
    // Docs available
    documentsInVault: (profile.documents ?? []).map(d => d.docType),
  };
}

// ── Main Apply Form ────────────────────────────────────────────────────────────
function ApplyFormContent() {
  const searchParams = useSearchParams();
  const scholarshipId = searchParams.get('scholarshipId');
  const [scholarship, setScholarship] = useState<Scholarship | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showWebsite, setShowWebsite] = useState(false);
  const [ineligibleWarning, setIneligibleWarning] = useState(false);

  const auth = useAuth();
  const db = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const router = useRouter();

  // ── Form state — 9 sections ───────────────────────────────────────────────
  const [form, setForm] = useState({
    // Personal
    fullName: '', email: '', phone: '', dob: '', gender: '',
    address: '', city: '', state: '', pincode: '',
    category: '', religion: '', hasDisability: false, disabilityType: '',
    // Academic
    currentLevel: '', institution: '', degree: '', fieldOfStudy: '',
    cgpa: '', graduationYear: '',
    // Financial
    annualFamilyIncome: '', rationCard: '',
    // Skills
    skills: '',
    // Achievements
    achievements: '',
    // Vault docs (IDs of docs from profile vault to attach)
    vaultDocIds: [] as string[],
    // Additional uploads
    newDocuments: [] as File[],
    // Essay
    essay: '',
    // Declaration
    declarationAccepted: false,
  });

  const [prefilled, setPrefilled] = useState(false);

  const { completion, complete, isLoading: aiLoading } = useCompletion({
    api: '/api/ai/essay-assistant',
  });

  const onDrop = (acceptedFiles: File[]) =>
    setForm(prev => ({ ...prev, newDocuments: [...prev.newDocuments, ...acceptedFiles] }));

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'] },
    maxSize: 2097152, // 2 MB
  });

  const wordCount = form.essay.trim().split(/\s+/).filter(w => w.length > 0).length;
  const wordProgress = Math.min((wordCount / 100) * 100, 100);

  // ── Fetch scholarship + user profile ─────────────────────────────────────
  useEffect(() => {
    if (!scholarshipId || !auth?.currentUser || !db) {
      if (!scholarshipId) setLoading(false);
      return;
    }
    const fetchData = async () => {
      try {
        const [schSnap, userSnap] = await Promise.all([
          getDoc(doc(db, 'scholarships', scholarshipId)),
          getDoc(doc(db, 'users', auth.currentUser!.uid)),
        ]);

        if (schSnap.exists()) {
          const d = schSnap.data();
          setScholarship({
            id: schSnap.id, ...d,
            deadline: d.deadline?.toDate ? d.deadline.toDate() : (d.deadline ? new Date(d.deadline) : null),
            lastUpdated: d.lastUpdated?.toDate ? d.lastUpdated.toDate() : null,
          } as Scholarship);
        }

        if (userSnap.exists()) {
          const p = userSnap.data() as UserProfile;
          setUserProfile(p);

          // Pre-fill form from profile
          const edu = p.educationEntries?.[0];
          const newForm: Partial<typeof form> = {
            fullName: p.fullName ?? '',
            email: p.email ?? '',
            phone: p.phone ?? '',
            dob: '',
            gender: (p.gender ?? '').toLowerCase(),
            city: p.city ?? '',
            state: p.stateOfDomicile ?? '',
            pincode: '',
            category: (p.category ?? '').toLowerCase(),
            religion: (p.religion ?? '').toLowerCase(),
            hasDisability: p.category === 'PwD',
            annualFamilyIncome: String(p.annualFamilyIncome ?? ''),
            rationCard: p.rationCardType ?? '',
            // Latest education entry
            currentLevel: edu?.degreeLevel ?? '',
            institution: edu?.institution ?? '',
            degree: edu?.degreeName ?? '',
            fieldOfStudy: edu?.specialisation ?? '',
            cgpa: edu ? `${edu.score}${edu.scoreType === 'Percentage' ? '%' : ' / ' + (edu.scoreOutOf || '10')}` : '',
            graduationYear: edu?.endYear ?? '',
            skills: [...(p.technicalSkills ?? []), ...(p.programmingLanguages ?? [])].join(', '),
            achievements: (p.achievements ?? []).map(a => a.activityName).join('; '),
          };
          setForm(prev => ({ ...prev, ...newForm }));
          if (Object.values(newForm).some(v => v)) setPrefilled(true);
        }
      } catch (err) {
        console.error('Failed to fetch application data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [scholarshipId, db, auth?.currentUser]);

  // ── Real match score ──────────────────────────────────────────────────────
  const matchScore = useMemo(() => {
    if (!scholarship || !userProfile) return undefined;
    return computeMatchScore(scholarship, userProfile);
  }, [scholarship, userProfile]);

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth?.currentUser || !db || !scholarship) return;
    if (!form.declarationAccepted) {
      toast({ variant: 'destructive', title: 'Declaration Required', description: 'Please accept the declaration before submitting.' });
      return;
    }
    if (!storage) {
      toast({ title: 'Storage Error', description: 'Firebase Storage is not initialized.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const documentUrls: { name: string; url: string; type: string }[] = [];

      // Upload new files
      for (const file of form.newDocuments) {
        const storageRef = ref(storage, `applications/${auth.currentUser.uid}/${scholarship.id}/${file.name}`);
        const task = await uploadBytesResumable(storageRef, file);
        documentUrls.push({ name: file.name, url: await getDownloadURL(task.ref), type: 'uploaded' });
      }

      // Attach vault documents (already stored)
      const vaultDocs = (userProfile?.documents ?? []).filter(d => form.vaultDocIds.includes((d as any).id ?? d.docType));
      for (const vd of vaultDocs) {
        // Documents in vault don't have a downloadUrl — they reference storagePath
        // We store the storage path; the scholarship provider is notified separately
        documentUrls.push({ name: vd.docType, url: vd.storagePath, type: 'vault' });
      }

      const appRef = doc(collection(db, 'applications'));
      const applicationData = {
        userId: auth.currentUser.uid,
        scholarshipId: scholarship.id,
        scholarshipTitle: scholarship.title,
        provider: scholarship.provider,
        amount: scholarship.amount,
        deadline: scholarship.deadline ?? null,
        // Personal
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        dateOfBirth: form.dob,
        gender: form.gender,
        city: form.city,
        state: form.state,
        pincode: form.pincode,
        category: form.category,
        religion: form.religion,
        hasDisability: form.hasDisability,
        disabilityType: form.disabilityType,
        // Academic
        currentLevel: form.currentLevel,
        institution: form.institution,
        degree: form.degree,
        fieldOfStudy: form.fieldOfStudy,
        cgpa: form.cgpa,
        graduationYear: form.graduationYear,
        // Financial
        annualFamilyIncome: form.annualFamilyIncome,
        rationCard: form.rationCard,
        // Skills & Achievements
        skills: form.skills,
        achievements: form.achievements,
        // Essay
        essay: form.essay,
        // Documents
        documents: documentUrls,
        // AI match
        matchScore: matchScore ?? null,
        // Meta
        status: 'Submitted',
        submittedAt: serverTimestamp(),
      };

      await setDoc(appRef, applicationData);
      await setDoc(doc(db, 'users', auth.currentUser.uid, 'applications', scholarship.id), {
        applicationId: appRef.id,
        scholarshipTitle: scholarship.title,
        status: 'Submitted',
        submittedAt: serverTimestamp(),
        matchScore: matchScore ?? null,
      });

      setSubmitted(true);
      toast({ title: '🎉 Application Submitted!', description: `Your application for ${scholarship.title} has been submitted.` });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Submission Failed', description: err.message || 'An error occurred.' });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading your application...</p>
        </div>
      </div>
    );
  }

  if (!scholarshipId || !scholarship) return <NoScholarshipSelected />;

  // ── Success State ──────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="max-w-lg w-full text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-2xl font-headline font-bold text-foreground mb-2">Application Submitted! 🎉</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Your application for <strong className="text-foreground">{scholarship.title}</strong> has been received.
            </p>
            {matchScore !== undefined && (
              <p className="text-sm mt-2">Your match score for this scholarship: <strong className={matchScore >= 75 ? 'text-emerald-600' : matchScore >= 50 ? 'text-amber-600' : 'text-red-600'}>{matchScore}%</strong></p>
            )}
          </div>
          <Separator />
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="gap-2 bg-theme-600 hover:bg-theme-700 text-white rounded-xl">
              <Link href="/authenticated/applications"><FileText className="h-4 w-4" /> Track My Application</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="gap-2 rounded-xl">
              <Link href="/authenticated/dashboard"><LayoutDashboard className="h-4 w-4" /> Find More Scholarships</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isExpired = scholarship.deadline && new Date(scholarship.deadline) < new Date();

  const eligibilityData = {
    title: scholarship.title,
    provider: scholarship.provider,
    amount: scholarship.amount,
    eligibilityLevel: scholarship.eligibilityLevel,
    fieldOfStudy: scholarship.fieldOfStudy,
    location: scholarship.location,
    gender: scholarship.gender,
    religion: scholarship.religion,
    scholarshipType: scholarship.scholarshipType,
    eligibilityDetails: (scholarship.eligibility as any)?.details,
    deadline: scholarship.deadline?.toISOString?.() ?? null,
    status: scholarship.status,
  };

  const richProfile = userProfile ? buildRichProfile(userProfile) : {};
  const vaultDocs = userProfile?.documents ?? [];

  return (
    <>
      <AnimatePresence>
        {showWebsite && scholarship.officialLink && (
          <WebsiteModal url={scholarship.officialLink} title={scholarship.title} onClose={() => setShowWebsite(false)} />
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto py-8 px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <Button variant="ghost" className="mb-6 -ml-4 hover:bg-theme-100 dark:hover:bg-theme-900" asChild>
          <Link href={`/authenticated/scholarship/${scholarshipId}`}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Details
          </Link>
        </Button>

        {isExpired && (
          <div className="flex items-start gap-3 p-4 mb-6 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl">
            <Clock className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-orange-700 dark:text-orange-400">Deadline Has Passed</p>
              <p className="text-sm text-orange-600/80 dark:text-orange-400/80 mt-0.5">
                This scholarship&apos;s application period has closed. You can still save a draft, but official submissions may not be accepted.
              </p>
            </div>
          </div>
        )}

        {prefilled && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 p-4 mb-6 bg-primary/5 border border-primary/20 rounded-xl"
          >
            <div className="bg-primary/15 p-2 rounded-lg shrink-0 mt-0.5">
              <Wand2 className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">✨ Smart Pre-fill Active</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                We've pre-filled this form from your Profile. Verify each section, edit if needed, and submit.
                Sections marked <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-0 inline-flex gap-1 py-0"><Wand2 className="w-2 h-2" /> Auto-filled</Badge> were populated from your profile.
              </p>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── LEFT: Application Form ───────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">
            <Card className="shadow-lg border-theme-200 dark:border-theme-800 overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-theme-400 via-primary to-theme-600" />
              <CardHeader className="bg-gradient-to-b from-theme-50/50 to-transparent dark:from-theme-900/20 border-b pb-6">
                <CardTitle className="text-3xl font-headline text-foreground tracking-tight">Application</CardTitle>
                <CardDescription className="text-base mt-2 flex flex-col gap-1">
                  <span className="font-semibold text-theme-700 dark:text-theme-300 text-lg">{scholarship.title}</span>
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <FileText className="w-4 h-4" /> {scholarship.provider}
                  </span>
                </CardDescription>
              </CardHeader>

              <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4 pt-6">

                  {/* 1. Personal Information */}
                  <FormSection title="Personal Information" icon={<User className="w-4 h-4" />} prefilled={prefilled}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Full Name <span className="text-destructive">*</span></Label>
                        <Input required placeholder="As per documents" value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Email Address <span className="text-destructive">*</span></Label>
                        <Input required type="email" placeholder="your@email.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Phone Number</Label>
                        <Input placeholder="+91 XXXXX XXXXX" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Date of Birth</Label>
                        <Input type="date" value={form.dob} onChange={e => setForm(p => ({ ...p, dob: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Gender <span className="text-destructive">*</span></Label>
                        <select required className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.gender} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))}>
                          <option value="">Select gender</option>
                          <option value="female">Female</option>
                          <option value="male">Male</option>
                          <option value="transgender">Transgender</option>
                          <option value="other">Other / Prefer not to say</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Category <span className="text-destructive">*</span></Label>
                        <select required className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                          <option value="">Select category</option>
                          <option value="general">General</option>
                          <option value="obc">OBC</option>
                          <option value="sc">SC</option>
                          <option value="st">ST</option>
                          <option value="ews">EWS</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Religion</Label>
                        <select className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.religion} onChange={e => setForm(p => ({ ...p, religion: e.target.value }))}>
                          <option value="">Select religion</option>
                          <option value="hindu">Hindu</option>
                          <option value="muslim">Muslim</option>
                          <option value="christian">Christian</option>
                          <option value="sikh">Sikh</option>
                          <option value="buddhist">Buddhist</option>
                          <option value="jain">Jain</option>
                          <option value="parsi">Parsi</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label className="text-xs flex items-center gap-2">
                          <input type="checkbox" checked={form.hasDisability} onChange={e => setForm(p => ({ ...p, hasDisability: e.target.checked }))} />
                          Person with Disability (PwD)
                        </Label>
                        {form.hasDisability && (
                          <Input placeholder="Type of disability (e.g. Visual, Locomotor)" value={form.disabilityType} onChange={e => setForm(p => ({ ...p, disabilityType: e.target.value }))} />
                        )}
                      </div>
                    </div>
                  </FormSection>

                  {/* 2. Location */}
                  <FormSection title="Location & Address" icon={<MapPin className="w-4 h-4" />} prefilled={prefilled} defaultOpen={false}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label className="text-xs">Full Address</Label>
                        <Input placeholder="House/Flat No., Street, Area" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">City <span className="text-destructive">*</span></Label>
                        <Input required placeholder="City" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">State <span className="text-destructive">*</span></Label>
                        <Input required placeholder="State" value={form.state} onChange={e => setForm(p => ({ ...p, state: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">PIN Code</Label>
                        <Input placeholder="6-digit PIN" maxLength={6} value={form.pincode} onChange={e => setForm(p => ({ ...p, pincode: e.target.value }))} />
                      </div>
                    </div>
                  </FormSection>

                  {/* 3. Academic Background */}
                  <FormSection title="Academic Background" icon={<GraduationCap className="w-4 h-4" />} prefilled={prefilled}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Current Education Level <span className="text-destructive">*</span></Label>
                        <select required className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.currentLevel} onChange={e => setForm(p => ({ ...p, currentLevel: e.target.value }))}>
                          <option value="">Select level</option>
                          <option value="class 10">Class 10 (Secondary)</option>
                          <option value="class 12">Class 12 (Senior Secondary)</option>
                          <option value="diploma">Diploma / Polytechnic</option>
                          <option value="undergraduate">Undergraduate (UG)</option>
                          <option value="postgraduate">Postgraduate (PG)</option>
                          <option value="phd">PhD / Doctoral</option>
                          <option value="professional">Professional (MBBS, LLB, CA etc.)</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Institution / School / College <span className="text-destructive">*</span></Label>
                        <Input required placeholder="Full name of institution" value={form.institution} onChange={e => setForm(p => ({ ...p, institution: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Degree / Programme Name</Label>
                        <Input placeholder="e.g. B.Tech CSE, MBBS, MA Economics" value={form.degree} onChange={e => setForm(p => ({ ...p, degree: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Field / Stream <span className="text-destructive">*</span></Label>
                        <Input required placeholder="e.g. Computer Science, Commerce" value={form.fieldOfStudy} onChange={e => setForm(p => ({ ...p, fieldOfStudy: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">CGPA / Percentage <span className="text-destructive">*</span></Label>
                        <Input required placeholder="e.g. 8.5 or 85%" value={form.cgpa} onChange={e => setForm(p => ({ ...p, cgpa: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Expected Graduation Year</Label>
                        <Input placeholder="e.g. 2026" value={form.graduationYear} onChange={e => setForm(p => ({ ...p, graduationYear: e.target.value }))} />
                      </div>
                    </div>
                    {userProfile?.educationEntries && userProfile.educationEntries.length > 1 && (
                      <div className="mt-2 p-3 bg-secondary/40 rounded-lg text-xs text-muted-foreground flex items-start gap-2">
                        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        You have {userProfile.educationEntries.length} education entries in your profile. Only your most recent is shown. All entries are sent with the AI eligibility analysis.
                      </div>
                    )}
                  </FormSection>

                  {/* 4. Financial Information */}
                  <FormSection title="Financial Background" icon={<IndianRupee className="w-4 h-4" />} prefilled={prefilled} defaultOpen={false}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Annual Family Income (₹)</Label>
                        <Input type="number" placeholder="e.g. 250000" value={form.annualFamilyIncome} onChange={e => setForm(p => ({ ...p, annualFamilyIncome: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Ration Card Type</Label>
                        <select className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.rationCard} onChange={e => setForm(p => ({ ...p, rationCard: e.target.value }))}>
                          <option value="">Select if applicable</option>
                          <option value="APL">APL (Above Poverty Line)</option>
                          <option value="BPL">BPL (Below Poverty Line)</option>
                          <option value="AAY">AAY (Antyodaya Anna Yojana)</option>
                          <option value="none">No ration card</option>
                        </select>
                      </div>
                    </div>
                  </FormSection>

                  {/* 5. Skills & Achievements */}
                  <FormSection title="Skills & Achievements" icon={<Award className="w-4 h-4" />} prefilled={prefilled} defaultOpen={false} optional>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Skills (comma-separated)</Label>
                        <Input placeholder="e.g. Python, Leadership, Public Speaking, Machine Learning" value={form.skills} onChange={e => setForm(p => ({ ...p, skills: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Notable Achievements & Awards</Label>
                        <Textarea
                          rows={3}
                          placeholder="List any awards, competitions, leadership roles, research, or community service..."
                          value={form.achievements}
                          onChange={e => setForm(p => ({ ...p, achievements: e.target.value }))}
                        />
                      </div>
                    </div>
                  </FormSection>

                  {/* 6. Document Vault */}
                  <FormSection title="Documents" icon={<ShieldAlert className="w-4 h-4" />}>
                    {/* Attach from profile vault */}
                    {vaultDocs.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">From Your Document Vault</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {vaultDocs.map((vd, vi) => (
                            <label key={vi} className={cn('flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors text-xs',
                              form.vaultDocIds.includes(vd.docType) ? 'border-primary bg-primary/5' : 'hover:border-primary/30'
                            )}>
                              <input
                                type="checkbox"
                                className="accent-primary"
                                checked={form.vaultDocIds.includes(vd.docType)}
                                onChange={e => setForm(p => ({
                                  ...p,
                                  vaultDocIds: e.target.checked ? [...p.vaultDocIds, vd.docType] : p.vaultDocIds.filter(id => id !== vd.docType),
                                }))}
                              />
                              <FileIcon className="w-4 h-4 text-primary shrink-0" />
                              <span className="truncate font-medium">{vd.label || vd.docType}</span>
                              {vd.fileName && <span className="text-muted-foreground truncate">{vd.fileName}</span>}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Upload new */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Upload Additional Documents</p>
                      <p className="text-xs text-muted-foreground">Max 2 MB per file. PDF, JPG, PNG only.</p>
                      <div
                        {...getRootProps()}
                        className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer flex flex-col items-center justify-center gap-3 ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/20 hover:border-primary/50 bg-card/40'}`}
                      >
                        <input {...getInputProps()} />
                        <UploadCloud className={`w-6 h-6 ${isDragActive ? 'text-primary' : 'text-muted-foreground'}`} />
                        <p className="text-sm font-medium">{isDragActive ? 'Drop files here...' : 'Drag & drop or click to browse'}</p>
                      </div>
                      {form.newDocuments.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                          {form.newDocuments.map((file, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2.5 bg-secondary/50 rounded-lg border text-xs">
                              <div className="flex items-center gap-2 overflow-hidden">
                                <FileIcon className="w-4 h-4 text-primary shrink-0" />
                                <div>
                                  <p className="font-medium truncate">{file.name}</p>
                                  <p className="text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                </div>
                              </div>
                              <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setForm(p => { const d = [...p.newDocuments]; d.splice(idx, 1); return { ...p, newDocuments: d }; })}>
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </FormSection>

                  {/* 7. Personal Statement */}
                  <FormSection title="Personal Statement" icon={<FileText className="w-4 h-4" />}>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-muted-foreground">Explain why you are the ideal candidate and how this scholarship will impact your journey.</p>
                        <Badge variant={wordCount >= 100 ? 'default' : 'secondary'} className={wordCount >= 100 ? 'bg-emerald-500 hover:bg-emerald-600 shadow-sm shrink-0' : 'shrink-0'}>
                          {wordCount} / 100 min words
                        </Badge>
                      </div>
                      <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div className={`h-full transition-all duration-500 ${wordCount >= 100 ? 'bg-emerald-500' : 'bg-primary'}`} style={{ width: `${wordProgress}%` }} />
                      </div>
                      <Textarea
                        id="essay"
                        placeholder="Start with what drives your passion, a specific challenge you've overcome, or a vision for your future..."
                        className="min-h-[300px] resize-y text-base p-5 leading-relaxed"
                        required
                        value={form.essay}
                        onChange={e => setForm(p => ({ ...p, essay: e.target.value }))}
                      />
                    </div>
                  </FormSection>

                  {/* 8. Declaration */}
                  <FormSection title="Declaration" icon={<ShieldCheck className="w-4 h-4" />}>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        className="accent-primary mt-0.5 shrink-0"
                        checked={form.declarationAccepted}
                        onChange={e => setForm(p => ({ ...p, declarationAccepted: e.target.checked }))}
                      />
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        I hereby declare that all information provided in this application is true, accurate, and complete to the best of my knowledge.
                        I understand that any misrepresentation or omission of facts may result in the rejection of my application or cancellation of any scholarship awarded.
                        I consent to the scholarship provider verifying the information provided.
                      </p>
                    </label>
                  </FormSection>

                </CardContent>

                <CardFooter className="bg-muted/10 border-t py-6 flex flex-col gap-4">
                  {ineligibleWarning && (
                    <div className="w-full flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                      <AlertCircle className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-orange-700 dark:text-orange-400">
                        The AI analysis found you may not meet all criteria. You can still submit — eligibility decisions are made by the scholarship provider.
                      </p>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4 w-full">
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" /> End-to-end encrypted submission
                    </p>
                    <Button
                      type="submit"
                      size="lg"
                      className={cn('w-full sm:w-auto rounded-xl', wordCount >= 100 && form.declarationAccepted ? 'shadow-lg shadow-primary/20 bg-theme-600 hover:bg-theme-700 text-white' : '')}
                      disabled={submitting || wordCount < 100 || !form.declarationAccepted}
                    >
                      {submitting ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting securely...</>
                      ) : (
                        <><Send className="h-4 w-4 mr-2" /> Submit Application</>
                      )}
                    </Button>
                  </div>

                  {scholarship.officialLink && (
                    <div className="w-full border-t pt-4">
                      <p className="text-xs text-muted-foreground mb-3 text-center">
                        Want to review the scholarship details or apply directly on their website?
                      </p>
                      <Button
                        type="button" variant="outline"
                        className="w-full gap-2 rounded-xl border-theme-200 dark:border-theme-800 hover:bg-theme-50 dark:hover:bg-theme-900/30"
                        onClick={() => setShowWebsite(true)}
                      >
                        <Globe className="h-4 w-4 text-theme-500" />
                        Visit Official Website & Apply
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  )}
                </CardFooter>
              </form>
            </Card>
          </div>

          {/* ── RIGHT: Sticky Sidebar ──────────────────────────────────── */}
          <div className="lg:col-span-1 space-y-5">
            <div className="sticky top-6 space-y-5">

              {/* Scholarship summary with real match score */}
              <ScholarshipSummaryCard scholarship={scholarship} matchScore={matchScore} />

              {/* AI Eligibility Analysis */}
              <Card className="border-primary/20 shadow-md bg-gradient-to-b from-primary/5 to-transparent overflow-hidden">
                <div className="h-0.5 w-full bg-gradient-to-r from-primary/60 to-theme-400/60" />
                <CardHeader className="pb-3 pt-4">
                  <CardTitle className="text-base font-headline flex items-center gap-2">
                    <div className="p-1.5 bg-primary/20 rounded-md text-primary">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    AI Eligibility Analysis
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Deep analysis of your full profile against all scholarship criteria.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CheckOddsWidget
                    scholarshipTitle={scholarship.title}
                    eligibilityData={eligibilityData}
                    userProfile={richProfile}
                    inline
                    onIneligible={() => setIneligibleWarning(true)}
                  />
                </CardContent>
              </Card>

              {/* Essay AI Assistant */}
              <Card className="border-theme-200/50 shadow-sm">
                <CardHeader className="pb-3 pt-4">
                  <CardTitle className="text-base font-headline flex items-center gap-2">
                    <div className="p-1.5 bg-theme-100 dark:bg-theme-900/50 rounded-md text-theme-600 dark:text-theme-400">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    Essay AI Assistant
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Get personalised tips based on your profile and this scholarship.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="bg-card border rounded-lg p-4 text-sm text-foreground/90 shadow-sm min-h-[90px] flex items-center">
                    {aiLoading ? (
                      <div className="flex items-center gap-2 text-muted-foreground w-full justify-center">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span className="text-xs">Analysing your draft...</span>
                      </div>
                    ) : completion ? (
                      <p className="leading-relaxed text-xs">{completion}</p>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground/60 w-full text-center">
                        <MessageSquare className="w-6 h-6 opacity-20" />
                        <p className="text-xs">Write at least 10 words, then get personalised AI feedback.</p>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="secondary" size="sm" className="w-full gap-2"
                    disabled={wordCount < 10 || aiLoading}
                    onClick={e => {
                      e.preventDefault();
                      complete('Review this paragraph and give me one punchy tip to make it stand out.', {
                        body: {
                          essay: form.essay,
                          scholarshipInfo: {
                            title: scholarship.title,
                            provider: scholarship.provider,
                            eligibility: (scholarship as any).eligibility,
                          },
                          applicantContext: {
                            field: form.fieldOfStudy,
                            level: form.currentLevel,
                            cgpa: form.cgpa,
                            skills: form.skills,
                            achievements: form.achievements,
                          },
                        },
                      });
                    }}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {aiLoading ? 'Thinking...' : wordCount < 10 ? 'Write more first' : 'Get AI Feedback'}
                  </Button>
                </CardContent>
              </Card>

              {/* Quick Tips */}
              <Card className="bg-card">
                <CardHeader className="py-4">
                  <CardTitle className="text-sm font-semibold">Quick Tips</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-xs text-muted-foreground space-y-2.5">
                    <li className="flex gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" /> Match your tone to the provider&apos;s mission.</li>
                    <li className="flex gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" /> Use specific numbers and achievements.</li>
                    <li className="flex gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" /> Explain how this scholarship changes things for you.</li>
                    <li className="flex gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" /> All sections are pre-filled from your profile — verify each one carefully.</li>
                  </ul>
                </CardContent>
              </Card>

            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function ApplyPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-[60vh]"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>}>
      <ApplyFormContent />
    </Suspense>
  );
}
