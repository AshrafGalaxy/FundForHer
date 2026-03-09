'use client';

import { useState, useEffect } from 'react';
import { useAuth, useFirestore } from '@/firebase';
import { collection, query, orderBy, getDocs, doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Loader2, Users, ArrowLeft, Trophy, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { CreatePostModal } from '@/components/community/CreatePostModal';
import { PostCard, CommunityPost } from '@/components/community/PostCard';
import { useToast } from '@/hooks/use-toast';

export default function CommunityHubPage() {
    const [posts, setPosts] = useState<CommunityPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    const auth = useAuth();
    const db = useFirestore();
    const { toast } = useToast();

    const fetchPosts = async () => {
        if (!db) return;
        setLoading(true);

        try {
            const postsQuery = query(collection(db, 'community_posts'), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(postsQuery);

            const loadedPosts: CommunityPost[] = [];

            for (const postDoc of snapshot.docs) {
                const data = postDoc.data();
                let authorName = "Unknown";
                let authorPhotoUrl = undefined;
                let isVerifiedScholar = false;

                // Fetch Author Data if not Anonymous
                if (!data.isAnonymous) {
                    try {
                        // 1. Get Base Profile
                        const userRef = doc(db, 'users', data.authorId);
                        const userSnap = await getDoc(userRef);
                        if (userSnap.exists()) {
                            authorName = userSnap.data().displayName || "Unknown";
                            authorPhotoUrl = userSnap.data().photoURL;
                        }

                        // 2. Determine "Verified Scholar" Aura
                        // In a production environment this would be cached on the user profile to prevent heavy N+1 queries.
                        const appsQuery = query(collection(db, 'applications'));
                        const appsSnap = await getDocs(appsQuery);
                        const hasAwarded = appsSnap.docs.some(d => d.data().userId === data.authorId && d.data().status === 'Awarded');
                        isVerifiedScholar = hasAwarded;

                    } catch (e) { console.error("Could not fetch author profile."); }
                }

                // We simulate `pinnedReply` structures for the demo UI if none exist in the real database
                const mockPinned = Math.random() > 0.7 ? {
                    authorName: "Sarah J.",
                    content: "You can request a digitized copy of your income certificate via the state portal. It usually takes 48 hours to process if you expedite it.",
                    isVerifiedScholar: true,
                } : undefined;

                loadedPosts.push({
                    id: postDoc.id,
                    title: data.title,
                    content: data.content,
                    authorId: data.authorId,
                    authorName,
                    authorPhotoUrl,
                    isAnonymous: data.isAnonymous,
                    isVerifiedScholar,
                    likes: data.likes || [],
                    createdAt: data.createdAt?.toDate() || new Date(),
                    repliesCount: Math.floor(Math.random() * 15),
                    pinnedReply: data.pinnedReply || mockPinned,
                });
            }

            setPosts(loadedPosts);
        } catch (err) {
            console.error("Failed to fetch community posts:", err);
            toast({ title: "Error", description: "Could not load the community feed.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPosts();
    }, [db]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleCelebrate = async (postId: string) => {
        if (!auth?.currentUser || !db) return;
        try {
            const postRef = doc(db, 'community_posts', postId);
            await updateDoc(postRef, {
                likes: arrayUnion(auth.currentUser.uid)
            });
            // Optimistically update local state
            setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: [...p.likes, auth.currentUser!.uid] } : p));
        } catch (e) { console.error("Celebrate failed", e); }
    };

    const filteredPosts = posts.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.content.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 animate-in fade-in duration-500">

            {/* Header Profile */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                <div>

                    <h1 className="text-3xl font-headline font-bold text-foreground tracking-tight flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-xl">
                            <Users className="w-7 h-7 text-primary" />
                        </div>
                        The Peer Hub
                    </h1>
                    <p className="text-muted-foreground mt-2 text-sm max-w-xl leading-relaxed">
                        Connect with millions of applicants worldwide. Ask questions anonymously, celebrate wins together, and get advice from <strong className="text-emerald-500 font-semibold">Verified Scholars</strong>.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search discussions..."
                            className="pl-9 bg-card border-muted-foreground/20"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <CreatePostModal onPostCreated={fetchPosts} />
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                    <p className="text-muted-foreground animate-pulse text-sm font-medium">Syncing with the global community...</p>
                </div>
            ) : filteredPosts.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center border-dashed border-2 bg-secondary/20 rounded-2xl">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                        <Trophy className="w-8 h-8 text-primary opacity-50" />
                    </div>
                    <h3 className="text-xl font-headline font-bold">No discussions found</h3>
                    <p className="max-w-md mt-2 mb-6 text-sm text-muted-foreground">
                        Be the first to break the ice! Ask a question or share your recent scholarship application journey.
                    </p>
                    <CreatePostModal onPostCreated={fetchPosts} />
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    <div className="lg:col-span-8 space-y-6">
                        {filteredPosts.map((post, idx) => (
                            <motion.div
                                key={post.id}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05, duration: 0.4 }}
                            >
                                <PostCard
                                    post={post}
                                    currentUserId={auth?.currentUser?.uid}
                                    onLike={handleCelebrate}
                                />
                            </motion.div>
                        ))}
                    </div>

                    <div className="lg:col-span-4 space-y-6 hidden lg:block">
                        <div className="sticky top-6">
                            <div className="bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl p-6 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <Trophy className="w-32 h-32 text-emerald-500" />
                                </div>
                                <h3 className="font-headline font-bold text-lg text-emerald-800 dark:text-emerald-300 relative z-10 mb-2">
                                    What is a Verified Scholar?
                                </h3>
                                <p className="text-sm text-emerald-700/80 dark:text-emerald-400/80 leading-relaxed mb-4 relative z-10">
                                    Users with the glowing green aura have successfully won a scholarship using our platform. Their advice is highly credible and field-tested.
                                </p>
                                <Button variant="outline" className="w-full bg-emerald-100/50 hover:bg-emerald-200 text-emerald-800 border-emerald-300 font-semibold relative z-10" asChild>
                                    <Link href="/authenticated/dashboard">View My Match Score</Link>
                                </Button>
                            </div>
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
}
