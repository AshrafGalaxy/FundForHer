'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/app/auth-provider';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs, doc, getDoc, orderBy } from 'firebase/firestore';
import type { Application, ApplicationStatus, Scholarship } from '@/lib/types';
import type { ProviderProfile } from '@/server/db/user-data';
import { getProviderProfile } from '@/server/db/user-data';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Star, Users } from 'lucide-react';
import Link from 'next/link';
import { CandidateReviewModal } from '@/features/provider/CandidateReviewModal';

const COLUMNS: { id: ApplicationStatus; label: string; color: string }[] = [
    { id: 'new', label: 'New Applicants', color: 'border-blue-200 bg-blue-50/50' },
    { id: 'reviewing', label: 'Under Review', color: 'border-amber-200 bg-amber-50/50' },
    { id: 'shortlisted', label: 'Shortlisted', color: 'border-purple-200 bg-purple-50/50' },
    { id: 'accepted', label: 'Accepted/Awarded', color: 'border-green-200 bg-green-50/50' },
    { id: 'rejected', label: 'Rejected', color: 'border-zinc-200 bg-zinc-50' },
];

export default function ProviderKanbanBoardClient() {
    const params = useParams();
    const scholarshipId = params.scholarshipId as string;
    const router = useRouter();

    const authContext = useAuth();
    const db = useFirestore();
    const user = authContext?.user;

    const [applications, setApplications] = useState<Application[]>([]);
    const [scholarship, setScholarship] = useState<Scholarship | null>(null);
    const [loading, setLoading] = useState(true);
    const [providerProfile, setProviderProfile] = useState<ProviderProfile | null>(null);

    const [selectedApp, setSelectedApp] = useState<Application | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!user || !db || !scholarshipId) return;

            try {
                // 1. Verify Provider is Valid
                const profile = await getProviderProfile(db, user.uid);
                if (!profile || profile.kycStatus !== 'verified') {
                    router.push('/provider/dashboard');
                    return;
                }
                setProviderProfile(profile);

                // 2. Fetch Scholarship details
                const sDoc = await getDoc(doc(db, 'scholarships', scholarshipId));
                if (sDoc.exists() && sDoc.data().providerId === user.uid) {
                    setScholarship({ id: sDoc.id, ...sDoc.data() } as Scholarship);
                } else {
                    router.push('/provider/dashboard');
                    return;
                }

                // 3. Fetch Applications for this scholarship
                const appsQuery = query(
                    collection(db, 'applications'),
                    where('scholarshipId', '==', scholarshipId),
                    orderBy('matchScore', 'desc') // Pre-sort by highest AI Match
                );

                const snap = await getDocs(appsQuery);
                const fetchedApps: Application[] = [];
                snap.forEach(d => {
                    fetchedApps.push({ id: d.id, ...d.data() } as Application);
                });

                setApplications(fetchedApps);

            } catch (error) {
                console.error("Failed to load kanban data:", error);
            } finally {
                setLoading(false);
            }
        };

        if (user && db) fetchData();
    }, [user, db, scholarshipId, router]);

    const handleStatusUpdate = (appId: string, newStatus: ApplicationStatus) => {
        setApplications(prev => prev.map(a =>
            a.id === appId ? { ...a, status: newStatus } : a
        ));
    };

    if (loading) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;
    }

    if (!scholarship) return null;

    // Group apps by status
    const columnData = COLUMNS.map(col => ({
        ...col,
        items: applications.filter(a => a.status === col.id)
    }));

    return (
        <div className="container max-w-[1600px] mx-auto px-4 py-8 h-screen flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 flex-shrink-0">
                <div>
                    <Button asChild variant="ghost" className="-ml-4 mb-2">
                        <Link href="/provider/dashboard"><ArrowLeft className="mr-2" /> Back to Dashboard</Link>
                    </Button>
                    <h1 className="text-3xl font-headline font-bold">{scholarship.title}</h1>
                    <p className="text-muted-foreground flex items-center gap-2 mt-1">
                        <Users className="w-4 h-4" /> {applications.length} Total Applicants Pipeline
                    </p>
                </div>
            </div>

            {/* Kanban Board Layout */}
            <div className="flex gap-6 overflow-x-auto pb-6 pt-2 flex-1 items-start">
                {columnData.map(col => (
                    <div key={col.id} className={`flex-shrink-0 w-80 rounded-xl border ${col.color} p-4 flex flex-col h-full max-h-full`}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold">{col.label}</h3>
                            <span className="bg-background text-xs font-bold px-2.5 py-1 rounded-full shadow-sm text-foreground">
                                {col.items.length}
                            </span>
                        </div>

                        <div className="flex flex-col gap-3 overflow-y-auto pr-1 pb-2">
                            {col.items.map(app => (
                                <div
                                    key={app.id}
                                    onClick={() => setSelectedApp(app)}
                                    className="bg-card hover:bg-card/80 border shadow-sm rounded-lg p-3 cursor-pointer transition-all hover:-translate-y-1 hover:shadow-md"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <p className="font-medium text-sm truncate pr-2">{app.resumeSnapshot.fullName}</p>
                                        <div className={`text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1 shrink-0 ${app.matchScore >= 80 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                            <Star className="w-3 h-3 fill-current" /> {app.matchScore}%
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate">{app.resumeSnapshot.qualification}</p>
                                </div>
                            ))}
                            {col.items.length === 0 && (
                                <div className="text-center p-6 border-2 border-dashed border-muted rounded-lg opacity-50">
                                    <p className="text-xs text-muted-foreground">Drop candidate here</p>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Candidate Modal */}
            <CandidateReviewModal
                application={selectedApp}
                open={!!selectedApp}
                onOpenChange={(open) => !open && setSelectedApp(null)}
                onStatusChange={handleStatusUpdate}
            />
        </div>
    );
}
