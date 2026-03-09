'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/app/auth-provider';
import { useFirestore } from '@/firebase';
import { useRouter } from 'next/navigation';
import { MatchCounter } from '@/components/onboarding/MatchCounter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { createInitialUserProfile } from '@/server/db/user-data';
import { useToast } from '@/hooks/use-toast';
import Logo from '@/components/ui/Logo';

type OnboardingData = {
    fullName: string;
    educationLevel: string;
    fieldOfStudy: string;
};

const EDUCATION_LEVELS = ['Class 10', 'Class 12', 'Diploma', 'Undergraduate', 'Postgraduate', 'PhD', 'Other'];
const STUDY_FIELDS = ['Computer Science & IT', 'Engineering', 'Medicine & Healthcare', 'Business & Finance', 'Arts & Humanities', 'Law', 'Sciences'];

export default function OnboardingFlow() {
    const authContext = useAuth();
    const db = useFirestore();
    const router = useRouter();
    const { toast } = useToast();

    const [step, setStep] = useState(1);
    const [isSaving, setIsSaving] = useState(false);
    const [data, setData] = useState<OnboardingData>({
        fullName: authContext?.user?.displayName || '',
        educationLevel: '',
        fieldOfStudy: '',
    });

    // We rely on the user being authenticated already (Google Auth or Email via dual-choice Register route)
    // If not authenticated, the router/middleware will catch them, but we can verify
    if (!authContext?.loading && !authContext?.user) {
        router.push('/login');
        return null;
    }

    const handleNext = () => setStep(prev => prev + 1);
    const handlePrev = () => setStep(prev => prev - 1);

    const handleComplete = async () => {
        if (!authContext?.user || !db) return;
        setIsSaving(true);
        try {
            // Upsert the profile data from this conversational flow
            await createInitialUserProfile(db, authContext.user.uid, {
                fullName: data.fullName || authContext.user.displayName || 'New User',
                email: authContext.user.email || '',
                phone: authContext.user.phoneNumber || '',
                dob: new Date('2000-01-01'), // Cannot ask everything here, keep it frictionless
                qualification: data.educationLevel,
                // fieldOfStudy could be added to DB schema later, for now we just use qualification
            });

            toast({
                title: "Profile Built Successfully!",
                description: `Welcome to Fund Her Future, ${data.fullName}!`,
            });
            router.push('/authenticated/dashboard');
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error saving profile', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    // Animation variants for Typeform effect
    const pageVariants = {
        initial: { opacity: 0, y: 50, scale: 0.98 },
        in: { opacity: 1, y: 0, scale: 1 },
        out: { opacity: 0, y: -50, scale: 0.98 }
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden">
            {/* Value Gamification Widget */}
            <MatchCounter
                step={step}
                educationLevel={step >= 2 ? data.educationLevel : null}
                fieldOfStudy={step >= 3 ? data.fieldOfStudy : null}
            />

            {/* Header / Logo */}
            <div className="p-8 pb-0 flex items-center gap-3 relative z-10">
                <Logo className="w-10 h-10 text-primary" />
                <span className="font-headline font-bold text-card-foreground truncate uppercase tracking-tight text-xl">
                    FUND HER FUTURE
                </span>
            </div>

            {/* Main Conversational Area */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative z-10">
                <AnimatePresence mode="wait">
                    {/* STEP 1: NAME */}
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            className="w-full max-w-4xl"
                            initial="initial" animate="in" exit="out" variants={pageVariants} transition={{ duration: 0.4 }}
                        >
                            <h1 className="text-4xl md:text-5xl font-headline font-bold mb-8 leading-tight">
                                Let's get to know you.<br />
                                <span className="text-muted-foreground text-3xl font-medium mt-2 block">What should we call you?</span>
                            </h1>
                            <div className="flex flex-col sm:flex-row gap-4 max-w-xl">
                                <Input
                                    autoFocus
                                    className="text-2xl h-16 px-6 bg-secondary/20 border-secondary focus-visible:ring-primary shadow-sm"
                                    placeholder="Your full name"
                                    value={data.fullName}
                                    onChange={(e) => setData({ ...data, fullName: e.target.value })}
                                    onKeyDown={(e) => e.key === 'Enter' && data.fullName && handleNext()}
                                />
                                <Button size="lg" className="h-16 px-8 text-lg" onClick={handleNext} disabled={!data.fullName}>
                                    O.K. <ArrowRight className="ml-2 w-5 h-5" />
                                </Button>
                            </div>
                            <p className="mt-4 text-muted-foreground text-sm flex items-center gap-2">Press <strong className="bg-secondary px-2 py-0.5 rounded text-xs">Enter ↵</strong></p>
                        </motion.div>
                    )}

                    {/* STEP 2: EDUCATION */}
                    {step === 2 && (
                        <motion.div
                            key="step2"
                            className="w-full max-w-4xl"
                            initial="initial" animate="in" exit="out" variants={pageVariants} transition={{ duration: 0.4 }}
                        >
                            <h1 className="text-4xl md:text-5xl font-headline font-bold mb-8 leading-tight">
                                Nice to meet you, <span className="text-primary">{data.fullName.split(' ')[0]}</span>.
                                <span className="text-muted-foreground text-3xl font-medium mt-3 block">Where are you currently in your education journey?</span>
                            </h1>
                            <div className="flex flex-wrap gap-4 max-w-3xl">
                                {EDUCATION_LEVELS.map(level => (
                                    <button
                                        key={level}
                                        onClick={() => {
                                            setData({ ...data, educationLevel: level });
                                            setTimeout(handleNext, 300); // Small delay to let them see the selection
                                        }}
                                        className={`px-6 py-4 rounded-xl text-lg font-medium transition-all duration-200 border-2 text-left hover:-translate-y-1 ${data.educationLevel === level ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20' : 'bg-card text-card-foreground border-border hover:border-primary/50'}`}
                                    >
                                        {level}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 3: FIELD OF STUDY */}
                    {step === 3 && (
                        <motion.div
                            key="step3"
                            className="w-full max-w-4xl"
                            initial="initial" animate="in" exit="out" variants={pageVariants} transition={{ duration: 0.4 }}
                        >
                            <h1 className="text-4xl md:text-5xl font-headline font-bold mb-8 leading-tight">
                                Almost there!
                                <span className="text-muted-foreground text-3xl font-medium mt-3 block">What specific field or degree are you pursuing?</span>
                            </h1>
                            <div className="flex flex-wrap gap-4 max-w-3xl mb-12">
                                {STUDY_FIELDS.map(field => (
                                    <button
                                        key={field}
                                        onClick={() => setData({ ...data, fieldOfStudy: field })}
                                        className={`px-6 py-3 rounded-full text-md font-medium transition-all duration-200 border-2 ${data.fieldOfStudy === field ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20' : 'bg-card text-card-foreground border-border hover:border-primary/50'}`}
                                    >
                                        {field}
                                    </button>
                                ))}
                            </div>

                            <div className="flex gap-4">
                                <Button
                                    size="lg"
                                    className="h-16 px-10 text-xl font-bold rounded-2xl bg-black hover:bg-gray-800 text-white dark:bg-white dark:text-black dark:hover:bg-gray-200 transition-all shadow-2xl hover:shadow-primary/20"
                                    onClick={handleComplete}
                                    disabled={!data.fieldOfStudy || isSaving}
                                >
                                    {isSaving ? <Loader2 className="mr-2 w-6 h-6 animate-spin" /> : <CheckCircle2 className="mr-2 w-6 h-6" />}
                                    Unlock My Matches
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Navigation Footer */}
            <div className="p-8 flex justify-between relative z-10 w-full max-w-4xl mx-auto">
                {step > 1 ? (
                    <Button variant="ghost" onClick={handlePrev} className="text-muted-foreground">
                        <ArrowLeft className="mr-2 w-4 h-4" /> Go Back
                    </Button>
                ) : <div />}

                {/* Progress Indicators */}
                <div className="flex gap-2 items-center">
                    {[1, 2, 3].map(i => (
                        <div key={i} className={`w-12 h-1.5 rounded-full transition-all duration-500 ${step >= i ? 'bg-primary' : 'bg-primary/20'}`} />
                    ))}
                </div>
            </div>

            {/* Decorative Background Blob for Onboarding */}
            <div className="absolute top-[40%] right-[-10%] w-[800px] h-[800px] bg-gradient-to-l from-primary/5 to-transparent rounded-full blur-3xl pointer-events-none -z-0" />
        </div>
    );
}
