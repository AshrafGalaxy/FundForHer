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
import { Loader2, ArrowLeft, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useFirestore } from '@/firebase';
import { useAuth } from '@/app/auth-provider';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getProviderProfile } from '@/server/db/user-data';
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
  { value: 'Expired', label: 'Expired' },
];

const formSchema = z.object({
  title: z.string().min(10),
  amount: z.coerce.number().min(1000),
  deadline: z.string().optional(),
  eligibilityCriteria: z.string().min(30),
  description: z.string().min(50),
  gender: z.string().min(1),
  location: z.string().min(1),
  religion: z.string().min(1),
  scholarshipType: z.string().min(1),
  status: z.string().min(1),
  minCgpa: z.coerce.number().min(0).max(10).optional(),
  officialLink: z.string().url().optional().or(z.literal('')),
  eligibilityLevel: z.array(z.string()).min(1),
  fieldOfStudy: z.array(z.string()).min(1),
  category: z.array(z.string()).min(1),
});

type FormValues = z.infer<typeof formSchema>;

function MultiSelectPills({ options, value, onChange }: { options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (opt: string) => {
    if (opt === 'All' || opt === 'Any' || opt === 'Pan-India') { onChange([opt]); return; }
    const next = value.includes(opt)
      ? value.filter(v => v !== opt)
      : [...value.filter(v => v !== 'All' && v !== 'Any'), opt];
    onChange(next.length ? next : []);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button key={opt} type="button" onClick={() => toggle(opt)}
          className={cn('text-xs px-3 py-1.5 rounded-full border font-medium transition-all',
            value.includes(opt) ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-muted-foreground/20 hover:border-primary/40'
          )}>
          {opt}
        </button>
      ))}
    </div>
  );
}

