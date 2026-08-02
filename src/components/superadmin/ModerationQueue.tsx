import { useState, useEffect } from "react";
import { useAuth, useFirestore } from "@/firebase";
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, ShieldCheck, Trash2, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

export function ModerationQueue() {
    const [flaggedPosts, setFlaggedPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const auth = useAuth();
    const db = useFirestore();
    const { toast } = useToast();

    useEffect(() => {
        if (!auth?.currentUser || !db) return;

        const fetchFlagged = async () => {
            try {
                const q = query(collection(db, "community_posts"), where("isFlagged", "==", true));
                const snap = await getDocs(q);
                const posts = snap.docs.map(d => ({ id: d.id, ...d.data() }));

                posts.sort((a: any, b: any) => {
                    if (!a.createdAt || !b.createdAt) return 0;
                    return b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime();
                });

                setFlaggedPosts(posts);
            } catch (e) {
                console.error("Error fetching flagged posts", e);
            } finally {
                setLoading(false);
            }
        };
        fetchFlagged();
    }, [auth?.currentUser, db]);

    const handleDismiss = async (postId: string) => {
        if (!db) return;
        setProcessingId(postId);
        try {
            await updateDoc(doc(db, "community_posts", postId), { isFlagged: false });
            setFlaggedPosts(prev => prev.filter(p => p.id !== postId));
            toast({ title: "Flag Dismissed", description: "Post has been reinstated." });
        } catch (error) {
            toast({ title: "Error", variant: "destructive", description: "Could not dismiss flag." });
        } finally {
            setProcessingId(null);
        }
    };

    const handleDelete = async (postId: string) => {
        if (!db) return;
        setProcessingId(postId);
        try {
            await deleteDoc(doc(db, "community_posts", postId));
            setFlaggedPosts(prev => prev.filter(p => p.id !== postId));
            toast({ title: "Post Deleted", description: "Content removed from community.", className: "bg-red-50 text-red-900 border-red-200" });
        } catch (error) {
            toast({ title: "Error", variant: "destructive", description: "Could not delete post." });
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-primary w-6 h-6" /></div>;

    if (flaggedPosts.length === 0) {
        return (
            <div className="p-12 text-center border-dashed border-2 bg-emerald-50/20 rounded-2xl">
                <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-headline font-bold text-foreground">Queue Empty</h3>
                <p className="mt-2 mb-6 text-sm text-muted-foreground">No flagged content. The community is healthy.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="mb-6 border-b pb-4">
                <h3 className="font-headline font-bold text-lg text-red-600 dark:text-red-400 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" /> Moderation Queue
                </h3>
                <p className="text-sm text-muted-foreground mt-1">Review posts flagged by the community for inappropriate content.</p>
            </div>

            <div className="divide-y border border-red-100 dark:border-red-900/40 shadow-sm rounded-xl bg-card overflow-hidden">
                {flaggedPosts.map(post => (
                    <div key={post.id} className="p-6 hover:bg-muted/10 transition-colors flex flex-col md:flex-row gap-6">
                        <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded uppercase tracking-wider">Review Required</span>
                                <span className="text-xs text-muted-foreground">Reported {post.createdAt?.toDate() ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true }) : 'recently'}</span>
                            </div>

                            <div className="bg-destructive/5 border border-destructive/20 p-4 rounded-lg">
                                <h4 className="font-bold text-foreground mb-1">{post.title}</h4>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{post.content}</p>
                            </div>

                            <div className="text-xs text-muted-foreground pt-1 flex gap-4">
                                <span>Author UID: <span className="font-mono bg-muted px-1 py-0.5 rounded">{post.authorId}</span></span>
                                <span>Post ID: <span className="font-mono bg-muted px-1 py-0.5 rounded">{post.id}</span></span>
                            </div>
                        </div>

                        <div className="flex md:flex-col justify-end gap-2 md:w-40 shrink-0">
                            <Button
                                variant="outline"
                                className="w-full text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 border-emerald-200"
                                disabled={processingId === post.id}
                                onClick={() => handleDismiss(post.id)}
                            >
                                <CheckCircle className="w-4 h-4 mr-2" /> Dismiss Flag
                            </Button>
                            <Button
                                variant="destructive"
                                className="w-full"
                                disabled={processingId === post.id}
                                onClick={() => handleDelete(post.id)}
                            >
                                <Trash2 className="w-4 h-4 mr-2" /> Delete Post
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
