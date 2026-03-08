import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle2, XCircle, HeartHandshake, Loader2, Sparkles } from "lucide-react";
import { useAuth, useFirestore } from "@/firebase";
import { collection, query, where, getDocs, doc, updateDoc, increment, getDoc } from "firebase/firestore";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

type MentorshipRequest = {
    id: string;
    menteeId: string;
    menteeName: string;
    menteePhotoUrl?: string;
    pitch: string;
    status: 'Pending' | 'Accepted' | 'Completed' | 'Declined';
    createdAt: Date;
};

export function MentorDashboard() {
    const [requests, setRequests] = useState<MentorshipRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const auth = useAuth();
    const db = useFirestore();
    const { toast } = useToast();

    useEffect(() => {
        if (!auth?.currentUser || !db) return;

        const fetchRequests = async () => {
            try {
                const q = query(
                    collection(db, "mentorship_requests"),
                    where("mentorId", "==", auth.currentUser!.uid)
                );
                const snapshot = await getDocs(q);

                const reqs: MentorshipRequest[] = [];
                for (const docSnap of snapshot.docs) {
                    const data = docSnap.data();

                    // Fetch Mentee Profile details
                    let menteeName = "Unknown Applicant";
                    let menteePhotoUrl = undefined;
                    try {
                        const userRef = doc(db, 'users', data.menteeId);
                        const userSnap = await getDoc(userRef);
                        if (userSnap.exists()) {
                            menteeName = userSnap.data().displayName || "Unknown Applicant";
                            menteePhotoUrl = userSnap.data().photoURL;
                        }
                    } catch (e) { console.error("Could not fetch mentee", e); }

                    reqs.push({
                        id: docSnap.id,
                        menteeId: data.menteeId,
                        menteeName,
                        menteePhotoUrl,
                        pitch: data.pitch,
                        status: data.status,
                        createdAt: data.createdAt?.toDate() || new Date()
                    });
                }

                // Sort pending first, then by date
                reqs.sort((a, b) => {
                    if (a.status === 'Pending' && b.status !== 'Pending') return -1;
                    if (a.status !== 'Pending' && b.status === 'Pending') return 1;
                    return b.createdAt.getTime() - a.createdAt.getTime();
                });

                setRequests(reqs);
            } catch (error) {
                console.error("Failed to fetch requests", error);
            } finally {
                setLoading(false);
            }
        };

        fetchRequests();
    }, [auth?.currentUser, db]);

    const handleUpdateStatus = async (requestId: string, newStatus: 'Accepted' | 'Declined' | 'Completed') => {
        if (!db || !auth?.currentUser) return;
        setProcessingId(requestId);

        try {
            const reqRef = doc(db, 'mentorship_requests', requestId);
            await updateDoc(reqRef, { status: newStatus });

            // If completed, award Karma Points to Mentor
            if (newStatus === 'Completed') {
                const mentorRef = doc(db, 'users', auth.currentUser.uid);
                await updateDoc(mentorRef, { karmaPoints: increment(50) });
                toast({
                    title: "Karma Awarded! 🌟",
                    description: "You just earned +50 Karma Points for completing a mentorship session.",
                    className: "bg-amber-50 dark:bg-amber-900 border-amber-200"
                });
            } else {
                toast({ title: `Request ${newStatus}` });
            }

            // Optimistic update
            setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: newStatus } : r));

        } catch (error) {
            console.error("Failed to update status", error);
            toast({ title: "Error", description: "Could not update request.", variant: "destructive" });
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-primary w-6 h-6" /></div>;

    const pendingRequests = requests.filter(r => r.status === 'Pending');
    const activeRequests = requests.filter(r => r.status === 'Accepted');

    return (
        <div className="space-y-6">
            <Card className="border-border/50 shadow-sm">
                <CardHeader className="bg-muted/10 border-b pb-4">
                    <CardTitle className="text-lg font-headline flex items-center gap-2">
                        <HeartHandshake className="w-5 h-5 text-primary" /> Incoming Requests
                    </CardTitle>
                    <CardDescription>Review and accept 15-minute coffee chat requests from applicants.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {pendingRequests.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground text-sm">
                            No pending requests. You are all caught up!
                        </div>
                    ) : (
                        <div className="divide-y">
                            {pendingRequests.map(req => (
                                <div key={req.id} className="p-6 flex flex-col md:flex-row gap-6 hover:bg-muted/5 transition-colors">
                                    <div className="flex gap-4 flex-1">
                                        <Avatar className="w-12 h-12 shadow-sm border">
                                            <AvatarImage src={req.menteePhotoUrl} />
                                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">{req.menteeName[0]}</AvatarFallback>
                                        </Avatar>
                                        <div className="space-y-1 relative w-full pt-1">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-semibold text-foreground tracking-tight">{req.menteeName}</h4>
                                                <span className="text-xs text-muted-foreground">• {formatDistanceToNow(req.createdAt)} ago</span>
                                            </div>
                                            <p className="text-sm text-foreground/80 leading-relaxed bg-secondary/30 p-3 rounded-lg border mt-2">
                                                &quot;{req.pitch}&quot;
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex md:flex-col justify-end gap-2 md:w-32">
                                        <Button
                                            size="sm"
                                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-md"
                                            disabled={processingId === req.id}
                                            onClick={() => handleUpdateStatus(req.id, 'Accepted')}
                                        >
                                            {processingId === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4 mr-1.5" /> Accept</>}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20"
                                            disabled={processingId === req.id}
                                            onClick={() => handleUpdateStatus(req.id, 'Declined')}
                                        >
                                            <XCircle className="w-4 h-4 mr-1.5" /> Decline
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Active Chats Needs to be Completed for Karma */}
            {activeRequests.length > 0 && (
                <Card className="border-amber-200 dark:border-amber-900/50 shadow-sm relative overflow-hidden bg-amber-50/10 dark:bg-amber-900/10">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                        <Sparkles className="w-32 h-32" />
                    </div>
                    <CardHeader className="pb-3 border-b border-amber-200/40 dark:border-amber-800/40">
                        <CardTitle className="text-md font-headline flex items-center gap-2 text-amber-800 dark:text-amber-300 relative z-10">
                            Active Chats <span className="text-xs font-normal text-amber-700/70 border px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900 shadow-sm">Mark completed to earn Karma</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-amber-200/50 dark:divide-amber-800/30">
                            {activeRequests.map(req => (
                                <div key={req.id} className="p-4 flex items-center justify-between relative z-10 hover:bg-amber-100/30 dark:hover:bg-amber-950/30 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="w-8 h-8">
                                            <AvatarFallback className="bg-amber-200 text-amber-800 text-xs font-bold">{req.menteeName[0]}</AvatarFallback>
                                        </Avatar>
                                        <p className="text-sm font-semibold">{req.menteeName}</p>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-amber-700 hover:text-amber-800 hover:bg-amber-200/50 font-semibold text-xs rounded-full border border-amber-300/50"
                                        disabled={processingId === req.id}
                                        onClick={() => handleUpdateStatus(req.id, 'Completed')}
                                    >
                                        Mark as Completed (+50 Karma)
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
