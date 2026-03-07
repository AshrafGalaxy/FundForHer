
// src/app/page.tsx
'use client';

import { Button } from '@/components/ui/button';
import InstallAppWidget from '@/components/pwa/InstallAppWidget';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { getProviderProfile } from '@/server/db/user-data';
import type { Scholarship } from '@/lib/types';
import { ArrowRight, BookCheck, Goal, HeartHandshake, Lightbulb, Target, Smartphone, Laptop, Tablet } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import placeholderImages from '@/lib/placeholder-images.json';
import { useAuth } from './auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2, Sparkles, Calendar } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useFirestore } from '@/firebase';
import { collection, getDocs, doc, getDoc, query, orderBy, limit, where, Timestamp } from 'firebase/firestore';

const AboutSection = () => {
    const { aboutSection } = placeholderImages.landingPage;
    return (
        <section className="py-16 md:py-24 bg-secondary/50">
            <div className="container mx-auto px-4">
                <div className="grid md:grid-cols-2 gap-12 items-center">
                    <div>
                        <Image
                            src={aboutSection.src}
                            alt={aboutSection.alt}
                            width={aboutSection.width}
                            height={aboutSection.height}
                            className="rounded-lg shadow-xl"
                            data-ai-hint={aboutSection.hint}
                        />
                    </div>
                    <div className="text-center md:text-left">
                        <h2 className="text-3xl md:text-4xl font-headline font-bold text-foreground mb-4">About FUND HER FUTURE</h2>
                        <p className="text-lg text-muted-foreground mb-6">
                            FUND HER FUTURE was born from a simple yet powerful idea: every girl deserves the chance to pursue her dreams, unhindered by financial barriers. We are a dedicated team of educators, technologists, and philanthropists committed to connecting young women in India with the scholarships and resources they need to succeed.
                        </p>
                        <p className="text-lg text-muted-foreground">
                            We partner with leading organizations and institutions to create a comprehensive, accessible, and supportive ecosystem for female students nationwide.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
};

const ProblemSection = () => {
    const { problemSection } = placeholderImages.landingPage;
    return (
        <section className="py-16 md:py-24">
            <div className="container mx-auto px-4">
                <div className="grid md:grid-cols-2 gap-12 items-center">
                    <div className="text-center md:text-left">
                        <div className="md:max-w-md">
                            <Lightbulb className="h-12 w-12 text-primary mx-auto md:mx-0 mb-4" />
                            <h2 className="text-3xl md:text-4xl font-headline font-bold text-foreground mb-4">The Challenge</h2>
                            <p className="text-lg text-muted-foreground">
                                In India, countless brilliant and ambitious young women are forced to abandon their educational aspirations due to financial constraints and a lack of access to the right opportunities. This not only limits their individual potential but also holds back our entire nation.
                            </p>
                        </div>
                    </div>
                    <div>
                        <Image
                            src={problemSection.src}
                            alt={problemSection.alt}
                            width={problemSection.width}
                            height={problemSection.height}
                            className="rounded-lg shadow-xl"
                            data-ai-hint={problemSection.hint}
                        />
                    </div>
                </div>
            </div>
        </section>
    )
}

const MissionSection = () => {
    const { missionSection } = placeholderImages.landingPage;
    return (
        <section className="py-16 md:py-24 bg-primary/10">
            <div className="container mx-auto px-4">
                <div className="grid md:grid-cols-2 gap-12 items-center">
                    <div>
                        <Image
                            src={missionSection.src}
                            alt={missionSection.alt}
                            width={missionSection.width}
                            height={missionSection.height}
                            className="rounded-lg shadow-xl"
                            data-ai-hint={missionSection.hint}
                        />
                    </div>
                    <div className="text-center md:text-left">
                        <div className="md:max-w-md">
                            <Goal className="h-12 w-12 text-primary mx-auto md:mx-0 mb-4" />
                            <h2 className="text-3xl md:text-4xl font-headline font-bold text-foreground mb-4">Our Mission</h2>
                            <p className="text-lg text-muted-foreground">
                                Our mission is to create a centralized, user-friendly platform that bridges the gap between deserving female students and the scholarships that can change their lives. We aim to democratize access to education and empower the next generation of female leaders in India.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}


const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
    <Card className="text-center h-full hover:shadow-lg transition-shadow">
        <CardHeader>
            <div className="mx-auto bg-primary/20 text-primary p-3 rounded-full w-fit">
                {icon}
            </div>
            <CardTitle className="font-headline pt-2">{title}</CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">{description}</p>
        </CardContent>
    </Card>
);

export default function LandingPage() {
    const authContext = useAuth();
    const db = useFirestore();
    const router = useRouter();

    const [stats, setStats] = useState({ totalScholarships: 0, totalAmount: 0, fetching: true });
    const [latestScholarships, setLatestScholarships] = useState<Scholarship[]>([]);
    const [fetchingLatest, setFetchingLatest] = useState(true);
    const [marketing, setMarketing] = useState<any>(null);

    const loading = authContext ? authContext.loading : true;
    const user = authContext ? authContext.user : null;

    useEffect(() => {
        if (!loading && user && db) {
            // This logic is now on the landing page to handle redirection.
            const checkAndRedirect = async () => {
                try {
                    const provider = await getProviderProfile(db, user.uid);
                    if (provider) {
                        router.replace('/provider/dashboard');
                    } else {
                        router.replace('/authenticated/dashboard');
                    }
                } catch (e) {
                    console.error("Redirect failed:", e);
                    // Fallback to default dashboard if profile check fails
                    router.replace('/authenticated/dashboard');
                }
            };
            checkAndRedirect();
        }

        if (db) {
            getDocs(collection(db, 'scholarships'))
                .then(snapshot => {
                    const data = snapshot.docs.map(doc => doc.data() as Scholarship);
                    const amount = data.reduce((sum: number, s: Scholarship) => sum + (s.amount || 0), 0);
                    setStats({ totalScholarships: data.length, totalAmount: amount, fetching: false });
                })
                .catch(e => {
                    console.error("Client SDK Fetch failed:", e);
                    setStats({ totalScholarships: 0, totalAmount: 0, fetching: false });
                });

            // Fetch scholarships added in the last 5 days only
            const fiveDaysAgo = new Date();
            fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
            const recentQuery = query(
                collection(db, 'scholarships'),
                where('lastUpdated', '>=', Timestamp.fromDate(fiveDaysAgo)),
                orderBy('lastUpdated', 'desc'),
                limit(3)
            );
            getDocs(recentQuery)
                .then(snap => {
                    const mapped = snap.docs.map(d => {
                        const data = d.data();
                        // Safely convert Firestore Timestamps → JS Dates
                        const toDate = (val: any): Date | null => {
                            if (!val) return null;
                            if (val instanceof Date) return val;
                            if (val?.toDate) return val.toDate();
                            return new Date(val);
                        };
                        return {
                            id: d.id,
                            ...data,
                            deadline: toDate(data.deadline),
                            lastUpdated: toDate(data.lastUpdated),
                        } as Scholarship;
                    });
                    setLatestScholarships(mapped);
                    setFetchingLatest(false);
                })
                .catch((e) => {
                    console.error("Failed to fetch recent scholarships:", e);
                    setFetchingLatest(false);
                });

            getDoc(doc(db, 'content', 'marketing'))
                .then(snapshot => {
                    if (snapshot.exists()) {
                        setMarketing(snapshot.data());
                    }
                })
                .catch(console.error);
        }

    }, [loading, user, db, router]);

    // While checking auth state or fetching initial stats, we can just render the page normally 
    // to allow the navbar layout to display. We will handle the stats loading state inline.
    if (loading || user) {
        return (
            <div className="flex justify-center items-center h-screen bg-background">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-16 w-16 animate-spin text-primary" />
                    <p className="text-muted-foreground">Redirecting...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-background text-foreground">
            {/* Hero Section */}
            <section className="relative text-center py-24 md:py-44 overflow-hidden flex flex-col justify-center min-h-[75vh]">
                {/* Background Image Overlay */}
                <div className="absolute inset-0 z-0 pointer-events-none">
                    <img
                        src="/fresh-graduate-with-diploma.jpg"
                        alt="Female graduate holding diploma"
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-tr from-indigo-950/90 via-background/80 to-transparent mix-blend-multiply" />
                    <div className="absolute inset-0 bg-black/40" />
                </div>

                <div className="container mx-auto px-4 relative z-10">
                    <h1 className="text-5xl md:text-7xl font-headline font-extrabold mb-6 text-white drop-shadow-2xl tracking-tight leading-tight" dangerouslySetInnerHTML={{ __html: marketing?.heroTitle || 'Unlock Your Potential.<br class="hidden md:block" /> Fund Your Dreams.' }} />
                    <p className="text-xl md:text-2xl text-slate-200 max-w-3xl mx-auto mb-10 drop-shadow-md font-medium px-4">
                        {marketing?.heroSubtitle || "The ultimate scholarship platform for women in India. Your journey to higher education and a brighter future starts right here."}
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-6">
                        <Button asChild size="lg" className="h-14 px-8 text-lg font-semibold shadow-xl shadow-primary/20 transition-all hover:scale-105">
                            <Link href="/register">
                                Get Started <ArrowRight className="ml-2 h-5 w-5" />
                            </Link>
                        </Button>
                        <Button asChild size="lg" variant="outline" className="h-14 px-8 text-lg font-semibold bg-white/10 hover:bg-white/20 text-white border-white/30 backdrop-blur-sm transition-all hover:scale-105">
                            <Link href="/login">Login</Link>
                        </Button>
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="py-12 bg-background">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-center max-w-4xl mx-auto">
                        <div className="bg-card p-6 rounded-lg shadow-sm">
                            {stats.fetching ? (
                                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                            ) : (
                                <p className="text-4xl font-bold text-theme-900 dark:text-theme-300">{stats.totalScholarships}+</p>
                            )}
                            <p className="text-muted-foreground font-semibold">Scholarships Listed</p>
                        </div>
                        <div className="bg-card p-6 rounded-lg shadow-sm">
                            {stats.fetching ? (
                                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                            ) : (
                                <p className="text-4xl font-bold text-theme-900 dark:text-theme-300">
                                    <span style={{ fontFamily: 'sans-serif' }}>₹</span>{new Intl.NumberFormat('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(stats.totalAmount)}
                                </p>
                            )}
                            <p className="text-muted-foreground font-semibold">In Total Funding Available</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Newly Added Scholarships Section */}
            {(fetchingLatest || latestScholarships.length > 0) && (
                <section className="py-16 bg-secondary/30 border-y">
                    <div className="container mx-auto px-4">
                        <div className="flex flex-col md:flex-row justify-between items-end mb-10">
                            <div>
                                <h2 className="text-3xl md:text-4xl font-headline font-bold text-foreground mb-4">Newly Added Scholarships</h2>
                            </div>
                            <Button asChild variant="outline" className="mt-6 md:mt-0 hidden sm:flex">
                                <Link href="/login">View All Scholarships &rarr;</Link>
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {fetchingLatest ? (
                                // Skeleton loader — 3 animated placeholder cards while data loads
                                Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="flex flex-col bg-background border rounded-xl overflow-hidden shadow-sm">
                                        <div className="p-6 space-y-4">
                                            <div className="flex justify-between items-center">
                                                <Skeleton className="h-6 w-12 rounded" />
                                                <Skeleton className="h-6 w-20 rounded" />
                                            </div>
                                            <Skeleton className="h-5 w-3/4 rounded" />
                                            <Skeleton className="h-4 w-1/2 rounded" />
                                            <div className="space-y-2 pt-1">
                                                <Skeleton className="h-3 w-full rounded" />
                                                <Skeleton className="h-3 w-5/6 rounded" />
                                                <Skeleton className="h-3 w-4/6 rounded" />
                                            </div>
                                        </div>
                                        <div className="border-t bg-muted/20 px-6 py-3 flex justify-between items-center">
                                            <Skeleton className="h-4 w-28 rounded" />
                                            <Skeleton className="h-7 w-20 rounded" />
                                        </div>
                                    </div>
                                ))
                            ) : (
                                // Real scholarship cards after data loads
                                latestScholarships.map(scholarship => (
                                    <Card key={scholarship.id} className="flex flex-col hover:shadow-lg hover:-translate-y-1 transition-all duration-200 bg-background border-primary/10">
                                        <CardHeader>
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="flex items-center gap-1 bg-primary/10 text-primary text-xs font-semibold px-2 py-1 rounded w-fit">
                                                    <Sparkles className="h-3 w-3" /> New
                                                </span>
                                                {scholarship.amount && (
                                                    <span className="text-sm font-bold text-green-600 bg-green-50 px-2 py-1 rounded">
                                                        <span style={{ fontFamily: 'sans-serif' }}>₹</span>{scholarship.amount.toLocaleString('en-IN')}
                                                    </span>
                                                )}
                                            </div>
                                            <CardTitle className="font-headline text-lg line-clamp-2">{scholarship.title}</CardTitle>
                                            <CardDescription className="line-clamp-1">{scholarship.provider}</CardDescription>
                                        </CardHeader>
                                        <CardContent className="flex-grow">
                                            <p className="text-sm text-muted-foreground line-clamp-3">
                                                {scholarship.description}
                                            </p>
                                        </CardContent>
                                        <CardFooter className="justify-between items-center text-xs text-muted-foreground border-t bg-muted/20 p-4">
                                            <span className="flex items-center gap-1.5">
                                                <Calendar className="h-4 w-4" />
                                                {scholarship.deadline
                                                    ? (scholarship.deadline instanceof Date ? scholarship.deadline : new Date(scholarship.deadline)).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                                                    : 'Deadline Varies'}
                                            </span>
                                            <Button asChild size="sm" variant="ghost" className="h-8 hover:text-theme-900 dark:hover:text-theme-300">
                                                <Link href="/register">View Details</Link>
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                ))
                            )}
                        </div>

                        <div className="flex justify-center mt-10">
                            <Button asChild size="lg" className="px-10">
                                <Link href="/register">Explore All Scholarships →</Link>
                            </Button>
                        </div>
                    </div>
                </section>
            )}

            {/* Problem Section */}
            <ProblemSection />

            {/* Our Mission Section */}
            <MissionSection />


            {/* Features Section */}
            <section className="py-16 md:py-24">
                <div className="container mx-auto px-4">
                    <h2 className="text-3xl md:text-4xl font-headline font-bold text-center mb-12">
                        Why Choose Us?
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <FeatureCard
                            icon={<Target className="h-8 w-8" />}
                            title="Centralized Hub"
                            description="Find hundreds of scholarships from various providers all in one place, saving you time and effort."
                        />
                        <FeatureCard
                            icon={<BookCheck className="h-8 w-8" />}
                            title="Easy Application"
                            description="Our standardized application process makes it simple to apply for multiple scholarships without redundant paperwork."
                        />
                        <FeatureCard
                            icon={<HeartHandshake className="h-8 w-8" />}
                            title="Exclusively for Girls"
                            description="A dedicated platform focusing solely on opportunities for female students across India."
                        />
                    </div>
                </div>
            </section>

            {/* About Us Section */}
            <AboutSection />

            {/* App Download / PWA Section */}
            <section className="py-20 md:py-28 bg-gradient-to-br from-theme-50 to-background border-y border-theme-100 dark:from-theme-950/40 dark:to-background dark:border-theme-900/50 relative overflow-hidden">
                {/* Decorative background circles */}
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-72 h-72 rounded-full bg-theme-200/20 dark:bg-theme-800/20 blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-primary/10 dark:bg-primary/5 blur-3xl pointer-events-none" />

                <div className="container mx-auto px-4 relative z-10">
                    <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12 bg-card dark:bg-card/50 backdrop-blur-sm p-8 md:p-12 rounded-3xl shadow-xl shadow-theme-200/20 dark:shadow-none border border-theme-100 dark:border-theme-800/50">

                        <div className="flex-1 text-center md:text-left space-y-6">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-theme-100 dark:bg-theme-900 text-theme-800 dark:text-theme-200 text-sm font-semibold mb-2">
                                <Smartphone className="w-4 h-4" /> Install from Browser
                            </div>
                            <h2 className="text-3xl md:text-5xl font-headline font-bold text-theme-950 dark:text-theme-50">
                                Take Fund Her Future <span className="text-theme-600 dark:text-theme-400">Anywhere.</span>
                            </h2>
                            <p className="text-lg text-theme-950 dark:text-theme-200 max-w-lg mx-auto md:mx-0 font-medium">
                                Install our fast, lightweight web app directly to your device. No app store required. Works perfectly across all your favorite platforms.
                            </p>

                            <div className="flex items-center justify-center md:justify-start gap-6 pt-4 text-theme-700 dark:text-theme-300">
                                <div className="flex flex-col items-center gap-2">
                                    <Smartphone className="w-8 h-8 text-theme-500" />
                                    <span className="text-xs font-semibold">Android</span>
                                </div>
                                <div className="flex flex-col items-center gap-2">
                                    <Tablet className="w-8 h-8 text-theme-500" />
                                    <span className="text-xs font-semibold">iOS / iPadOS</span>
                                </div>
                                <div className="flex flex-col items-center gap-2">
                                    <Laptop className="w-8 h-8 text-theme-500" />
                                    <span className="text-xs font-semibold">Windows & Mac</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex-shrink-0 w-full md:w-auto flex flex-col items-center p-8 bg-theme-50 dark:bg-theme-900 rounded-2xl border border-theme-200 dark:border-theme-800 shadow-sm">
                            <h3 className="text-xl font-headline font-bold mb-2 text-theme-950 dark:text-theme-50">Get the App Now</h3>
                            <p className="text-sm text-center text-theme-950 dark:text-theme-200 mb-6 max-w-[200px] font-medium">
                                One tap to add it to your home screen or desktop.
                            </p>
                            <InstallAppWidget />
                        </div>
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="text-center py-20 md:py-32">
                <div className="container mx-auto px-4">
                    <h2 className="text-3xl md:text-4xl font-headline font-bold mb-4">
                        Ready to Fund Your Future?
                    </h2>
                    <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
                        Create your free account today and start applying for scholarships in minutes. The opportunity of a lifetime could be just a click away.
                    </p>
                    <Button asChild size="lg">
                        <Link href="/register">
                            Sign Up for Free <ArrowRight className="ml-2" />
                        </Link>
                    </Button>
                </div>
            </section>

        </div>
    );
}
