'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, UserPlus, ArrowRight, ShieldCheck } from 'lucide-react';
import { registerProvider } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, useFirestore } from '@/firebase';
import type { User } from 'firebase/auth';
import { KycDropzone } from '@/components/provider/KycDropzone';
import { updateProviderProfile } from '@/server/db/user-data';

const formSchema = z.object({
  companyName: z.string().min(3, { message: 'Company name must be at least 3 characters.' }),
  companyPhone: z.string().regex(/^\d{10}$/, { message: 'Please enter a valid 10-digit phone number.' }),
  email: z.string().email({ message: 'Please enter a valid company email address.' }),
  registrationNumber: z.string().min(5, { message: 'Registration number is required.' }),
  gstNumber: z.string().length(15, { message: 'Please enter a valid 15-character GST number.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type FormValues = z.infer<typeof formSchema>;

export function ProviderRegisterForm() {
  const auth = useAuth();
  const db = useFirestore();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [registeredUser, setRegisteredUser] = useState<User | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: '',
      companyPhone: '',
      email: '',
      registrationNumber: '',
      gstNumber: '',
      password: '',
      confirmPassword: '',
    },
  });

  async function onSubmit(values: FormValues) {
    if (!auth || !db) {
      toast({ variant: 'destructive', title: 'Error', description: 'Firebase not initialized.' });
      return;
    }
    setIsLoading(true);
    try {
      const { password, confirmPassword, ...providerData } = values;
      const user = await registerProvider(auth, db, {
        ...providerData,
        kycStatus: 'pending',
        kycDocumentUrl: null
      }, password);
      setRegisteredUser(user);
      setStep(2);
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

  const handleKycSuccess = async (url: string) => {
    if (!db || !registeredUser) return;
    try {
      await updateProviderProfile(db, registeredUser.uid, { kycDocumentUrl: url });
      setStep(3);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Status Update Failed', description: e.message });
    }
  };

  if (step === 3) {
    return (
      <Card className="border-primary/20 bg-primary/5 shadow-2xl">
        <CardHeader className="text-center pt-10">
          <div className="mx-auto w-20 h-20 bg-green-100 text-green-600 rounded-full flex flex-col items-center justify-center mb-6 shadow-sm border border-green-200">
            <ShieldCheck className="w-10 h-10" />
          </div>
          <CardTitle className="font-headline text-3xl text-zinc-900">Verification Pending</CardTitle>
          <CardDescription className="text-base mt-2 px-6">
            Your KYC documents have been securely encrypted and submitted. Our team will review your organization to ensure the safety of our students. You'll receive an email once your <strong>Blue Tick</strong> is approved.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-center pb-10 mt-4">
          <Button onClick={() => router.push('/provider/dashboard')} className="w-2/3 shadow-md hover:-translate-y-1 transition-transform">
            Go to Dashboard <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (step === 2 && registeredUser) {
    return (
      <Card className="border-secondary overflow-hidden">
        <div className="h-1.5 w-full bg-secondary">
          <div className="h-full bg-primary w-2/3 transition-all duration-1000 ease-in-out"></div>
        </div>
        <CardHeader className="text-center pt-8">
          <CardTitle className="font-headline text-2xl">Secure KYC Upload</CardTitle>
          <CardDescription>
            To prevent fraud and earn your <strong>Verified Provider Badge</strong>, please upload your official GSTIN or Trust registration PDF.
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-8">
          <KycDropzone user={registeredUser} onUploadSuccess={handleKycSuccess} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="h-1.5 w-full bg-secondary">
        <div className="h-full bg-primary w-1/3 transition-all duration-1000 ease-in-out"></div>
      </div>
      <CardHeader className="text-center pt-8">
        <CardTitle className="font-headline text-2xl">Create a Provider Account</CardTitle>
        <CardDescription>Join the platform to securely list and manage your scholarships</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Trust or Company Inc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Official Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="contact@organization.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="companyPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Official Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="9876543210" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="registrationNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reg. Number (CIN/Trust)</FormLabel>
                    <FormControl>
                      <Input placeholder="Registration #..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gstNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GST Number (If Any)</FormLabel>
                    <FormControl>
                      <Input placeholder="15-digit GSTIN" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" disabled={isLoading || !auth} className="w-full mt-4">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Create Provider Account
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-center text-sm pb-6">
        <p>Already have a provider account? <Link href="/provider/login" className="text-theme-900 font-semibold hover:text-theme-950 hover:underline">Log In</Link></p>
      </CardFooter>
    </Card>
  );
}
