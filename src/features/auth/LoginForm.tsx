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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, LogIn, Mail, Phone, KeyRound } from 'lucide-react';
import { login } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FirebaseError } from 'firebase/app';
import { useAuth as useFirebaseAuth } from '@/firebase';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  sendPasswordResetEmail,
  ConfirmationResult
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { useFirestore } from '@/firebase';
import { getUserProfile, getProviderProfile } from '@/server/db/user-data';

const emailFormSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

const phoneFormSchema = z.object({
  countryCode: z.string().min(1),
  phone: z.string().regex(/^\d{10}$/, { message: 'Phone number must be exactly 10 digits.' }),
});

const otpSchema = z.object({
  otp: z.string().length(6, { message: 'OTP must be 6 digits.' }),
});

type EmailFormValues = z.infer<typeof emailFormSchema>;

interface LoginFormProps {
  isProviderLogin: boolean;
}

export function LoginForm({ isProviderLogin }: LoginFormProps) {
  const auth = useFirebaseAuth();
  const db = useFirestore();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Phone Auth State
  const [showOTP, setShowOTP] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  const { toast } = useToast();
  const router = useRouter();

  const emailForm = useForm<EmailFormValues>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: { email: '', password: '' },
  });

  const phoneForm = useForm<{ countryCode: string, phone: string }>({
    resolver: zodResolver(phoneFormSchema),
    defaultValues: { countryCode: '+91', phone: '' },
  });

  const otpForm = useForm<{ otp: string }>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: '' },
  });

  // We only initialize reCAPTCHA when the user switches to the 'phone' tab
  const handleTabChange = (value: string) => {
    if (value === 'phone' && auth && typeof window !== 'undefined') {
      // Small timeout to allow the DOM to render the tab content
      setTimeout(() => {
        if (!(window as any).recaptchaVerifier) {
          const container = document.getElementById('recaptcha-container');
          if (container) {
            (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
              size: 'invisible',
            });
          }
        }
      }, 100);
    }
  };

  const redirectAfterLogin = () => {
    if (isProviderLogin) {
      router.replace('/provider/dashboard');
    } else {
      router.replace('/authenticated/dashboard');
    }
  };

  const handleFirebaseError = (error: any, defaultMsg: string) => {
    let description = defaultMsg;
    if (error instanceof FirebaseError) {
      switch (error.code) {
        case 'auth/invalid-credential':
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          description = 'Invalid credentials. Please check your details.';
          break;
        case 'auth/user-disabled':
          description = 'This account has been disabled.';
          break;
        case 'auth/invalid-email':
          description = 'Please enter a valid email address.';
          break;
        case 'auth/operation-not-allowed':
          description = 'This authentication method is not enabled in your Firebase Project Console.';
          break;
        case 'auth/popup-closed-by-user':
          description = 'Sign-in popup was closed before completion.';
          break;
        case 'auth/too-many-requests':
          description = 'Too many attempts. Please try again later.';
          break;
        case 'auth/invalid-phone-number':
          description = 'Invalid phone number format.';
          break;
        case 'auth/invalid-verification-code':
          description = 'Invalid OTP code.';
          break;
        default:
          description = error.message;
      }
    }
    toast({ variant: 'destructive', title: 'Authentication Failed', description });
  };

  async function onEmailSubmit(values: EmailFormValues) {
    if (!auth) return;
    setIsLoading(true);
    try {
      await login(auth, values.email, values.password);
      redirectAfterLogin();
    } catch (error: any) {
      handleFirebaseError(error, 'An unexpected error occurred during email login.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    if (!auth || !db) return;
    setIsGoogleLoading(true);
    try {
      let resultUser;

      if (Capacitor.isNativePlatform()) {
        const nativeResult = await FirebaseAuthentication.signInWithGoogle();

        if (nativeResult.credential?.idToken) {
          const credential = GoogleAuthProvider.credential(nativeResult.credential.idToken);
          const result = await signInWithCredential(auth, credential);
          resultUser = result.user;
        } else {
          throw new Error("No ID Token received from Native Google Auth");
        }
      } else {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        resultUser = result.user;
      }

      // Check if profile exists
      if (isProviderLogin) {
        const profile = await getProviderProfile(db, resultUser.uid);
        if (!profile) {
          // Providers without a profile must register properly first.
          await resultUser.delete();
          toast({ variant: 'destructive', title: 'Provider Account Not Found', description: 'Please register your company first.' });
          return;
        }
      } else {
        const profile = await getUserProfile(db, resultUser.uid);
        if (!profile) {
          // A student logged in with Google but hasn't completed onboarding. Route them!
          router.push('/onboarding');
          return;
        }
      }

      redirectAfterLogin();
    } catch (error: any) {
      handleFirebaseError(error, 'An unexpected error occurred during Google sign-in.');
    } finally {
      setIsGoogleLoading(false);
    }
  }

  async function onPhoneSubmit(values: { countryCode: string, phone: string }) {
    if (!auth || !(window as any).recaptchaVerifier) return;
    setIsLoading(true);
    try {
      const phoneNumber = `${values.countryCode}${values.phone}`;

      const result = await signInWithPhoneNumber(auth, phoneNumber, (window as any).recaptchaVerifier);
      setConfirmationResult(result);
      setShowOTP(true);
      toast({ title: "OTP Sent", description: "Please check your phone for the 6-digit code." });
    } catch (error: any) {
      handleFirebaseError(error, 'Failed to send OTP. Please check the number and try again.');
      if ((window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier.render().then((widgetId: any) => {
          (window as any).grecaptcha.reset(widgetId);
        });
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function onOTPSubmit(values: { otp: string }) {
    if (!confirmationResult) return;
    setIsLoading(true);
    try {
      await confirmationResult.confirm(values.otp);
      redirectAfterLogin();
    } catch (error: any) {
      handleFirebaseError(error, 'Failed to verify OTP.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!auth) return;
    const email = emailForm.getValues('email');
    if (!email) {
      emailForm.setError('email', { type: 'manual', message: 'Please enter your email address first.' });
      return;
    }
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast({ title: 'Recovery Email Sent', description: 'Check your inbox for password reset instructions.' });
    } catch (error: any) {
      handleFirebaseError(error, 'Failed to send password reset email.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center space-y-2">
        <CardTitle className="font-headline text-2xl">{isProviderLogin ? 'Company Login' : 'Student Login'}</CardTitle>
        <CardDescription>Sign in to access your dashboard</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Google Sign-in */}
        <Button
          type="button"
          variant="outline"
          className="w-full bg-background font-semibold"
          onClick={handleGoogleSignIn}
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
          Sign in with Google
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
          </div>
        </div>

        <Tabs defaultValue="email" className="w-full" onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="email"><Mail className="w-4 h-4 mr-2" /> Email</TabsTrigger>
            <TabsTrigger value="phone"><Phone className="w-4 h-4 mr-2" /> Phone</TabsTrigger>
          </TabsList>

          <TabsContent value="email">
            <Form {...emailForm}>
              <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
                <FormField
                  control={emailForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder={isProviderLogin ? 'contact@company.com' : 'priya.sharma@example.com'} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={emailForm.control}
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

                <div className="flex justify-end mt-1 mb-2">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-sm font-medium text-theme-900 dark:text-theme-300 hover:text-theme-950 dark:hover:text-theme-200 hover:underline"
                    disabled={isLoading}
                  >
                    Forgot password?
                  </button>
                </div>

                <Button type="submit" disabled={isLoading || !auth} className="w-full">
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                  Sign In with Email
                </Button>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="phone">
            <div id="recaptcha-container"></div>

            {!showOTP ? (
              <Form {...phoneForm}>
                <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="space-y-4">
                  <div className="flex gap-2 items-end">
                    <FormField
                      control={phoneForm.control}
                      name="countryCode"
                      render={({ field }) => (
                        <FormItem className="w-[110px]">
                          <FormLabel className="text-muted-foreground text-xs">Code</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Code" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="+91">+91 (IN)</SelectItem>
                              <SelectItem value="+1">+1 (US)</SelectItem>
                              <SelectItem value="+44">+44 (UK)</SelectItem>
                              <SelectItem value="+61">+61 (AU)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={phoneForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input
                              type="tel"
                              placeholder="9876543210"
                              maxLength={10}
                              {...field}
                              onChange={(e) => {
                                const numericValue = e.target.value.replace(/\D/g, '');
                                field.onChange(numericValue);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button type="submit" disabled={isLoading || !auth} className="w-full">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                    Send OTP
                  </Button>
                </form>
              </Form>
            ) : (
              <Form {...otpForm}>
                <form onSubmit={otpForm.handleSubmit(onOTPSubmit)} className="space-y-4">
                  <FormField
                    control={otpForm.control}
                    name="otp"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>6-Digit OTP</FormLabel>
                        <FormControl>
                          <Input placeholder="123456" maxLength={6} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={isLoading || !auth} className="w-full">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                    Verify & Sign In
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-sm mt-2"
                    onClick={() => setShowOTP(false)}
                    disabled={isLoading}
                  >
                    Change Phone Number
                  </Button>
                </form>
              </Form>
            )}
          </TabsContent>
        </Tabs>

      </CardContent>
      <CardFooter className="flex flex-col gap-4 justify-center text-sm border-t pt-6 text-muted-foreground">
        {!isProviderLogin ? (
          <>
            <p>Don't have an account? <Link href="/register" className="font-semibold text-theme-900 dark:text-theme-300 hover:text-theme-950 dark:hover:text-theme-200 hover:underline">Sign Up</Link></p>
            <p>Are you a scholarship provider? <Link href="/provider/login" className="font-semibold text-theme-900 dark:text-theme-300 hover:text-theme-950 dark:hover:text-theme-200 hover:underline">Login here</Link></p>
          </>
        ) : (
          <p>Don't have a provider account? <Link href="/provider/register" className="font-semibold text-theme-900 dark:text-theme-300 hover:text-theme-950 dark:hover:text-theme-200 hover:underline">Register your Company</Link></p>
        )}
      </CardFooter>
    </Card>
  );
}
