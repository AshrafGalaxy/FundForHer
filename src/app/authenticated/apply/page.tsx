'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import {
  Loader2, ArrowLeft, Send, CheckCircle2, Wand2, FileText, Sparkles,
  MessageSquare, ShieldCheck, UploadCloud, X, FileIcon, ShieldAlert,
  ExternalLink, Globe, IndianRupee, Calendar, BookOpen, Target, Award,
  GraduationCap, LayoutDashboard, Clock,
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useCompletion } from '@ai-sdk/react';
import { useDropzone } from 'react-dropzone';
import { format, isValid } from 'date-fns';
import { CheckOddsWidget } from '@/components/scholarships/CheckOddsWidget';
import { cn } from '@/lib/utils';

// ── Website Preview Modal ─────────────────────────────────────────────────────
function WebsiteModal({ url, title, onClose }: { url: string; title: string; onClose: () => void }) {
  const [iframeStatus, setIframeStatus] = useState<'loading' | 'loaded' | 'blocked'>('loading');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // If the iframe doesn't trigger onLoad within 6 seconds, assume it's blocked
    timeoutRef.current = setTimeout(() => {
      if (iframeStatus === 'loading') setIframeStatus('blocked');
    }, 6000);
    return () => clearTimeout(timeoutRef.current);
  }, []);

  const handleLoad = () => {
    clearTimeout(timeoutRef.current);
    try {
      // Accessing contentDocument throws if blocked by CORS/X-Frame-Options
      const doc = iframeRef.current?.contentDocument;
      if (!doc || doc.body?.innerHTML === '') {
        setIframeStatus('blocked');
      } else {
        setIframeStatus('loaded');
      }
    } catch {
      setIframeStatus('blocked');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Modal header */}
      <div className="flex items-center justify-between gap-4 px-4 py-3 border-b bg-card shadow-sm shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="bg-primary/10 p-2 rounded-lg shrink-0">
            <Globe className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{title}</p>
            <p className="text-xs text-muted-foreground truncate">{url}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button asChild variant="outline" size="sm" className="gap-2 hidden sm:flex">
            <a href={url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
              Open in New Tab
            </a>
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-9 w-9">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* iframe / blocked state */}
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
              <p className="text-muted-foreground text-sm max-w-md">
                This website has disabled embedding for security reasons. Please open it directly in a new tab to view and complete your application.
              </p>
              <p className="text-xs text-muted-foreground font-mono bg-secondary px-3 py-1.5 rounded-md break-all mt-2">
                {url}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild size="lg" className="gap-2 bg-theme-600 hover:bg-theme-700 text-white">
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Open Official Website
                </a>
              </Button>
              <Button variant="outline" size="lg" onClick={onClose}>
                Back to Application
              </Button>
            </div>
          </div>
        )}

        <iframe
          ref={iframeRef}
          src={url}
          className={cn('w-full h-full border-0', iframeStatus === 'blocked' ? 'invisible' : '')}
          onLoad={handleLoad}
          title={`${title} — Official Website`}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>
    </div>
  );
}

