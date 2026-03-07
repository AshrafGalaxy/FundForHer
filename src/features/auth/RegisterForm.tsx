
'use client';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, UserPlus } from 'lucide-react';
import { register } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { createInitialUserProfile } from '@/server/db/user-data';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth, useFirestore } from '@/firebase';

const formSchema = z.object({
  fullName: z.string().min(3, { message: 'Full name must be at least 3 characters.' }),
  phone: z.string().regex(/^\d{10}$/, { message: 'Must be a 10-digit number.' }),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  dob: z.string().optional(),
  qualification: z.string().min(2, { message: 'Please specify your qualification.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
}).refine(data => data.dob !== undefined && data.dob !== '', {
  message: "Your date of birth is required.",
  path: ["dob"],
});

type FormValues = z.infer<typeof formSchema>;

export function RegisterForm() {
  const auth = useAuth();
  const db = useFirestore();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      fullName: '',
      phone: '',
      email: '',
      dob: '',
      password: '',
      confirmPassword: '',
      qualification: '',
    },
  });

  async function onSubmit(values: FormValues) {
    if (!auth || !db) {
      toast({ variant: 'destructive', title: 'Error', description: 'Firebase not initialized.' });
      return;
    }

    // We refined the schema above so we know dob is defined here
    if (!values.dob) return;

    const userDob = new Date(values.dob);

    setIsLoading(true);
    try {
      await register(
        auth,
        db,
        values.email,
        values.password,
        values.fullName,
        values.phone,
        userDob,
        values.qualification
      );
      router.push('/authenticated/profile');
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

  async function handleGoogleSignUp() {
    if (!auth || !db) return;
    setIsGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      // We pass some default/dummy data for the fields Google doesn't provide
      // The user can edit these later in their profile.
      await createInitialUserProfile(db, result.user.uid, {
        fullName: result.user.displayName || 'New User',
        email: result.user.email || '',
        phone: result.user.phoneNumber || '',
        dob: new Date('2000-01-01'), // Dummy fallback
        qualification: 'Other',
      });

      router.push('/authenticated/profile');
    } catch (error: any) {
      let description = 'An unexpected error occurred during Google sign-up.';
      if (error instanceof FirebaseError) {
        if (error.code === 'auth/popup-closed-by-user') {
          description = 'Sign-up popup was closed before completion.';
        } else {
          description = error.message;
        }
      }
      toast({
        variant: 'destructive',
        title: 'Sign Up Failed',
        description,
      });
    } finally {
      setIsGoogleLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="font-headline text-2xl">Create a Student Account</CardTitle>
        <CardDescription>Join our community to find the best scholarships</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Google Sign-in */}
        <Button
          type="button"
          variant="outline"
          className="w-full bg-background font-semibold"
          onClick={handleGoogleSignUp}
          disabled={isGoogleLoading || isLoading || !auth}
        >
          {isGoogleLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
          )}
          Sign up with Google
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">Or register with email</span>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Priya Sharma" {...field} />
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
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="priya.sharma@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile Number</FormLabel>
                    <FormControl>
                      <Input placeholder="XXXXX XXXXX" maxLength={10} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dob"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of birth</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        className="w-full"
                        max={new Date().toISOString().split("T")[0]}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="qualification"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Highest Qualification</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your current qualification" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Class 10">Class 10</SelectItem>
                      <SelectItem value="Class 12">Class 12</SelectItem>
                      <SelectItem value="Diploma">Diploma</SelectItem>
                      <SelectItem value="Undergraduate">Undergraduate</SelectItem>
                      <SelectItem value="Postgraduate">Postgraduate</SelectItem>
                      <SelectItem value="PhD">PhD</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                  Create Account
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-center text-sm">
        <p>Already have an account? <Link href="/login" className="text-theme-900 dark:text-theme-300 hover:text-theme-950 dark:hover:text-theme-200 hover:underline">Log In</Link></p>
      </CardFooter>
    </Card>
  );
}
