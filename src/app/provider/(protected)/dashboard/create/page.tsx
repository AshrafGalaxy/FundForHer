'use client';

import { useState, useEffect } from 'react';
import { useForm, useWatch, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowLeft, ShieldAlert, CheckCircle2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useFirestore } from '@/firebase';
import { useAuth } from '@/app/auth-provider';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getProviderProfile } from '@/server/db/user-data';
import type { ProviderProfile } from '@/server/db/user-data';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const EDUCATION_LEVELS = ['Class 10', 'Class 12', 'UG', 'PG', 'PhD', 'Diploma', 'Professional'];
const FIELDS_OF_STUDY = ['Engineering', 'Medical', 'Science', 'Commerce', 'Arts', 'Law', 'Management', 'Education', 'Agriculture', 'Any'];
const CATEGORIES = ['General', 'SC', 'ST', 'OBC', 'EWS', 'Minority', 'PwD', 'All'];
const RELIGIONS = ['All', 'Hindu', 'Muslim', 'Christian', 'Sikh', 'Buddhist', 'Jain', 'Parsi', 'Other'];
const SCHOLARSHIP_TYPES = ['Merit', 'Need-based', 'Category-specific', 'Minority', 'Sports', 'Research', 'Vocational'];
const GENDERS = ['All', 'Female', 'Male', 'Transgender'];
const LOCATIONS = ['Pan-India', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'];
const STATUSES = [
  { value: 'active', label: 'Live Now' },
  { value: 'Upcoming', label: 'Upcoming' },
  { value: 'Always Open', label: 'Always Open' },
];

const formSchema = z.object({
  title: z.string().min(10, 'Title must be at least 10 characters.'),
  amount: z.coerce.number().min(1000, 'Minimum funding is ₹1,000.'),
  deadline: z.string().optional(),
  eligibilityCriteria: z.string().min(30, 'Eligibility must be at least 30 characters.'),
  description: z.string().min(50, 'Description must be at least 50 characters.'),
  gender: z.string().min(1, 'Select a gender eligibility.'),
  location: z.string().min(1, 'Select a location.'),
  religion: z.string().min(1, 'Select religion eligibility.'),
  scholarshipType: z.string().min(1, 'Select scholarship type.'),
  status: z.string().min(1, 'Select a status.'),
  minCgpa: z.coerce.number().min(0).max(10).optional(),
  officialLink: z.string().url('Enter a valid URL.').optional().or(z.literal('')),
  eligibilityLevel: z.array(z.string()).min(1, 'Select at least one education level.'),
  fieldOfStudy: z.array(z.string()).min(1, 'Select at least one field of study.'),
  category: z.array(z.string()).min(1, 'Select at least one category.'),
});

type FormValues = z.infer<typeof formSchema>;

function MultiSelectPills({
  options, value, onChange, placeholder,
}: { options: string[]; value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const toggle = (opt: string) => {
    if (opt === 'All' || opt === 'Any' || opt === 'Pan-India') {
      onChange([opt]);
    } else {
      const next = value.includes(opt)
        ? value.filter(v => v !== opt)
        : [...value.filter(v => v !== 'All' && v !== 'Any' && v !== 'Pan-India'), opt];
      onChange(next.length ? next : []);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => toggle(opt)}
          className={cn(
            'text-xs px-3 py-1.5 rounded-full border font-medium transition-all',
            value.includes(opt)
              ? 'bg-primary text-primary-foreground border-primary shadow-sm'
              : 'bg-muted text-muted-foreground border-muted-foreground/20 hover:border-primary/40 hover:text-foreground'
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

export default function CreateScholarshipPage() {
  const authContext = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [providerProfile, setProviderProfile] = useState<ProviderProfile | null>(null);

  useEffect(() => {
    if (authContext?.user && db) {
      getProviderProfile(db, authContext.user.uid).then(profile => {
        if (profile?.kycStatus === 'verified') {
          setProviderProfile(profile);
        } else {
          toast({ title: 'Restricted', description: 'Your account must be verified to post scholarships.', variant: 'destructive' });
          router.push('/provider/dashboard');
        }
      });
    }
  }, [authContext?.user, db]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '', amount: 0, deadline: '', eligibilityCriteria: '', description: '',
      gender: 'All', location: 'Pan-India', religion: 'All', scholarshipType: 'Merit',
      status: 'active', minCgpa: undefined, officialLink: '',
      eligibilityLevel: [], fieldOfStudy: [], category: ['All'],
    },
  });

  const watched = useWatch({ control: form.control });
  const healthChecks = [
    { label: 'Title', ok: (watched.title?.length ?? 0) >= 10 },
    { label: 'Amount', ok: (watched.amount ?? 0) >= 1000 },
    { label: 'Eligibility Criteria', ok: (watched.eligibilityCriteria?.length ?? 0) >= 30 },
    { label: 'Description', ok: (watched.description?.length ?? 0) >= 50 },
    { label: 'Education Level', ok: (watched.eligibilityLevel?.length ?? 0) > 0 },
    { label: 'Field of Study', ok: (watched.fieldOfStudy?.length ?? 0) > 0 },
    { label: 'Gender & Location', ok: !!(watched.gender && watched.location) },
  ];
  const score = Math.round((healthChecks.filter(h => h.ok).length / healthChecks.length) * 100);
  const canPublish = score === 100;

  async function onSubmit(values: FormValues) {
    if (!db || !providerProfile) return;
    setIsLoading(true);
    try {
      await addDoc(collection(db, 'scholarships'), {
        title: values.title,
        amount: values.amount,
        deadline: values.deadline || null,
        eligibilityCriteria: values.eligibilityCriteria,
        description: values.description,
        gender: values.gender,
        location: values.location,
        religion: values.religion,
        scholarshipType: values.scholarshipType,
        status: values.status,
        minCgpa: values.minCgpa ?? null,
        officialLink: values.officialLink || null,
        eligibilityLevel: values.eligibilityLevel,
        fieldOfStudy: values.fieldOfStudy,
        category: values.category,
        providerId: providerProfile.uid,
        provider: providerProfile.companyName,
        isFeatured: false,
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp(),
      });
      toast({ title: 'Published!', description: 'Scholarship is now live on the platform.' });
      router.push('/provider/dashboard');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed to publish', description: err.message });
    } finally {
      setIsLoading(false);
    }
  }

  if (!providerProfile) return null;

  return (
    <div className="container max-w-5xl mx-auto px-4 py-8">
      <Button asChild variant="ghost" className="mb-6 -ml-4">
        <Link href="/provider/dashboard"><ArrowLeft className="mr-2" /> Back to Dashboard</Link>
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form */}
        <div className="lg:col-span-2">
          <Card className="shadow-lg border-primary/20">
            <CardHeader>
              <CardTitle className="font-headline text-3xl">Post a Scholarship</CardTitle>
              <CardDescription>Complete all fields so our AI can accurately match eligible students.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                  <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Scholarship Name *</FormLabel>
                      <FormControl><Input placeholder="E.g. Women in Engineering Merit Grant 2026" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField control={form.control} name="amount" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount (₹) *</FormLabel>
                        <FormControl><Input type="number" placeholder="50000" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="deadline" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Deadline</FormLabel>
                        <FormControl><Input type="date" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="minCgpa" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Min CGPA / %</FormLabel>
                        <FormControl><Input type="number" step="0.1" placeholder="6.5" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="gender" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gender Eligibility *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>{GENDERS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="religion" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Religion</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>{RELIGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="scholarshipType" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Scholarship Type *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>{SCHOLARSHIP_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="status" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>{STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <FormField control={form.control} name="location" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>{LOCATIONS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <Controller control={form.control} name="eligibilityLevel" render={({ field, fieldState }) => (
                    <div className="space-y-2">
                      <FormLabel>Education Levels *</FormLabel>
                      <MultiSelectPills options={EDUCATION_LEVELS} value={field.value} onChange={field.onChange} />
                      {fieldState.error && <p className="text-xs text-destructive">{fieldState.error.message}</p>}
                    </div>
                  )} />

                  <Controller control={form.control} name="fieldOfStudy" render={({ field, fieldState }) => (
                    <div className="space-y-2">
                      <FormLabel>Fields of Study *</FormLabel>
                      <MultiSelectPills options={FIELDS_OF_STUDY} value={field.value} onChange={field.onChange} />
                      {fieldState.error && <p className="text-xs text-destructive">{fieldState.error.message}</p>}
                    </div>
                  )} />

                  <Controller control={form.control} name="category" render={({ field, fieldState }) => (
                    <div className="space-y-2">
                      <FormLabel>Category Eligibility *</FormLabel>
                      <MultiSelectPills options={CATEGORIES} value={field.value} onChange={field.onChange} />
                      {fieldState.error && <p className="text-xs text-destructive">{fieldState.error.message}</p>}
                    </div>
                  )} />

                  <FormField control={form.control} name="eligibilityCriteria" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Eligibility Criteria *</FormLabel>
                      <FormControl><Textarea className="h-24" placeholder="Must be enrolled in 3rd year BE/BTech (Computer Science or IT)..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description & Rubric *</FormLabel>
                      <FormControl><Textarea className="h-28" placeholder="Explain the motivation behind this grant and what the selection panel will evaluate..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="officialLink" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Official Website Link</FormLabel>
                      <FormControl><Input placeholder="https://yourorg.com/scholarship" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <Button type="submit" className="w-full text-base shadow-xl" disabled={isLoading || !canPublish}>
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                    {canPublish ? 'Publish Scholarship' : 'Complete All Fields to Publish'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Health Meter */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6 border-secondary overflow-hidden shadow-2xl">
            <div className="h-2 w-full bg-secondary">
              <div className={`h-full transition-all duration-700 ease-out ${canPublish ? 'bg-green-500' : 'bg-primary'}`} style={{ width: `${score}%` }} />
            </div>
            <CardHeader className="text-center pb-2">
              <CardTitle className="font-headline text-xl">Listing Health</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="72" cy="72" r="64" className="stroke-secondary" strokeWidth="10" fill="none" />
                  <circle cx="72" cy="72" r="64" className={`${canPublish ? 'stroke-green-500' : 'stroke-primary'} transition-all duration-1000`} strokeWidth="10" strokeDasharray={402} strokeDashoffset={402 - (402 * score) / 100} strokeLinecap="round" fill="none" />
                </svg>
                <span className={`absolute text-4xl font-bold font-headline ${canPublish ? 'text-green-600' : 'text-primary'}`}>{score}%</span>
              </div>
              <div className="w-full space-y-1.5">
                {healthChecks.map(h => (
                  <div key={h.label} className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-md ${h.ok ? 'bg-green-50 text-green-800 dark:bg-green-950/20 dark:text-green-400' : 'bg-muted text-muted-foreground'}`}>
                    {h.ok ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <ShieldAlert className="w-3.5 h-3.5 shrink-0" />}
                    {h.label}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
