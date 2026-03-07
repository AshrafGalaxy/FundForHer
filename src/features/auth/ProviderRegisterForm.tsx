
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
import { Loader2, UserPlus } from 'lucide-react';
import { registerProvider } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, useFirestore } from '@/firebase';

const formSchema = z.object({
  companyName: z.string().min(3, { message: 'Company name must be at least 3 characters.' }),
  companyPhone: z.string().regex(/^\d{10}$/, { message: 'Please enter a valid 10-digit phone number.' }),
  email: z.string().email({ message: 'Please enter a valid company email address.' }),
  registrationNumber: z.string().min(5, { message: 'Registration number is required.'}),
  gstNumber: z.string().length(15, { message: 'Please enter a valid 15-character GST number.'}),
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
      await registerProvider(auth, db, providerData, password);
      // On successful registration and login, redirect to the dashboard
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
    <Card>
       <CardHeader className="text-center">
        <CardTitle className="font-headline text-2xl">Create a Provider Account</CardTitle>
        <CardDescription>Join our platform to list and manage your scholarships</CardDescription>
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
                        <FormLabel>Company Name</FormLabel>
                        <FormControl>
                        <Input placeholder="Your Company Inc." {...field} />
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
                        <Input type="email" placeholder="contact@yourcompany.com" {...field} />
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
                        <FormLabel>Company Phone</FormLabel>
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
                        <FormLabel>Company Reg. Number</FormLabel>
                        <FormControl>
                        <Input placeholder="CIN or other" {...field} />
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
                        <FormLabel>GST Number</FormLabel>
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
            <Button type="submit" disabled={isLoading || !auth} className="w-full">
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
      <CardFooter className="flex justify-center text-sm">
          <p>Already have a provider account? <Link href="/provider/login" className="text-primary hover:underline">Log In</Link></p>
      </CardFooter>
    </Card>
  );
}