// ── Scholarship Summary Sidebar Card ──────────────────────────────────────────
function ScholarshipSummaryCard({ scholarship }: { scholarship: Scholarship }) {
  const isExpired = scholarship.deadline && new Date(scholarship.deadline) < new Date();
  const deadlineStr = scholarship.deadline && isValid(new Date(scholarship.deadline))
    ? format(new Date(scholarship.deadline), 'MMM d, yyyy')
    : 'N/A';

  return (
    <Card className="bg-gradient-to-b from-theme-50/80 to-card dark:from-theme-900/30 border-theme-200 dark:border-theme-800 shadow-sm overflow-hidden">
      <div className="h-1 w-full bg-gradient-to-r from-theme-400 via-primary to-theme-600" />
      <CardHeader className="pb-3 pt-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base font-headline leading-snug line-clamp-2">
              {scholarship.title}
            </CardTitle>
            <CardDescription className="text-xs mt-1">{scholarship.provider}</CardDescription>
          </div>
          <Badge
            variant="outline"
            className={cn(
              'shrink-0 text-[10px] font-semibold',
              isExpired
                ? 'border-red-400 text-red-500'
                : 'border-emerald-400 text-emerald-600 dark:text-emerald-400',
            )}
          >
            {isExpired ? '⏱ Closed' : scholarship.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2.5 pb-4">
        <SummaryRow icon={<IndianRupee className="w-3.5 h-3.5" />} label="Award">
          <span style={{ fontFamily: 'sans-serif' }}>₹</span>
          {new Intl.NumberFormat('en-IN').format(scholarship.amount)}
        </SummaryRow>
        <SummaryRow icon={<Calendar className="w-3.5 h-3.5" />} label="Deadline">
          <span className={cn(isExpired && 'text-red-500 font-semibold')}>{deadlineStr}</span>
        </SummaryRow>
        <SummaryRow icon={<Target className="w-3.5 h-3.5" />} label="Level">
          {Array.isArray(scholarship.eligibilityLevel)
            ? scholarship.eligibilityLevel.join(', ')
            : scholarship.eligibilityLevel}
        </SummaryRow>
        <SummaryRow icon={<BookOpen className="w-3.5 h-3.5" />} label="Field">
          {Array.isArray(scholarship.fieldOfStudy)
            ? scholarship.fieldOfStudy.slice(0, 2).join(', ')
            : scholarship.fieldOfStudy}
        </SummaryRow>
        <SummaryRow icon={<Award className="w-3.5 h-3.5" />} label="Type">
          {scholarship.scholarshipType}
        </SummaryRow>
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

// ── No Scholarship Selected State ─────────────────────────────────────────────
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
            You&apos;ll be brought here automatically with everything pre-loaded.
          </p>
        </div>
        <Separator />
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg" className="gap-2 bg-theme-600 hover:bg-theme-700 text-white rounded-xl">
            <Link href="/authenticated/dashboard">
              <LayoutDashboard className="h-4 w-4" />
              Browse Scholarships
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="gap-2 rounded-xl">
            <Link href="/authenticated/applications">
              <FileText className="h-4 w-4" />
              My Applications
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Apply Form ───────────────────────────────────────────────────────────
function ApplyFormContent() {
  const searchParams = useSearchParams();
  const scholarshipId = searchParams.get('scholarshipId');
  const [scholarship, setScholarship] = useState<Scholarship | null>(null);
  const [userProfile, setUserProfile] = useState<Record<string, any>>({});
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

  const [formData, setFormData] = useState({
    essay: '',
    gpa: '',
    major: '',
    documents: [] as File[],
  });
  const [prefilled, setPrefilled] = useState(false);

  const { completion, complete, isLoading: aiLoading } = useCompletion({
    api: '/api/ai/essay-assistant',
  });

  const onDrop = (acceptedFiles: File[]) =>
    setFormData(prev => ({ ...prev, documents: [...prev.documents, ...acceptedFiles] }));

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'] },
    maxSize: 5242880,
  });

  const removeDocument = (index: number) =>
    setFormData(prev => { const d = [...prev.documents]; d.splice(index, 1); return { ...prev, documents: d }; });

  const wordCount = formData.essay.trim().split(/\s+/).filter(w => w.length > 0).length;
  const wordProgress = Math.min((wordCount / 100) * 100, 100);

  // Fetch scholarship + user profile
  useEffect(() => {
    if (!scholarshipId || !auth?.currentUser || !db) {
      if (!scholarshipId) setLoading(false);
      return;
    }
    const fetchData = async () => {
      try {
        const schSnap = await getDoc(doc(db, 'scholarships', scholarshipId));
        if (schSnap.exists()) {
          const d = schSnap.data();
          setScholarship({
            id: schSnap.id,
            ...d,
            deadline: d.deadline?.toDate ? d.deadline.toDate() : (d.deadline ? new Date(d.deadline) : null),
            lastUpdated: d.lastUpdated?.toDate ? d.lastUpdated.toDate() : (d.lastUpdated ? new Date(d.lastUpdated) : null),
          } as Scholarship);
        }

        const userSnap = await getDoc(doc(db, 'users', auth.currentUser!.uid));
        if (userSnap.exists()) {
          const userData = userSnap.data();
          setUserProfile(userData);
          if (userData.cgpa || userData.fieldOfStudy) {
            setFormData(prev => ({
              ...prev,
              gpa: userData.cgpa ? String(userData.cgpa) : prev.gpa,
              major: userData.fieldOfStudy
                ? (Array.isArray(userData.fieldOfStudy) ? userData.fieldOfStudy[0] : userData.fieldOfStudy)
                : prev.major,
            }));
            setPrefilled(true);
          }
        }
      } catch (err) {
        console.error('Failed to fetch application data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [scholarshipId, db, auth?.currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth?.currentUser || !db || !scholarship) return;
    if (!storage) {
      toast({ title: 'Storage Error', description: 'Firebase Storage is not initialized.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const documentUrls: { name: string; url: string }[] = [];
      for (const file of formData.documents) {
        const storageRef = ref(storage, `applications/${auth.currentUser.uid}/${scholarship.id}/${file.name}`);
        const task = await uploadBytesResumable(storageRef, file);
        documentUrls.push({ name: file.name, url: await getDownloadURL(task.ref) });
      }

      const appRef = doc(collection(db, 'applications'));
      const applicationData = {
        userId: auth.currentUser.uid,
        scholarshipId: scholarship.id,
        scholarshipTitle: scholarship.title,
        provider: scholarship.provider,
        amount: scholarship.amount,
        essay: formData.essay,
        gpa: formData.gpa,
        major: formData.major,
        documents: documentUrls,
        status: 'Submitted',
        submittedAt: serverTimestamp(),
      };
      await setDoc(appRef, applicationData);

      // Normalized reference in user's subcollection
      await setDoc(doc(db, 'users', auth.currentUser.uid, 'applications', scholarship.id), {
        applicationId: appRef.id,
        scholarshipTitle: scholarship.title,
        status: 'Submitted',
        submittedAt: serverTimestamp(),
      });

      setSubmitted(true);
      toast({
        title: '🎉 Application Submitted!',
        description: `Your application for ${scholarship.title} has been submitted successfully.`,
      });
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
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  // ── No scholarship param ───────────────────────────────────────────────────
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
              You&apos;ll be notified via email of any status updates.
            </p>
          </div>
          <Separator />
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="gap-2 bg-theme-600 hover:bg-theme-700 text-white rounded-xl">
              <Link href="/authenticated/applications">
                <FileText className="h-4 w-4" />
                Track My Application
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="gap-2 rounded-xl">
              <Link href="/authenticated/dashboard">
                <LayoutDashboard className="h-4 w-4" />
                Find More Scholarships
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isExpired = scholarship.deadline && new Date(scholarship.deadline) < new Date();

  // Build eligibility data object for CheckOddsWidget
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
    eligibilityDetails: scholarship.eligibility?.details,
    deadline: scholarship.deadline?.toISOString?.() ?? null,
    status: scholarship.status,
  };

  return (
    <>
      {/* Website Preview Modal */}
      <AnimatePresence>
        {showWebsite && scholarship.officialLink && (
          <WebsiteModal
            url={scholarship.officialLink}
            title={scholarship.title}
            onClose={() => setShowWebsite(false)}
          />
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto py-8 px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Back nav */}
        <Button variant="ghost" className="mb-6 -ml-4 hover:bg-theme-100 dark:hover:bg-theme-900" asChild>
          <Link href={`/authenticated/scholarship/${scholarshipId}`}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Details
          </Link>
        </Button>

        {/* Expired warning banner */}
        {isExpired && (
          <div className="flex items-start gap-3 p-4 mb-6 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl">
            <Clock className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-orange-700 dark:text-orange-400">Deadline Has Passed</p>
              <p className="text-sm text-orange-600/80 dark:text-orange-400/80 mt-0.5">
                This scholarship&apos;s application period has closed. You can still save your work as a draft, but official submissions may not be accepted.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── LEFT: Application Form ────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-lg border-theme-200 dark:border-theme-800 overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-theme-400 via-primary to-theme-600" />
              <CardHeader className="bg-gradient-to-b from-theme-50/50 to-transparent dark:from-theme-900/20 border-b pb-6">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-3xl font-headline text-foreground tracking-tight">Application</CardTitle>
                    <CardDescription className="text-base mt-2 flex flex-col gap-1">
                      <span className="font-semibold text-theme-700 dark:text-theme-300 text-lg">{scholarship.title}</span>
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <FileText className="w-4 h-4" /> {scholarship.provider}
                      </span>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <form onSubmit={handleSubmit}>
                <CardContent className="space-y-8 pt-8">

                  {/* Magic Prefill notice */}
                  <AnimatePresence>
                    {prefilled && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="bg-primary/10 border border-primary/20 rounded-lg p-3 flex items-start gap-3"
                      >
                        <div className="bg-primary/20 p-2 rounded-md mt-0.5">
                          <Wand2 className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">✨ Magic Prefill Active</p>
                          <p className="text-xs text-muted-foreground">We pulled your Academic Profile to save you time. Edit below if needed.</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Academic Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-secondary/30 p-5 rounded-xl border border-dashed">
                    <div className="space-y-2">
                      <Label htmlFor="gpa" className="font-semibold text-foreground/80">
                        Current GPA / % <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="gpa"
                          placeholder="e.g. 3.8 or 85%"
                          required
                          className="bg-card transition-all focus-visible:ring-primary/50"
                          value={formData.gpa}
                          onChange={e => setFormData({ ...formData, gpa: e.target.value })}
                        />
                        {prefilled && <Sparkles className="w-3.5 h-3.5 absolute right-3 top-3 text-primary opacity-50 pointer-events-none" />}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="major" className="font-semibold text-foreground/80">
                        Intended Field of Study <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="major"
                          placeholder="e.g. Computer Science"
                          required
                          className="bg-card transition-all focus-visible:ring-primary/50"
                          value={formData.major}
                          onChange={e => setFormData({ ...formData, major: e.target.value })}
                        />
                        {prefilled && <Sparkles className="w-3.5 h-3.5 absolute right-3 top-3 text-primary opacity-50 pointer-events-none" />}
                      </div>
                    </div>
                  </div>

                  {/* Document Vault */}
                  <div className="space-y-3 pt-2">
                    <Label className="text-lg font-headline font-semibold flex items-center gap-2">
                      Document Vault <ShieldAlert className="w-4 h-4 text-theme-500" />
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Upload transcripts, ID proofs, or recommendation letters. Max 5 MB per file (PDF, JPG, PNG).
                    </p>
                    <div
                      {...getRootProps()}
                      className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer flex flex-col items-center justify-center gap-4 ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/20 hover:border-primary/50 hover:bg-secondary/20 bg-card/40'}`}
                    >
                      <input {...getInputProps()} />
                      <div className={`p-4 rounded-full ${isDragActive ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                        <UploadCloud className="w-8 h-8" />
                      </div>
                      {isDragActive ? (
                        <p className="font-medium text-primary">Drop files to secure vault...</p>
                      ) : (
                        <div>
                          <p className="font-medium text-foreground">Drag & drop files here, or click to browse</p>
                          <p className="text-xs text-muted-foreground mt-1">Files are encrypted over Firebase Storage.</p>
                        </div>
                      )}
                    </div>
                    {formData.documents.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                        {formData.documents.map((file, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg border">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <FileIcon className="w-5 h-5 text-primary flex-shrink-0" />
                              <div className="overflow-hidden">
                                <p className="text-sm font-medium truncate">{file.name}</p>
                                <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                              </div>
                            </div>
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => removeDocument(idx)}>
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Personal Statement */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-end">
                      <Label htmlFor="essay" className="text-lg font-headline font-semibold">
                        Personal Statement <span className="text-destructive">*</span>
                      </Label>
                      <Badge variant={wordCount >= 100 ? 'default' : 'secondary'} className={wordCount >= 100 ? 'bg-emerald-500 hover:bg-emerald-600 shadow-sm' : ''}>
                        {wordCount} / 100 min words
                      </Badge>
                    </div>
                    <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className={`h-full transition-all duration-500 ${wordCount >= 100 ? 'bg-emerald-500' : 'bg-primary'}`} style={{ width: `${wordProgress}%` }} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Explain why you are the best candidate and how the funds will impact your educational journey.
                    </p>
                    <Textarea
                      id="essay"
                      placeholder="Start writing your story here..."
                      className="min-h-[350px] resize-y text-base p-5 leading-relaxed transition-colors border-muted-foreground/20 focus-visible:border-primary/50 bg-card/50"
                      required
                      value={formData.essay}
                      onChange={e => setFormData({ ...formData, essay: e.target.value })}
                    />
                  </div>
                </CardContent>

                <CardFooter className="bg-muted/10 border-t py-6 flex flex-col gap-4">
                  {/* Ineligibility soft warning */}
                  {ineligibleWarning && (
                    <div className="w-full flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                      <ShieldAlert className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
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
                      className={cn(
                        'w-full sm:w-auto rounded-xl',
                        wordCount >= 100 ? 'shadow-lg shadow-primary/20 bg-theme-600 hover:bg-theme-700 text-white' : '',
                      )}
                      disabled={submitting || wordCount < 100}
                    >
                      {submitting ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting securely...</>
                      ) : (
                        <><Send className="h-4 w-4 mr-2" /> Submit Application</>
                      )}
                    </Button>
                  </div>

                  {/* Visit Website button */}
                  {scholarship.officialLink && (
                    <div className="w-full border-t pt-4">
                      <p className="text-xs text-muted-foreground mb-3 text-center">
                        Want to review the scholarship details or apply directly on their website?
                      </p>
                      <Button
                        type="button"
                        variant="outline"
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

          {/* ── RIGHT: Sticky Sidebar ─────────────────────────────────────── */}
          <div className="lg:col-span-1 space-y-5">
            <div className="sticky top-6 space-y-5">

              {/* Scholarship Summary */}
              <ScholarshipSummaryCard scholarship={scholarship} />

              {/* AI Eligibility Check */}
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
                    Check how well your profile matches before submitting.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CheckOddsWidget
                    scholarshipTitle={scholarship.title}
                    eligibilityData={eligibilityData}
                    userProfile={userProfile}
                    inline
                    onIneligible={() => setIneligibleWarning(true)}
                  />
                </CardContent>
              </Card>

              {/* Real-time AI Essay Assistant */}
              <Card className="border-theme-200/50 shadow-sm">
                <CardHeader className="pb-3 pt-4">
                  <CardTitle className="text-base font-headline flex items-center gap-2">
                    <div className="p-1.5 bg-theme-100 dark:bg-theme-900/50 rounded-md text-theme-600 dark:text-theme-400">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    Essay AI Assistant
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Get real-time tips from AI as you write.
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
                        <p className="text-xs">Write at least 10 words, then get AI feedback.</p>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full gap-2"
                    disabled={wordCount < 10 || aiLoading}
                    onClick={e => {
                      e.preventDefault();
                      complete('Review this paragraph and give me one punchy tip to make it stand out.', {
                        body: { essay: formData.essay, scholarshipInfo: { title: scholarship.title, provider: scholarship.provider, eligibility: scholarship.eligibility } },
                      });
                    }}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {aiLoading ? 'Thinking...' : wordCount < 10 ? 'Write more first' : 'Get AI Feedback'}
                  </Button>
                </CardContent>
              </Card>

              {/* Quick Guidelines */}
              <Card className="bg-card">
                <CardHeader className="py-4">
                  <CardTitle className="text-sm font-semibold">Quick Tips</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-xs text-muted-foreground space-y-2.5">
                    <li className="flex gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" /> Match your tone to the provider&apos;s mission.</li>
                    <li className="flex gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" /> Use specific numbers and achievements.</li>
                    <li className="flex gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" /> Explain how this scholarship changes things for you.</li>
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
