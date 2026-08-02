'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, UserPlus, CheckCircle2, Building2, Globe, Phone, Mail, Lock, FileText, MapPin, Users, ArrowRight } from 'lucide-react';
import { registerProvider } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, useFirestore } from '@/firebase';
import { Badge } from '@/components/ui/badge';

// ── Schema — registration + GST are optional for free-tier demo ────────────
const formSchema = z.object({
  companyName:        z.string().min(3, 'Organisation name must be at least 3 characters.'),
  companyPhone:       z.string().regex(/^\d{10}$/, 'Enter a valid 10-digit phone number.'),
  email:              z.string().email('Enter a valid email address.'),
  registrationNumber: z.string().optional(),
  gstNumber:          z.string().optional(),
  websiteUrl:         z.string().url('Enter a valid URL (https://...)').optional().or(z.literal('')),
  description:        z.string().max(400).optional(),
  orgType:            z.string().min(1, 'Select an organisation type.'),
  state:              z.string().min(1, 'Select your state.'),
  city:               z.string().min(2, 'Enter your city.'),
  password:           z.string().min(6, 'Password must be at least 6 characters.'),
  confirmPassword:    z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type FormValues = z.infer<typeof formSchema>;

const ORG_TYPES = [
  'Non-Profit Trust', 'NGO', 'Private Foundation', 'Corporate CSR',
  'Government Body', 'Educational Institution', 'Religious Trust', 'Other',
];

const INDIA_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh',
  'Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka',
  'Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram',
  'Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu',
  'Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
  'Delhi','Jammu & Kashmir','Ladakh','Puducherry',
];

// ── Step indicator ────────────────────────────────────────────────────────
function StepBar({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center gap-2 justify-center mb-2 px-6">
      {[1, 2].map(s => (
        <div key={s} className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
            step >= s ? 'bg-primary border-primary text-primary-foreground' : 'border-muted text-muted-foreground'
          }`}>{step > s ? <CheckCircle2 className="w-4 h-4" /> : s}</div>
          {s < 2 && <div className={`h-0.5 w-12 rounded-full transition-all ${step > s ? 'bg-primary' : 'bg-muted'}`} />}
        </div>
      ))}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────
export function ProviderRegisterForm() {
  const auth = useAuth();
  const db   = useFirestore();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep]           = useState<1 | 2>(1);
  const { toast } = useToast();
  const router    = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: '', companyPhone: '', email: '',
      registrationNumber: '', gstNumber: '', websiteUrl: '',
      description: '', orgType: '', state: '', city: '',
      password: '', confirmPassword: '',
    },
  });

  // Step 1 → Step 2 (validate basic fields first)
  const handleNextStep = async () => {
    const ok = await form.trigger([
      'companyName', 'companyPhone', 'email', 'orgType', 'state', 'city',
    ]);
    if (ok) setStep(2);
  };

  async function onSubmit(values: FormValues) {
    if (!auth || !db) {
      toast({ variant: 'destructive', title: 'Error', description: 'Firebase not initialised.' });
      return;
    }
    setIsLoading(true);
    try {
      const { password, confirmPassword, websiteUrl, description, ...providerData } = values;

      // AUTO-VERIFY: set kycStatus = 'verified' immediately so providers
      // can use the dashboard without waiting for manual approval.
      // KYC documents are optional — provider can upload later from profile page.
      await registerProvider(auth, db, {
        ...providerData,
        registrationNumber: providerData.registrationNumber || 'N/A',
        gstNumber:          providerData.gstNumber || 'N/A',
        websiteUrl:         websiteUrl || null,
        description:        description || null,
        kycStatus:          'verified',   // ← immediate access, no gate
        kycDocumentUrl:     null,         // ← optional, can upload from profile
      }, password);

      toast({
        title: 'Account Created!',
        description: 'Welcome to Fund Her Future. Your dashboard is ready.',
      });
      router.push('/provider/dashboard');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Registration Failed',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="overflow-hidden shadow-2xl border-0">
      {/* Progress bar */}
      <div className="h-1 w-full bg-muted">
        <div
          className="h-full bg-primary transition-all duration-700 ease-in-out"
          style={{ width: step === 1 ? '50%' : '100%' }}
        />
      </div>

      <CardHeader className="text-center pt-7 pb-2">
        <StepBar step={step} />
        <CardTitle className="font-headline text-2xl mt-3">
          {step === 1 ? 'Create a Provider Account' : 'Organisation Details'}
        </CardTitle>
        <CardDescription>
          {step === 1
            ? 'Basic info to get you started on Fund Her Future'
            : 'Help students discover your organisation (all optional except city & state)'}
        </CardDescription>
      </CardHeader>

      <CardContent className="pb-2">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            {/* ── Step 1: Identity + credentials ─────────────────────────── */}
            {step === 1 && (
              <>
                {/* Row 1 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="companyName" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> Organisation Name *</FormLabel>
                      <FormControl><Input placeholder="Trust / Foundation / Company" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Official Email *</FormLabel>
                      <FormControl><Input type="email" placeholder="contact@organisation.com" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {/* Row 2 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="companyPhone" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Contact Phone *</FormLabel>
                      <FormControl><Input placeholder="10-digit mobile number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="orgType" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Organisation Type *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ORG_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {/* Row 3: Location */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="state" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> State *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select state..." /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {INDIA_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="city" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> City *</FormLabel>
                      <FormControl><Input placeholder="Mumbai, Pune..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {/* Row 4: Password */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> Password *</FormLabel>
                      <FormControl><Input type="password" placeholder="Min. 6 characters" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> Confirm Password *</FormLabel>
                      <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <Button type="button" onClick={handleNextStep} className="w-full mt-2 gap-2">
                  Next: Organisation Details <ArrowRight className="w-4 h-4" />
                </Button>
              </>
            )}

            {/* ── Step 2: Optional org details + submit ──────────────────── */}
            {step === 2 && (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary" className="text-[10px]">All fields below are optional</Badge>
                </div>

                {/* Website */}
                <FormField control={form.control} name="websiteUrl" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> Website URL</FormLabel>
                    <FormControl><Input placeholder="https://yourorganisation.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Mission */}
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Mission / About</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Briefly describe your scholarship mission (shown to students)..."
                        className="h-20 resize-none"
                        maxLength={400}
                        {...field}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground text-right">{(field.value?.length ?? 0)}/400</p>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Legal numbers (fully optional) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="registrationNumber" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reg. Number <span className="text-muted-foreground text-xs">(CIN / Trust — optional)</span></FormLabel>
                      <FormControl><Input placeholder="e.g. U85300MH2010NPL..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="gstNumber" render={({ field }) => (
                    <FormItem>
                      <FormLabel>GSTIN <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                      <FormControl><Input placeholder="15-character GST number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="flex gap-3 mt-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)}>
                    ← Back
                  </Button>
                  <Button type="submit" disabled={isLoading || !auth} className="flex-1 gap-2">
                    {isLoading
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating Account...</>
                      : <><UserPlus className="w-4 h-4" /> Create Account &amp; Go to Dashboard</>}
                  </Button>
                </div>

                <p className="text-xs text-center text-muted-foreground mt-1">
                  You can upload KYC documents anytime from your profile page.
                </p>
              </>
            )}
          </form>
        </Form>
      </CardContent>

      <CardFooter className="flex justify-center text-sm pb-6 pt-2">
        <p>Already have an account?{' '}
          <Link href="/provider/login" className="font-semibold text-primary hover:underline">Log In</Link>
        </p>
      </CardFooter>
    </Card>
  );
}
