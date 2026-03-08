'use client';

import { useState, useEffect } from 'react';
import { useAuth, useFirestore } from '@/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, ArrowLeft, Search, GraduationCap, MapPin, Sparkles, ShieldCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { CoffeeChatModal } from '@/components/mentorship/CoffeeChatModal';
import { MentorDashboard } from '@/components/mentorship/MentorDashboard';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type MentorProfile = {
    uid: string;
    displayName: string;
    photoURL?: string;
    major: string;
    state: string;
    bio?: string;
    karmaPoints: number;
    scholarshipsWon: string[];
};

export default function MentorshipHubPage() {
    const [mentors, setMentors] = useState<MentorProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [isCurrentUserMentor, setIsCurrentUserMentor] = useState(false);

    const auth = useAuth();
    const db = useFirestore();
    const { toast } = useToast();

    useEffect(() => {
        if (!auth?.currentUser || !db) return;

        const fetchMentors = async () => {
            try {
                // 1. Check if the current user is a mentor to show them the dashboard tab
                const myProfileRef = doc(db, 'users', auth.currentUser!.uid);
                const myProfileSnap = await getDoc(myProfileRef);
                if (myProfileSnap.exists() && myProfileSnap.data().isMentor) {
                    setIsCurrentUserMentor(true);
                }

                // 2. Query all users who have opted in to be mentors
                const q = query(collection(db, 'users'), where("isMentor", "==", true));
                const snapshot = await getDocs(q);

                const loadedMentors: MentorProfile[] = [];

                for (const docSnap of snapshot.docs) {
                    const data = docSnap.data();
                    // Skip showing ourselves in the matchmaker
                    if (docSnap.id === auth.currentUser!.uid) continue;

                    // In production, `scholarshipsWon` would be pre-calculated and stored on the user document for fast querying.
                    // For this demo, we can mock it based on their Karma if array doesn't exist.
                    const mockedWon = data.karmaPoints > 0 ? ["Reliance Foundation"] : ["Kotak Kanya"];

                    loadedMentors.push({
                        uid: docSnap.id,
                        displayName: data.displayName || "Unknown Mentor",
                        photoURL: data.photoURL,
                        major: data.major || "Undecided",
                        state: data.state || "India",
                        bio: data.bio || "I am happy to help you review your application essays!",
                        karmaPoints: data.karmaPoints || 0,
                        scholarshipsWon: data.scholarshipsWon || mockedWon,
                    });
                }

                // Sort by Karma Points
                loadedMentors.sort((a, b) => b.karmaPoints - a.karmaPoints);
                setMentors(loadedMentors);

            } catch (err) {
                console.error("Failed to fetch matchmaker data:", err);
                toast({ title: "Error", description: "Could not load the Matchmaker.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };

        fetchMentors();
    }, [auth?.currentUser, db, toast]);

    const filteredMentors = mentors.filter(m =>
        m.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.major.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.scholarshipsWon.some(sw => sw.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 animate-in fade-in duration-500">

            {/* Heavy Premium Header */}
            <div className="bg-gradient-to-r from-amber-600 to-amber-800 rounded-3xl p-8 sm:p-12 mb-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-400/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

                <div className="relative z-10">
                    <Button variant="ghost" className="mb-6 -ml-4 text-white hover:bg-white/20 hover:text-white" asChild>
                        <Link href="/authenticated/dashboard"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard</Link>
                    </Button>
                    <h1 className="text-4xl sm:text-5xl font-headline font-bold mb-4 tracking-tight">The Mentorship Hub</h1>
                    <p className="max-w-xl text-amber-100 text-lg leading-relaxed">
                        Connect 1-on-1 with Verified Scholars. Book a 15-minute virtual coffee chat to refine your essays, discuss interviews, and get insider advice.
                    </p>
                </div>
            </div>

            <Tabs defaultValue="matchmaker" className="w-full">
                <TabsList className="mb-6 bg-muted/50 p-1 w-full flex justify-start h-auto border">
                    <TabsTrigger value="matchmaker" className="text-sm py-2 px-6 rounded-md data-[state=active]:shadow-sm">
                        <Search className="w-4 h-4 mr-2" /> Find a Mentor
                    </TabsTrigger>
                    {isCurrentUserMentor && (
                        <TabsTrigger value="dashboard" className="text-sm py-2 px-6 rounded-md data-[state=active]:shadow-sm">
                            <Sparkles className="w-4 h-4 mr-2 text-amber-500" /> Mentor Dashboard
                        </TabsTrigger>
                    )}
                </TabsList>

                <TabsContent value="matchmaker" className="space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <h2 className="text-xl font-headline font-bold text-foreground">The Matchmaker</h2>
                        <div className="relative w-full sm:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by major, name, or scholarship..."
                                className="pl-9 bg-card"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
                            <Loader2 className="w-10 h-10 text-amber-600 animate-spin" />
                            <p className="text-muted-foreground animate-pulse font-medium">Calibrating the Matchmaker algorithm...</p>
                        </div>
                    ) : filteredMentors.length === 0 ? (
                        <div className="p-12 text-center border-dashed border-2 bg-secondary/20 rounded-2xl">
                            <h3 className="text-xl font-headline font-bold">No Mentors Found</h3>
                            <p className="mt-2 mb-6 text-sm text-muted-foreground">Try adjusting your search criteria.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredMentors.map((mentor, idx) => (
                                <motion.div
                                    key={mentor.uid}
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1, duration: 0.4 }}
                                    className="bg-card border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all hover:border-amber-500/30 flex flex-col h-full"
                                >
                                    {/* Avatar & Badges */}
                                    <div className="flex justify-between items-start mb-4 relative">
                                        <div className="relative">
                                            <Avatar className="w-16 h-16 border-4 border-background shadow-md relative z-10">
                                                <AvatarImage src={mentor.photoURL} />
                                                <AvatarFallback className="bg-amber-100 text-amber-700 font-bold text-xl">{mentor.displayName[0]}</AvatarFallback>
                                            </Avatar>
                                            {/* Glowing Aura */}
                                            <motion.div
                                                className="absolute -inset-1.5 rounded-full border-2 border-emerald-400 opacity-60 pointer-events-none"
                                                animate={{ rotate: 360, scale: [1, 1.05, 1] }}
                                                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                            />
                                        </div>

                                        <div className="flex flex-col items-end gap-1.5 pt-1">
                                            <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-200 border-none font-bold shadow-sm">
                                                🌟 {mentor.karmaPoints} Karma
                                            </Badge>
                                            <div className="text-[10px] font-bold tracking-wider uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1 border border-emerald-200">
                                                <ShieldCheck className="w-3 h-3" /> Scholar
                                            </div>
                                        </div>
                                    </div>

                                    {/* Core Info */}
                                    <div className="flex-1 space-y-3">
                                        <div>
                                            <h3 className="font-headline font-bold text-lg text-foreground truncate">{mentor.displayName}</h3>
                                            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                                                <span className="flex items-center gap-1 truncate"><GraduationCap className="w-3.5 h-3.5 shrink-0" /> {mentor.major}</span>
                                                <span className="flex items-center gap-1 shrink-0"><MapPin className="w-3.5 h-3.5" /> {mentor.state}</span>
                                            </div>
                                        </div>

                                        <p className="text-sm text-foreground/80 leading-relaxed line-clamp-3">
                                            &quot;{mentor.bio}&quot;
                                        </p>

                                        <div className="pt-2 flex flex-wrap gap-2">
                                            {mentor.scholarshipsWon.map((sw, i) => (
                                                <span key={i} className="text-[10px] bg-secondary text-secondary-foreground px-2 py-1 rounded-md line-clamp-1 border">
                                                    Won: {sw}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Action */}
                                    <div className="pt-6 mt-auto border-t">
                                        <CoffeeChatModal mentorId={mentor.uid} mentorName={mentor.displayName} />
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="dashboard">
                    <MentorDashboard />
                </TabsContent>
            </Tabs>
        </div>
    );
}
