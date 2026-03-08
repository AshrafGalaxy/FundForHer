'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth, useFirestore, useStorage } from '@/firebase';
import { doc, getDoc, setDoc, serverTimestamp, collection } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Scholarship } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Send, CheckCircle2, Wand2, FileText, Sparkles, MessageSquare, ShieldCheck, UploadCloud, X, FileIcon, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useCompletion } from '@ai-sdk/react';
import { useDropzone } from 'react-dropzone';

function ApplyFormContent() {
  const searchParams = useSearchParams();
  const scholarshipId = searchParams.get('scholarshipId');
  const [scholarship, setScholarship] = useState<Scholarship | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const auth = useAuth();
  const db = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const router = useRouter();

  const [formData, setFormData] = useState<{
    essay: string;
    gpa: string;
    major: string;
    documents: File[];
  }>({
    essay: '',
    gpa: '',
    major: '',
    documents: [],
  });

  const [prefilled, setPrefilled] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const onDrop = (acceptedFiles: File[]) => {
    setFormData(prev => ({ ...prev, documents: [...prev.documents, ...acceptedFiles] }));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    maxSize: 5242880, // 5MB
  });

  const removeDocument = (index: number) => {
    setFormData(prev => {
      const newDocs = [...prev.documents];
      newDocs.splice(index, 1);
      return { ...prev, documents: newDocs };
    });
  };
  const wordCount = formData.essay.trim().split(/\s+/).filter(word => word.length > 0).length;
  const wordProgress = Math.min((wordCount / 100) * 100, 100);

  // Groq AI Completion Hook
  const { completion, complete, isLoading: aiLoading } = useCompletion({
    api: '/api/ai/essay-assistant',
  });

  useEffect(() => {
    if (!scholarshipId || !auth?.currentUser || !db) {
      if (!scholarshipId) setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch Scholarship
        const docRef = doc(db, 'scholarships', scholarshipId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setScholarship({ id: docSnap.id, ...docSnap.data() } as Scholarship);
        }

        // Magic Prefill from Profile
        const userRef = doc(db, 'users', auth.currentUser!.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          if (userData.cgpa || userData.fieldOfStudy) {
            setFormData(prev => ({
              ...prev,
              gpa: userData.cgpa ? userData.cgpa.toString() : prev.gpa,
              major: userData.fieldOfStudy ? (Array.isArray(userData.fieldOfStudy) ? userData.fieldOfStudy[0] : userData.fieldOfStudy) : prev.major
            }));
            setPrefilled(true);
          }
        }
      } catch (err) {
        console.error("Failed to fetch application data:", err);
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
      toast({ title: "Storage Error", description: "Firebase storage is not initialized", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      // 1. Upload Documents to Firebase Vault
      const documentUrls: { name: string, url: string }[] = [];
      for (let i = 0; i < formData.documents.length; i++) {
        const file = formData.documents[i];
        const storageRef = ref(storage, `applications/${auth.currentUser.uid}/${scholarship.id}/${file.name}`);
        const uploadTask = await uploadBytesResumable(storageRef, file);
        const downloadUrl = await getDownloadURL(uploadTask.ref);
        documentUrls.push({ name: file.name, url: downloadUrl });
      }

      // 2. Create Global Submission ID 
      const appRef = doc(collection(db, 'applications'));

      const applicationData = {
        userId: auth.currentUser.uid,
        scholarshipId: scholarship.id,
        scholarshipTitle: scholarship.title,
        essay: formData.essay,
        gpa: formData.gpa,
        major: formData.major,
        documents: documentUrls,
        status: 'Submitted',
        submittedAt: serverTimestamp()
      };

      // Save global application
      await setDoc(appRef, applicationData);

      // Save a normalized reference to the user's personal applications subcollection
      const userAppRef = doc(db, 'users', auth.currentUser.uid, 'applications', scholarship.id);
      await setDoc(userAppRef, {
        applicationId: appRef.id,
        scholarshipTitle: scholarship.title,
        status: 'Submitted',
        submittedAt: serverTimestamp()
      });

      setSubmitted(true);
      toast({
        title: "Application Submitted!",
        description: `Your application for ${scholarship.title} has been successfully submitted.`,
      });

    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: err.message || "An error occurred while submitting your application."
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!scholarshipId || !scholarship) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center">
        <Card>
          <CardHeader>
            <CardTitle>No Scholarship Selected</CardTitle>
            <CardDescription>Please navigate back to the dashboard to select a scholarship to apply for.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/authenticated/dashboard">View Scholarships</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center">
        <Card className="border-green-200">
          <CardHeader>
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-2xl text-green-700">Application Received!</CardTitle>
            <CardDescription className="text-lg">Thank you for applying to the <span className="font-semibold">{scholarship.title}</span>.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Your application is currently under review. You will be notified via email of any status updates.</p>
          </CardContent>
          <CardFooter className="flex justify-center gap-4">
            <Button variant="outline" asChild>
              <Link href="/authenticated/dashboard">Back to Dashboard</Link>
            </Button>
            <Button asChild>
              <Link href="/authenticated/profile">View Profile</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <Button variant="ghost" className="mb-6 -ml-4 hover:bg-theme-100 dark:hover:bg-theme-900" asChild>
        <Link href={`/scholarship/${scholarshipId}`}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Details
        </Link>
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Main Application Form (Left Column) */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-lg border-theme-200 dark:border-theme-800 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-theme-400 via-primary to-theme-600" />
            <CardHeader className="bg-gradient-to-b from-theme-50/50 to-transparent dark:from-theme-900/20 border-b pb-6">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-3xl font-headline text-foreground tracking-tight">Application</CardTitle>
                  <CardDescription className="text-base mt-2 flex flex-col gap-1">
                    <span className="font-semibold text-theme-700 dark:text-theme-300 text-lg">{scholarship.title}</span>
                    <span className="text-muted-foreground flex items-center gap-1.5"><FileText className="w-4 h-4" /> {scholarship.provider}</span>
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-8 pt-8">

                {/* Magic Prefill Notice */}
                <AnimatePresence>
                  {prefilled && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
                      className="bg-primary/10 border border-primary/20 text-primary-foreground rounded-lg p-3 flex items-start gap-3"
                    >
                      <div className="bg-primary/20 p-2 rounded-md mt-0.5">
                        <Wand2 className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">Magic Prefill Active</p>
                        <p className="text-xs text-muted-foreground">We securely pulled your Academic Profile to save you time. You can edit these below if needed.</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-secondary/30 p-5 rounded-xl border border-dashed">
                  <div className="space-y-2">
                    <Label htmlFor="gpa" className="font-semibold text-foreground/80">Current GPA / % <span className="text-destructive">*</span></Label>
                    <div className="relative">
                      <Input
                        id="gpa"
                        placeholder="e.g. 3.8 or 85%"
                        required
                        className="bg-card transition-all focus-visible:ring-primary/50"
                        value={formData.gpa}
                        onChange={(e) => setFormData({ ...formData, gpa: e.target.value })}
                      />
                      {prefilled && formData.gpa === formData.gpa && <Sparkles className="w-3.5 h-3.5 absolute right-3 top-3 text-primary opacity-50 pointer-events-none" />}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="major" className="font-semibold text-foreground/80">Intended Field of Study <span className="text-destructive">*</span></Label>
                    <div className="relative">
                      <Input
                        id="major"
                        placeholder="e.g. Computer Science"
                        required
                        className="bg-card transition-all focus-visible:ring-primary/50"
                        value={formData.major}
                        onChange={(e) => setFormData({ ...formData, major: e.target.value })}
                      />
                      {prefilled && formData.major === formData.major && <Sparkles className="w-3.5 h-3.5 absolute right-3 top-3 text-primary opacity-50 pointer-events-none" />}
                    </div>
                  </div>
                </div>

                {/* The Document Vault */}
                <div className="space-y-3 pt-2">
                  <Label className="text-lg font-headline font-semibold flex items-center gap-2">The Document Vault <ShieldAlert className="w-4 h-4 text-theme-500" /></Label>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Securely upload any requested transcripts, ID proofs, or recommendation letters. Max 5MB per file (PDF, JPG, PNG).
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
                        <p className="text-xs text-muted-foreground mt-1">Files are hashed and encrypted over Firebase Storage.</p>
                      </div>
                    )}
                  </div>

                  {formData.documents.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                      {formData.documents.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg border">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <FileIcon className="w-5 h-5 text-primary flex-shrink-0" />
                            <div className="flex flex-col overflow-hidden">
                              <p className="text-sm font-medium truncate">{file.name}</p>
                              <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                          </div>
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => removeDocument(idx)}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* The Essay Zone */}
                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <Label htmlFor="essay" className="text-lg font-headline font-semibold">Personal Statement <span className="text-destructive">*</span></Label>
                    <Badge variant={wordCount >= 100 ? "default" : "secondary"} className={`transition-colors ${wordCount >= 100 ? 'bg-emerald-500 hover:bg-emerald-600 shadow-sm shadow-emerald-500/20' : ''}`}>
                      {wordCount} / 100 min words
                    </Badge>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${wordCount >= 100 ? 'bg-emerald-500' : 'bg-primary'}`}
                      style={{ width: `${wordProgress}%` }}
                    />
                  </div>

                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Explain why you are the best candidate for this scholarship and how the funds will impact your educational journey.
                  </p>

                  <div className="relative group">
                    <Textarea
                      id="essay"
                      placeholder="Start writing your story here..."
                      className="min-h-[350px] resize-y text-base p-5 leading-relaxed transition-colors border-muted-foreground/20 focus-visible:border-primary/50 bg-card/50 focus-visible:bg-card"
                      required
                      value={formData.essay}
                      onChange={(e) => setFormData({ ...formData, essay: e.target.value })}
                    />
                  </div>
                </div>
              </CardContent>

              <CardFooter className="bg-muted/10 border-t py-6 flex flex-col sm:flex-row justify-between items-center gap-4 mt-6">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> End-to-end encrypted submission</p>
                <Button
                  type="submit"
                  size="lg"
                  className={wordCount >= 100 ? "shadow-lg shadow-primary/20 bg-theme-600 hover:bg-theme-700 w-full sm:w-auto text-white rounded-xl" : "w-full sm:w-auto rounded-xl"}
                  disabled={submitting || wordCount < 100}
                >
                  {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting securely...</> : <><Send className="h-4 w-4 mr-2" /> Submit Application</>}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>

        {/* Real-time AI Assistant Sidebar (Right Column) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="sticky top-6">
            <Card className="border-primary/20 shadow-md bg-gradient-to-b from-primary/5 to-transparent">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-headline flex items-center gap-2">
                  <div className="p-1.5 bg-primary/20 rounded-md text-primary">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  Real-time AI Assistant
                </CardTitle>
                <CardDescription>
                  Stuck? Get instant, personalized tips from Groq AI as you write.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-card border rounded-lg p-4 text-sm text-foreground/90 shadow-sm relative min-h-[100px]">
                  {aiLoading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      <span className="text-xs">Analyzing your draft...</span>
                    </div>
                  ) : completion ? (
                    <div className="prose prose-sm dark:prose-invert">
                      <p className="leading-relaxed">{completion}</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center h-full gap-2 text-muted-foreground/60">
                      <MessageSquare className="w-8 h-8 opacity-20" />
                      <p className="text-xs">Start writing your essay and click below to get magical feedback.</p>
                    </div>
                  )}
                </div>

                <Button
                  variant="secondary"
                  className="w-full flex items-center gap-2"
                  disabled={wordCount < 10 || aiLoading}
                  onClick={(e) => {
                    e.preventDefault();
                    complete(`Review this paragraph and give me one punchy tip to make it stand out.`, {
                      body: { essay: formData.essay, scholarshipInfo: { title: scholarship.title, provider: scholarship.provider, eligibility: scholarship.eligibility } }
                    });
                  }}
                >
                  <Sparkles className="w-4 h-4" />
                  {aiLoading ? 'Thinking...' : wordCount < 10 ? 'Write more to get tips' : 'Get AI Feedback'}
                </Button>
              </CardContent>
            </Card>

            <Card className="mt-6 bg-card">
              <CardHeader className="py-4">
                <CardTitle className="text-sm">Quick Guidelines</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-xs text-muted-foreground space-y-3">
                  <li className="flex gap-2.5"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Match your tone to the provider&apos;s mission.</li>
                  <li className="flex gap-2.5"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Use specific numbers and achievements.</li>
                  <li className="flex gap-2.5"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Explain explicitly how this money changes things for you.</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function ApplyPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <ApplyFormContent />
    </Suspense>
  );
}
