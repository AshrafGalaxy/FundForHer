
// src/app/page.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { getProviderProfile } from '@/server/db/user-data';
import type { Scholarship } from '@/lib/types';
import { ArrowRight, BookCheck, Goal, HeartHandshake, Lightbulb, Target, Smartphone, Laptop, Tablet, CheckCircle2, Download } from 'lucide-react';
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
import { FeaturedScholarshipCarousel } from '@/components/FeaturedScholarshipCarousel';
import { InfiniteMarquee } from '@/components/InfiniteMarquee';
import { MagneticWrapper } from '@/components/MagneticWrapper';

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
    const [isPwaInstalled, setIsPwaInstalled] = useState(false);

    useEffect(() => {
        // Check if the app is already installed and running in standalone mode
        if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
            setIsPwaInstalled(true);
        }

        const handleAppInstalled = () => {
            setIsPwaInstalled(true);
        };
        window.addEventListener('appinstalled', handleAppInstalled);

        // Also check if they launched the standalone app and navigating back to home
        return () => {
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

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
                <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                    <img
                        src="/fresh-graduate-with-diploma.jpg"
                        alt="Female graduate holding diploma"
                        className="w-full h-full object-cover"
                    />

                    <div className="absolute inset-0 bg-gradient-to-tr from-indigo-950/90 via-white/80 to-transparent mix-blend-multiply" />
                    <div className="absolute inset-0 bg-black/40" />
                </div>

                <div className="container mx-auto px-4 relative z-10">
                    <h1 className="text-5xl md:text-7xl font-headline font-extrabold mb-6 text-white drop-shadow-2xl tracking-tight leading-tight" dangerouslySetInnerHTML={{ __html: marketing?.heroTitle || 'Unlock Your Potential.<br class="hidden md:block" /> Fund Your Dreams.' }} />
                    <p className="text-xl md:text-2xl text-slate-200 max-w-3xl mx-auto mb-10 drop-shadow-md font-medium px-4">
                        {marketing?.heroSubtitle || "The ultimate scholarship platform for women in India. Your journey to higher education and a brighter future starts right here."}
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-6 items-center">
                        <MagneticWrapper strength={25}>
                            <Button asChild size="lg" className="h-14 px-8 text-lg font-semibold shadow-xl shadow-primary/30 transition-colors group">
                                <Link href="/register">
                                    Get Started <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </Button>
                        </MagneticWrapper>
                        <MagneticWrapper strength={25}>
                            <Button asChild size="lg" variant="outline" className="h-14 px-8 text-lg font-semibold bg-white/10 hover:bg-white/20 text-white border-white/30 backdrop-blur-sm transition-colors">
                                <Link href="/login">Login</Link>
                            </Button>
                        </MagneticWrapper>
                    </div>
                </div>
            </section>

            {/* Featured Scholarships Carousel */}
            {!fetchingLatest && latestScholarships.length > 0 && (
                <FeaturedScholarshipCarousel scholarships={latestScholarships} />
            )}

            {/* Trust-Building Infinite Partner Marquee */}
            <InfiniteMarquee />

            {/* Stats Section */}
            <section className="py-12 bg-background relative z-10">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-center max-w-4xl mx-auto">
                        <div className="bg-card border p-8 rounded-2xl shadow-sm text-center hover:shadow-md transition-shadow">
                            {stats.fetching ? (
                                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                            ) : (
                                <p className="text-4xl font-bold text-foreground">{stats.totalScholarships}+</p>
                            )}
                            <p className="text-muted-foreground font-semibold mt-1">Scholarships Listed</p>
                        </div>
                        <div className="bg-card border p-8 rounded-2xl shadow-sm text-center hover:shadow-md transition-shadow">
                            {stats.fetching ? (
                                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                            ) : (
                                <p className="text-4xl font-bold text-foreground">
                                    <span style={{ fontFamily: 'sans-serif' }}>₹</span>{new Intl.NumberFormat('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(stats.totalAmount)}
                                </p>
                            )}
                            <p className="text-muted-foreground font-semibold mt-1">In Total Funding Available</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Problem Section */}
            <ProblemSection />

            {/* Our Mission Section */}
            <MissionSection />


            {/* Premium Bento Box Features Section */}
            <section className="py-24 bg-background">
                <div className="container mx-auto px-4 max-w-6xl">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-headline font-extrabold mb-4 tracking-tight text-foreground">
                            Everything you need, <br className="hidden md:block" />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-theme-700 to-theme-500 dark:from-theme-400 dark:to-theme-200">
                                beautifully simple.
                            </span>
                        </h2>
                        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                            We've completely reimagined the scholarship experience to be fast, secure, and exclusively tailored for you.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 auto-rows-[260px] md:auto-rows-[300px]">

                        {/* Tile 1 — The Central Hub */}
                        <div className="md:col-span-2 relative group rounded-[2rem] p-8 md:p-10 overflow-hidden
                            bg-white/90 border border-[#FBA69B]/30 backdrop-blur-xl
                            shadow-lg shadow-pink-900/5 hover:shadow-2xl hover:shadow-[#FBA69B]/10 transition-all duration-700 hover:-translate-y-1"
                        >
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-80 pointer-events-none" />
                            <div className="absolute inset-0 bg-gradient-to-br from-[#FBA69B]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                            <div className="h-full flex flex-col justify-end relative z-10 transition-transform duration-700">
                                <Target className="w-12 h-12 text-pink-500 mb-5 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-700" />
                                <h3 className="text-2xl md:text-3xl font-headline font-bold mb-2 text-[#301A18]">The Central Hub</h3>
                                <p className="text-[#301A18]/70 text-base font-medium max-w-md">
                                    Discover hundreds of verified scholarships in one unified, clutter-free space. Stop hunting across the web.
                                </p>
                            </div>
                        </div>

                        {/* Tile 2 — Girls First */}
                        <div className="relative group rounded-[2rem] p-8 overflow-hidden
                            bg-[#FBA69B]/5 border border-[#FBA69B]/30 backdrop-blur-xl
                            shadow-lg shadow-pink-900/5 hover:shadow-xl hover:shadow-[#FBA69B]/10 transition-all duration-700 hover:-translate-y-1
                            flex flex-col justify-between"
                        >
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-80 pointer-events-none" />
                            <div className="absolute inset-0 bg-gradient-to-tr from-[#FBA69B]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                            <HeartHandshake className="w-10 h-10 text-pink-500 group-hover:-rotate-12 group-hover:scale-110 transition-transform duration-700 relative z-10" />
                            <div className="relative z-10">
                                <h3 className="text-2xl font-headline font-bold mb-2 text-[#301A18]">Girls First</h3>
                                <p className="text-[#301A18]/70 font-medium text-sm">
                                    100% focused on opportunities exclusively for female students across India.
                                </p>
                            </div>
                        </div>

                        {/* Tile 3 — Universal Apply */}
                        <div className="relative group rounded-[2rem] p-8 overflow-hidden
                            bg-white/90 border border-[#FBA69B]/30 backdrop-blur-xl
                            shadow-lg shadow-pink-900/5 hover:shadow-xl hover:shadow-[#FBA69B]/10 transition-all duration-700 hover:-translate-y-1
                            flex flex-col justify-between"
                        >
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-80 pointer-events-none" />
                            <div className="absolute inset-0 bg-gradient-to-tr from-[#FBA69B]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                            <BookCheck className="w-10 h-10 text-pink-500 group-hover:-translate-y-2 group-hover:scale-110 transition-transform duration-700 relative z-10" />
                            <div className="relative z-10">
                                <h3 className="text-2xl font-headline font-bold mb-2 text-[#301A18]">Universal Apply</h3>
                                <p className="text-[#301A18]/70 font-medium text-sm">
                                    One profile. One unified format. Zero repetitive paperwork.
                                </p>
                            </div>
                        </div>

                        {/* Tile 4 — AI-Powered Matches */}
                        <div className="md:col-span-2 relative group rounded-[2rem] p-8 md:p-10 overflow-hidden
                            bg-white/90 border border-[#FBA69B]/30 backdrop-blur-xl
                            shadow-lg shadow-pink-900/5 hover:shadow-2xl hover:shadow-[#FBA69B]/10 transition-all duration-700 hover:-translate-y-1"
                        >
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-80 pointer-events-none" />
                            <div className="absolute inset-0 bg-gradient-to-br from-[#FBA69B]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                            {/* Decorative glowing orb */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#FBA69B]/20 blur-[60px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

                            <div className="h-full flex flex-col justify-end relative z-10 transition-transform duration-700">
                                <Sparkles className="w-12 h-12 text-pink-500 mb-5 group-hover:animate-pulse" />
                                <h3 className="text-2xl md:text-3xl font-headline font-bold mb-2 text-[#301A18]">AI-Powered Matches</h3>
                                <p className="text-[#301A18]/70 text-base font-medium max-w-md">
                                    Our intelligent engine instantly analyzes your profile and highlights the exact scholarships you're most likely to win.
                                </p>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* About Us Section */}
            <AboutSection />

            {/* App Download / PWA Section (Premium Dark Banner) */}
            <section className="py-20 md:py-28 bg-[#301A18] relative overflow-hidden border-y border-[#47221E]">
                {/* Decorative background glows */}
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-[#FBA69B]/20 blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 rounded-full bg-[#FBA69B]/10 blur-3xl pointer-events-none" />

                <div className="container mx-auto px-4 relative z-10">
                    <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12 p-4 md:p-8">

                        <div className="flex-1 text-center md:text-left space-y-6">
                            {isPwaInstalled ? (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#47221E] text-[#FDC8C0] text-sm font-semibold mb-2 border border-[#672B25] shadow-sm">
                                        <CheckCircle2 className="w-4 h-4" /> App Installed
                                    </div>
                                    <h2 className="text-3xl md:text-5xl font-headline font-bold text-[#FFF5F4]">
                                        You're all <span className="text-[#FBA69B]">set!</span>
                                    </h2>
                                    <p className="text-lg text-[#FFEBE8] max-w-lg mx-auto md:mx-0 font-medium">
                                        Fund Her Future is successfully installed on your device. Enjoy the fastest, offline-ready experience right from your home screen.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#47221E] text-[#FFF5F4] text-sm font-semibold mb-2 border border-[#672B25]">
                                        <Smartphone className="w-4 h-4" /> Install from Browser
                                    </div>
                                    <h2 className="text-3xl md:text-5xl font-headline font-bold text-[#FFF5F4]">
                                        Take Fund Her Future <span className="text-[#FBA69B]">Anywhere.</span>
                                    </h2>
                                    <p className="text-lg text-[#FFEBE8] max-w-lg mx-auto md:mx-0 font-medium">
                                        Install our fast, lightweight web app directly to your device. No app store required. Works perfectly across all your favorite platforms.
                                    </p>

                                    <div className="pt-2 pb-2 flex justify-center md:justify-start">
                                        <Button
                                            size="lg"
                                            className="bg-theme-600 hover:bg-theme-700 text-white font-bold px-8 py-6 rounded-full shadow-xl shadow-theme-900/40 border-none transition-transform hover:scale-105"
                                            onClick={async () => {
                                                const promptEvent = (window as any).pwaDeferredPrompt;
                                                if (promptEvent) {
                                                    promptEvent.prompt();
                                                    const { outcome } = await promptEvent.userChoice;
                                                    if (outcome === 'accepted') {
                                                        (window as any).pwaDeferredPrompt = null;
                                                    }
                                                } else {
                                                    window.dispatchEvent(new Event('direct-pwa-install'));
                                                }
                                            }}
                                        >
                                            <Download className="w-5 h-5 mr-2" />
                                            Download App Now
                                        </Button>
                                    </div>

                                    <div className="flex items-center justify-center md:justify-start gap-8 pt-6 text-[#FDC8C0]">
                                        <div className="flex flex-col items-center gap-3">
                                            <Smartphone className="w-8 h-8 text-[#FBA69B]" />
                                            <span className="text-xs font-semibold tracking-wide">ANDROID</span>
                                        </div>
                                        <div className="flex flex-col items-center gap-3">
                                            <Tablet className="w-8 h-8 text-[#FBA69B]" />
                                            <span className="text-xs font-semibold tracking-wide">iOS & iPAD</span>
                                        </div>
                                        <div className="flex flex-col items-center gap-3">
                                            <Laptop className="w-8 h-8 text-[#FBA69B]" />
                                            <span className="text-xs font-semibold tracking-wide">PC & MAC</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right side illustration or spacing */}
                        <div className="hidden md:flex flex-1 justify-center relative">
                            <div className="w-64 h-64 bg-[#47221E]/50 rounded-full blur-3xl absolute -z-10" />
                            <div className="w-48 h-64 bg-gradient-to-tr from-[#672B25] to-[#FBA69B] rounded-[2rem] shadow-2xl border border-[#FBA69B]/30 flex items-center justify-center -rotate-6 transform hover:rotate-0 transition-all duration-500">
                                <div className="w-40 h-56 bg-[#301A18] rounded-[1.5rem] border border-[#47221E] flex flex-col items-center justify-center p-4">
                                    <Image src="/icon-192x192.svg" alt="App Icon" width={64} height={64} className="mb-4" />
                                    <div className="w-20 h-2 bg-[#47221E] rounded-full mb-2" />
                                    <div className="w-16 h-2 bg-[#47221E] rounded-full" />
                                </div>
                            </div>
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
