'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useAuth, useFirestore } from '@/firebase';
import { doc, getDoc, setDoc, serverTimestamp, collection } from 'firebase/firestore';
import { Scholarship } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Send, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

function ApplyFormContent() {
  const searchParams = useSearchParams();
  const scholarshipId = searchParams.get('scholarshipId');
  const [scholarship, setScholarship] = useState<Scholarship | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [formData, setFormData] = useState({
    essay: '',
    gpa: '',
    major: '',
  });

  useEffect(() => {
    if (!scholarshipId) {
      setLoading(false);
      return;
    }

    const fetchScholarship = async () => {
      if (!db) return;
      try {
        const docRef = doc(db, 'scholarships', scholarshipId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setScholarship({ id: docSnap.id, ...docSnap.data() } as Scholarship);
        }
      } catch (err) {
        console.error("Failed to fetch scholarship details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchScholarship();
  }, [scholarshipId, db]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth?.currentUser || !db || !scholarship) return;

    setSubmitting(true);
    try {
      // Create a unique submission ID 
      const appRef = doc(collection(db, 'applications'));

      const applicationData = {
        userId: auth.currentUser.uid,
        scholarshipId: scholarship.id,
        scholarshipTitle: scholarship.title,
        essay: formData.essay,
        gpa: formData.gpa,
        major: formData.major,
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
    <div className="max-w-3xl mx-auto py-8 px-4">
      <Button variant="ghost" className="mb-6 -ml-4" asChild>
        <Link href={`/scholarship/${scholarshipId}`}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Details
        </Link>
      </Button>

      <Card className="shadow-lg">
        <CardHeader className="bg-primary/5 border-b">
          <CardTitle className="text-2xl font-headline text-primary">Application Form</CardTitle>
          <CardDescription className="text-base mt-2 flex flex-col">
            <span className="font-semibold text-foreground">{scholarship.title}</span>
            <span className="text-muted-foreground">{scholarship.provider}</span>
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6 pt-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gpa">Current GPA (or Percentage) <span className="text-destructive">*</span></Label>
                <Input
                  id="gpa"
                  placeholder="e.g. 3.8 or 85%"
                  required
                  value={formData.gpa}
                  onChange={(e) => setFormData({ ...formData, gpa: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="major">Intended Field of Study <span className="text-destructive">*</span></Label>
                <Input
                  id="major"
                  placeholder="e.g. Computer Science"
                  required
                  value={formData.major}
                  onChange={(e) => setFormData({ ...formData, major: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="essay">Personal Statement / Essay <span className="text-destructive">*</span></Label>
              <p className="text-xs text-muted-foreground mb-2">Please explain why you are the best candidate for this scholarship and how the funds will impact your educational journey. (Minimum 100 words)</p>
              <Textarea
                id="essay"
                placeholder="Write your essay here..."
                className="min-h-[250px]"
                required
                value={formData.essay}
                onChange={(e) => setFormData({ ...formData, essay: e.target.value })}
              />
            </div>
          </CardContent>

          <CardFooter className="bg-muted/20 border-t py-4 flex justify-between">
            <p className="text-xs text-muted-foreground">Make sure your profile details are fully updated before submitting.</p>
            <Button type="submit" disabled={submitting || formData.essay.length < 50}>
              {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting</> : <><Send className="h-4 w-4 mr-2" /> Submit Application</>}
            </Button>
          </CardFooter>
        </form>
      </Card>
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
