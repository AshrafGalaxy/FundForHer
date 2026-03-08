'use client';

import { useState, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, ArrowLeft, ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useFirestore } from '@/firebase';
import { useAuth } from '@/app/auth-provider';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getProviderProfile } from '@/server/db/user-data';
import type { ProviderProfile } from '@/server/db/user-data';

const formSchema = z.object({
    title: z.string().min(10, { message: "Title must be at least 10 characters to be explicit." }),
    amount: z.coerce.number().min(5000, { message: "Minimum funding must be ₹5,000 for verified listings." }),
    deadline: z.string().min(1, { message: "A hard deadline is absolutely required." }),
    eligibilityCriteria: z.string().min(50, { message: "Eligibility must be exhaustive (min 50 chars) to prevent wasted applications." }),
    description: z.string().min(100, { message: "Provide a rich description of goals and rubrics (min 100 chars)." }),
});

type FormValues = z.infer<typeof formSchema>;

export default function CreateScholarshipPage() {
    const authContext = useAuth();
    const db = useFirestore();
    const router = useRouter();
    const { toast } = useToast();

    const [isLoading, setIsLoading] = useState(false);
    const [providerProfile, setProviderProfile] = useState<ProviderProfile | null>(null);

    const user = authContext?.user;

    useEffect(() => {
        if (user && db) {
            getProviderProfile(db, user.uid).then(profile => {
                if (profile && profile.kycStatus === 'verified') {
                    setProviderProfile(profile);
                } else {
                    toast({ title: 'Restricted', description: 'Your account must be verified to post scholarships.', variant: 'destructive' });
                    router.push('/provider/dashboard');
                }
            });
        }
    }, [user, db, router, toast]);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: '',
            amount: 0,
            deadline: '',
            eligibilityCriteria: '',
            description: '',
        },
    });

    const watchTitle = useWatch({ control: form.control, name: 'title' });
    const watchAmount = useWatch({ control: form.control, name: 'amount' });
    const watchCriteria = useWatch({ control: form.control, name: 'eligibilityCriteria' });
    const watchDesc = useWatch({ control: form.control, name: 'description' });
    const watchDeadline = useWatch({ control: form.control, name: 'deadline' });

    // Calculate Health Score
    let score = 0;
    if (watchTitle && watchTitle.length >= 10) score += 20;
    if (watchAmount && watchAmount >= 5000) score += 20;
    if (watchDeadline) score += 20;
    if (watchCriteria && watchCriteria.length >= 50) score += 20;
    if (watchDesc && watchDesc.length >= 100) score += 20;

    async function onSubmit(values: FormValues) {
        if (!db || !providerProfile) return;
        setIsLoading(true);
        try {
            await addDoc(collection(db, 'scholarships'), {
                ...values,
                providerId: providerProfile.uid,
                provider: providerProfile.companyName,
                matchScore: 0, // Base default, updated by AI later
                createdAt: serverTimestamp(),
                lastUpdated: serverTimestamp(),
                status: 'active'
            });
            toast({ title: 'Success', description: 'Scholarship listed uniquely and instantly live!' });
            router.push('/provider/dashboard');
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Listing Failed', description: error.message });
        } finally {
            setIsLoading(false);
        }
    }

    if (!providerProfile) return null; // Avoid flashing the form while loading

    return (
        <div className="container max-w-5xl mx-auto px-4 py-8">
            <Button asChild variant="ghost" className="mb-6 -ml-4">
                <Link href="/provider/dashboard"><ArrowLeft className="mr-2" /> Back to Dashboard</Link>
            </Button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Side: Form */}
                <div className="lg:col-span-2">
                    <Card className="shadow-lg border-primary/20">
                        <CardHeader>
                            <CardTitle className="font-headline text-3xl">Draft Premium Scholarship</CardTitle>
                            <CardDescription>
                                Our Strict-Publish engine ensures every scholarship has the data required by our AI matching algorithm.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                    <FormField
                                        control={form.control}
                                        name="title"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Scholarship Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="E.g. Women in Engineering Merit Grant 2026" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <FormField
                                            control={form.control}
                                            name="amount"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Funding Amount (INR)</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" placeholder="50000" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="deadline"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Hard Deadline</FormLabel>
                                                    <FormControl>
                                                        <Input type="date" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <FormField
                                        control={form.control}
                                        name="eligibilityCriteria"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Strict Eligibility Criteria</FormLabel>
                                                <FormControl>
                                                    <Textarea className="h-24" placeholder="Must be a female student currently enrolled in 3rd year BE/BTech (Computer Science or IT only)..." {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="description"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Deep Description & Rubric</FormLabel>
                                                <FormControl>
                                                    <Textarea className="h-32" placeholder="Explain the motivation behind this grant and what the essay/interview panel will be looking for..." {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <Button type="submit" className="w-full text-lg shadow-xl" disabled={isLoading || score < 100}>
                                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                                        {score < 100 ? 'Complete Health Metrics to Publish' : 'Publish Scholarship to Network'}
                                    </Button>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Side: Visual Health Meter */}
                <div className="lg:col-span-1 space-y-6">
                    <Card className="sticky top-24 border-secondary overflow-hidden shadow-2xl">
                        <div className="h-2 w-full bg-secondary">
                            <div className="h-full bg-green-500 transition-all duration-500 ease-out" style={{ width: `${score}%` }}></div>
                        </div>
                        <CardHeader className="text-center pb-2">
                            <CardTitle className="font-headline text-xl">Scholarship Health</CardTitle>
                            <CardDescription>AI Matching Quality</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center">
                            <div className="relative w-40 h-40 flex items-center justify-center mb-4">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="80" cy="80" r="70" className="stroke-secondary" strokeWidth="12" fill="none" />
                                    <circle cx="80" cy="80" r="70" className={`${score === 100 ? 'stroke-green-500' : 'stroke-primary'} transition-all duration-1000 ease-out`} strokeWidth="12" strokeDasharray={440} strokeDashoffset={440 - (440 * score) / 100} strokeLinecap="round" fill="none" />
                                </svg>
                                <div className="absolute flex flex-col items-center justify-center">
                                    <span className={`text-4xl font-bold font-headline ${score === 100 ? 'text-green-600' : 'text-primary'}`}>{score}%</span>
                                </div>
                            </div>
                            {score < 100 ? (
                                <div className="w-full bg-orange-100/50 border border-orange-200 p-4 rounded-xl flex items-start gap-3">
                                    <ShieldAlert className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                                    <p className="text-sm text-orange-800">Your post is currently too vague. Our AI engine cannot match students to low-data listings. Reach 100% to unlock publishing.</p>
                                </div>
                            ) : (
                                <div className="w-full bg-green-100 border border-green-200 p-4 rounded-xl text-center">
                                    <p className="text-sm font-semibold text-green-800">Flawless Listing Ready.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
