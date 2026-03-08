'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth, useFirestore } from '@/firebase';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, GraduationCap, Building2, Calendar, IndianRupee, PieChart, Info } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { TimelineStatus, ApplicationStatus } from '@/components/applications/TimelineStatus';
import { PivotRecommendations } from '@/components/applications/PivotRecommendations';
import { BankDetailsForm } from '@/components/applications/BankDetailsForm';
import { DisbursementTracker, DisbursementStatus } from '@/components/applications/DisbursementTracker';
import { formatDistanceToNow } from 'date-fns';

type JoinedApplication = {
    id: string;
    scholarshipId: string;
    status: ApplicationStatus;
    submittedAt: Date | null;
    essay: string;
    // Joined Data
    scholarshipTitle: string;
    provider: string;
    amount: number;
    matchScore: number; // Mocked or calculated benchmarking
    originalFieldOfStudy: string;
    disbursementStatus?: DisbursementStatus;
};

export default function ApplicationsTrackerPage() {
    const [applications, setApplications] = useState<JoinedApplication[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);
    const auth = useAuth();
    const db = useFirestore();

    useEffect(() => {
        if (!auth?.currentUser || !db) return;

        const fetchApplications = async () => {
            try {
                const appsQuery = query(
                    collection(db, 'applications'),
                    where('userId', '==', auth.currentUser!.uid)
                );
                const appsSnapshot = await getDocs(appsQuery);

                const joinedResult: JoinedApplication[] = [];

                for (const appDoc of appsSnapshot.docs) {
                    const appData = appDoc.data();
                    let amount = 0;
                    let provider = "Unknown Provider";
                    let matchScore = Math.floor(Math.random() * 30) + 60; // Mock insight score 60-90%

                    // Fetch underlying scholarship to get rich details
                    try {
                        const schRef = doc(db, 'scholarships', appData.scholarshipId);
                        const schSnap = await getDoc(schRef);
                        if (schSnap.exists()) {
                            const schData = schSnap.data();
                            amount = schData.rewardAmount?.amount || 0;
                            provider = schData.provider || "Unknown Provider";
                        }
                    } catch (e) { console.error("Could not fetch sch data", e); }

                    let disbursementStatus: DisbursementStatus | undefined;
                    if (appData.status === 'Awarded') {
                        disbursementStatus = 'Awaiting Details';
                        try {
                            const disRef = doc(db, 'disbursements', appDoc.id);
                            const disSnap = await getDoc(disRef);
                            if (disSnap.exists()) {
                                disbursementStatus = disSnap.data().status as DisbursementStatus;
                            }
                        } catch (e) { console.error("Could not fetch disbursement status", e); }
                    }

                    joinedResult.push({
                        id: appDoc.id,
                        scholarshipId: appData.scholarshipId,
                        status: (appData.status as ApplicationStatus) || 'Submitted',
                        submittedAt: appData.submittedAt?.toDate() || new Date(),
                        essay: appData.essay || '',
                        scholarshipTitle: appData.scholarshipTitle || 'Unknown Scholarship',
                        provider,
                        amount,
                        matchScore,
                        originalFieldOfStudy: appData.major || 'Unknown Major',
                        disbursementStatus
                    });
                }

                // Sort by newest first
                joinedResult.sort((a, b) => {
                    if (!a.submittedAt || !b.submittedAt) return 0;
                    return b.submittedAt.getTime() - a.submittedAt.getTime()
                });

                setApplications(joinedResult);
            } catch (err) {
                console.error("Failed to fetch applications:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchApplications();
    }, [auth?.currentUser, db, refreshKey]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-muted-foreground animate-pulse text-sm font-medium">Loading your applications...</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 animate-in fade-in duration-500">

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-headline font-bold text-foreground tracking-tight flex items-center gap-3">
                        <GraduationCap className="w-8 h-8 text-primary" />
                        My Applications
                    </h1>
                    <p className="text-muted-foreground mt-2 text-sm max-w-xl">
                        Track the real-time status of your submissions, view smart benchmarking insights, and discover pivot opportunities if an application is unsuccessful.
                    </p>
                </div>
                <Button variant="outline" asChild>
                    <Link href="/authenticated/dashboard"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard</Link>
                </Button>
            </div>

            {applications.length === 0 ? (
                <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed border-2 bg-secondary/20">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                        <PieChart className="w-8 h-8 text-primary" />
                    </div>
                    <CardTitle className="text-xl">No Applications Yet</CardTitle>
                    <CardDescription className="max-w-md mt-2 mb-6 text-sm">
                        You haven&apos;t applied to any scholarships yet. Explore the dashboard to find matching opportunities suited to your profile.
                    </CardDescription>
                    <Button size="lg" className="rounded-full shadow-lg shadow-primary/20" asChild>
                        <Link href="/authenticated/dashboard">Explore Scholarships</Link>
                    </Button>
                </Card>
            ) : (
                <div className="space-y-6">
                    {applications.map((app, index) => (
                        <motion.div
                            key={app.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1, duration: 0.5 }}
                        >
                            <Card className="overflow-hidden border-border/60 hover:border-primary/30 transition-all shadow-sm group relative">

                                {/* Status Color Banner */}
                                <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${app.status === 'Rejected' ? 'bg-destructive' : app.status === 'Awarded' ? 'bg-emerald-500' : 'bg-primary'}`} />

                                <CardContent className="p-0">
                                    <div className="p-6 md:p-8 flex flex-col xl:flex-row gap-8">

                                        {/* Left Column: Scholarship Details & Insights */}
                                        <div className="flex-1 space-y-4">
                                            <div>
                                                <p className="text-sm font-semibold text-primary mb-1 tracking-wide uppercase">{app.provider}</p>
                                                <h2 className="text-2xl font-headline font-bold text-foreground pr-4 decoration-primary/30 underline-offset-4 group-hover:underline">{app.scholarshipTitle}</h2>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-3">
                                                <Badge variant="secondary" className="flex items-center gap-1.5 px-3 py-1 bg-secondary/50">
                                                    <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
                                                    <span className="font-semibold">₹{app.amount.toLocaleString('en-IN')}</span>
                                                </Badge>
                                                {app.submittedAt && (
                                                    <span className="text-xs text-muted-foreground flex items-center gap-1.5 bg-background border px-2.5 py-1 rounded-md">
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        Applied {formatDistanceToNow(app.submittedAt, { addSuffix: true })}
                                                    </span>
                                                )}
                                                <div className="text-xs font-semibold px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                                                    <PieChart className="w-3.5 h-3.5" /> {app.matchScore}% Match Profile
                                                </div>
                                            </div>

                                            {app.status !== 'Rejected' && (
                                                <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg flex items-start gap-2 border">
                                                    <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                                    <p>Your application is currently <strong>{app.status}</strong>. Decisions generally take 4-6 weeks from the closing date. You will be notified via email of any status changes.</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Right Column: Timeline & Pivots */}
                                        <div className="xl:w-1/2 bg-muted/20 rounded-xl border p-4 sm:p-6 shadow-inner flex flex-col justify-center">
                                            <h3 className="text-sm font-semibold mb-6 flex items-center gap-2">
                                                <Building2 className="w-4 h-4 text-muted-foreground" /> Track Status
                                            </h3>

                                            <TimelineStatus currentStatus={app.status} />

                                            {app.status === 'Rejected' && (
                                                <PivotRecommendations originalFieldOfStudy={app.originalFieldOfStudy} />
                                            )}

                                            {app.status === 'Awarded' && (
                                                <div className="mt-4 pt-4 border-t border-border/50">
                                                    {app.disbursementStatus === 'Awaiting Details' ? (
                                                        <BankDetailsForm applicationId={app.id} onSubmitted={() => setRefreshKey(prev => prev + 1)} />
                                                    ) : (
                                                        <DisbursementTracker currentStatus={app.disbursementStatus as DisbursementStatus} amount={app.amount} />
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