export default function EditScholarshipPage() {
  const authContext = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const params = useParams();
  const scholarshipId = params.scholarshipId as string;
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '', amount: 0, deadline: '', eligibilityCriteria: '', description: '',
      gender: 'All', location: 'Pan-India', religion: 'All', scholarshipType: 'Merit',
      status: 'active', minCgpa: undefined, officialLink: '',
      eligibilityLevel: [], fieldOfStudy: [], category: ['All'],
    },
  });

  useEffect(() => {
    if (!authContext?.user || !db || !scholarshipId) return;
    const load = async () => {
      try {
        const profile = await getProviderProfile(db, authContext.user!.uid);
        if (!profile || profile.kycStatus !== 'verified') { router.push('/provider/dashboard'); return; }
        const schDoc = await getDoc(doc(db, 'scholarships', scholarshipId));
        if (!schDoc.exists() || schDoc.data().providerId !== authContext.user!.uid) {
          toast({ title: 'Not Found', description: 'Scholarship not found or not yours.', variant: 'destructive' });
          router.push('/provider/dashboard'); return;
        }
        const d = schDoc.data();
        form.reset({
          title: d.title ?? '',
          amount: d.amount ?? 0,
          deadline: d.deadline ?? '',
          eligibilityCriteria: d.eligibilityCriteria ?? '',
          description: d.description ?? '',
          gender: d.gender ?? 'All',
          location: d.location ?? 'Pan-India',
          religion: d.religion ?? 'All',
          scholarshipType: d.scholarshipType ?? 'Merit',
          status: d.status ?? 'active',
          minCgpa: d.minCgpa ?? undefined,
          officialLink: d.officialLink ?? '',
          eligibilityLevel: d.eligibilityLevel ?? [],
          fieldOfStudy: d.fieldOfStudy ?? [],
          category: d.category ?? ['All'],
        });
      } catch (e) { console.error(e); } finally { setPageLoading(false); }
    };
    load();
  }, [authContext?.user, db, scholarshipId]);

  const watched = useWatch({ control: form.control });
  const healthChecks = [
    { label: 'Title', ok: (watched.title?.length ?? 0) >= 10 },
    { label: 'Amount', ok: (watched.amount ?? 0) >= 1000 },
    { label: 'Eligibility', ok: (watched.eligibilityCriteria?.length ?? 0) >= 30 },
    { label: 'Description', ok: (watched.description?.length ?? 0) >= 50 },
    { label: 'Education Level', ok: (watched.eligibilityLevel?.length ?? 0) > 0 },
    { label: 'Field of Study', ok: (watched.fieldOfStudy?.length ?? 0) > 0 },
    { label: 'Gender & Location', ok: !!(watched.gender && watched.location) },
  ];
  const score = Math.round((healthChecks.filter(h => h.ok).length / healthChecks.length) * 100);

  async function onSubmit(values: FormValues) {
    if (!db) return;
    setIsLoading(true);
    try {
      await updateDoc(doc(db, 'scholarships', scholarshipId), {
        ...values,
        minCgpa: values.minCgpa ?? null,
        officialLink: values.officialLink || null,
        lastUpdated: serverTimestamp(),
      });
      toast({ title: 'Updated!', description: 'Scholarship has been saved.' });
      router.push('/provider/dashboard');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Update Failed', description: err.message });
    } finally { setIsLoading(false); }
  }

  if (pageLoading) return (
    <div className="flex justify-center items-center h-screen"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
  );

  return (
    <div className="container max-w-5xl mx-auto px-4 py-8">
      <Button asChild variant="ghost" className="mb-6 -ml-4">
        <Link href="/provider/dashboard"><ArrowLeft className="mr-2" /> Back to Dashboard</Link>
      </Button>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card className="shadow-lg border-primary/20">
            <CardHeader>
              <CardTitle className="font-headline text-3xl">Edit Scholarship</CardTitle>
              <CardDescription>Update the details below. Changes go live immediately after saving.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem><FormLabel>Scholarship Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField control={form.control} name="amount" render={({ field }) => (
                      <FormItem><FormLabel>Amount (₹) *</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="deadline" render={({ field }) => (
                      <FormItem><FormLabel>Deadline</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="minCgpa" render={({ field }) => (
                      <FormItem><FormLabel>Min CGPA / %</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {([
                      { name: 'gender', label: 'Gender', options: GENDERS },
                      { name: 'religion', label: 'Religion', options: RELIGIONS },
                      { name: 'scholarshipType', label: 'Type', options: SCHOLARSHIP_TYPES },
                      { name: 'status', label: 'Status', options: STATUSES.map(s => s.value) },
                    ] as any[]).map(({ name, label, options }) => (
                      <FormField key={name} control={form.control} name={name} render={({ field }) => (
                        <FormItem><FormLabel>{label}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>{options.map((o: string) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                          </Select><FormMessage /></FormItem>
                      )} />
                    ))}
                  </div>
                  <FormField control={form.control} name="location" render={({ field }) => (
                    <FormItem><FormLabel>Location *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>{LOCATIONS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                      </Select><FormMessage /></FormItem>
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
                      <FormLabel>Category *</FormLabel>
                      <MultiSelectPills options={CATEGORIES} value={field.value} onChange={field.onChange} />
                      {fieldState.error && <p className="text-xs text-destructive">{fieldState.error.message}</p>}
                    </div>
                  )} />
                  <FormField control={form.control} name="eligibilityCriteria" render={({ field }) => (
                    <FormItem><FormLabel>Eligibility Criteria *</FormLabel><FormControl><Textarea className="h-24" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem><FormLabel>Description *</FormLabel><FormControl><Textarea className="h-28" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="officialLink" render={({ field }) => (
                    <FormItem><FormLabel>Official Link</FormLabel><FormControl><Input placeholder="https://" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <Button type="submit" className="w-full text-base" disabled={isLoading}>
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null} Save Changes
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-1">
          <Card className="sticky top-6 border-secondary shadow-xl overflow-hidden">
            <div className="h-2 w-full bg-secondary">
              <div className="h-full bg-primary transition-all duration-700" style={{ width: `${score}%` }} />
            </div>
            <CardHeader className="text-center pb-2"><CardTitle className="font-headline text-lg">Health: {score}%</CardTitle></CardHeader>
            <CardContent className="space-y-1.5">
              {healthChecks.map(h => (
                <div key={h.label} className={cn('flex items-center gap-2 text-xs px-3 py-1.5 rounded-md',
                  h.ok ? 'bg-green-50 text-green-800 dark:bg-green-950/20 dark:text-green-400' : 'bg-muted text-muted-foreground')}>
                  {h.ok ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <ShieldAlert className="w-3.5 h-3.5 shrink-0" />}
                  {h.label}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
