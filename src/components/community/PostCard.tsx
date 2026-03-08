import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, Pin, PartyPopper, CheckCircle2, ShieldCheck, MoreVertical, Flag } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useFirestore } from "@/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

export type CommunityPost = {
    id: string;
    title: string;
    content: string;
    authorId: string;
    authorName?: string;
    authorPhotoUrl?: string;
    isAnonymous: boolean;
    isVerifiedScholar?: boolean; // Got from join
    likes: string[];
    createdAt: Date;
    repliesCount?: number;
    pinnedReply?: {
        authorName: string;
        content: string;
        isVerifiedScholar?: boolean;
    }
};

export function PostCard({ post, currentUserId, onLike }: { post: CommunityPost, currentUserId?: string, onLike: (postId: string) => void }) {
    const [isLiking, setIsLiking] = useState(false);
    const hasLiked = currentUserId ? post.likes.includes(currentUserId) : false;
    const db = useFirestore();
    const { toast } = useToast();

    const handleReport = async () => {
        if (!db) return;
        try {
            await updateDoc(doc(db, "community_posts", post.id), { isFlagged: true });
            toast({ title: "Post Flagged", description: "Our moderation team will review this content shortly." });
        } catch (error) {
            toast({ title: "Error", description: "Could not flag post.", variant: "destructive" });
        }
    };

    const handleCelebrate = async () => {
        if (!currentUserId || isLiking) return;
        setIsLiking(true);

        // Only fire confetti if they are 'liking' it for the first time
        if (!hasLiked) {
            const rect = document.getElementById(`celebrate-btn-${post.id}`)?.getBoundingClientRect();
            if (rect) {
                const x = (rect.left + rect.width / 2) / window.innerWidth;
                const y = (rect.top + rect.height / 2) / window.innerHeight;

                confetti({
                    particleCount: 80,
                    spread: 80,
                    origin: { x, y },
                    colors: ['#FFD700', '#FF69B4', '#00CED1'],
                    disableForReducedMotion: true
                });
            }
        }

        try {
            await onLike(post.id);
        } finally {
            setIsLiking(false);
        }
    };

    return (
        <Card className="hover:border-primary/30 transition-all overflow-hidden shadow-sm group">
            <CardHeader className="pb-3 border-b bg-muted/20">
                <div className="flex justify-between items-start gap-4">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Avatar className="w-10 h-10 border-2 border-background shadow-sm z-10">
                                <AvatarImage src={post.isAnonymous ? undefined : post.authorPhotoUrl} />
                                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                    {post.isAnonymous ? "A" : (post.authorName?.[0] || "?")}
                                </AvatarFallback>
                            </Avatar>

                            {/* Verified Scholar Glowing Aura */}
                            {!post.isAnonymous && post.isVerifiedScholar && (
                                <motion.div
                                    className="absolute -inset-1.5 rounded-full border-2 border-emerald-400 opacity-60 pointer-events-none"
                                    animate={{ rotate: 360, scale: [1, 1.05, 1] }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                />
                            )}
                        </div>

                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <p className="font-semibold text-sm text-foreground">
                                    {post.isAnonymous ? "Anonymous Applicant" : post.authorName}
                                </p>
                                {!post.isAnonymous && post.isVerifiedScholar && (
                                    <div className="flex items-center gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase border border-emerald-500/20 shadow-sm cursor-help" title="This user has won a scholarship using our platform.">
                                        <ShieldCheck className="w-3 h-3" /> Scholar
                                    </div>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {formatDistanceToNow(post.createdAt, { addSuffix: true })}
                            </p>
                        </div>
                    </div>

                    {currentUserId && currentUserId !== post.authorId && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground rounded-full hover:bg-muted/50">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40 border-border/50 shadow-sm">
                                <DropdownMenuItem onClick={handleReport} className="text-destructive focus:text-destructive cursor-pointer">
                                    <Flag className="w-4 h-4 mr-2" /> Report Post
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
                <CardTitle className="text-xl font-headline leading-tight pr-4">{post.title}</CardTitle>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {post.content}
                </p>

                {/* Pinned Solution UI */}
                {post.pinnedReply && (
                    <div className="mt-4 bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2 opacity-10">
                            <CheckCircle2 className="w-24 h-24 text-emerald-500" />
                        </div>
                        <div className="relative z-10">
                            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mb-2 tracking-wide uppercase">
                                <Pin className="w-3.5 h-3.5" /> Pinned Help
                            </p>
                            <div className="flex gap-2">
                                <div className="w-1 h-auto bg-emerald-300 dark:bg-emerald-700 rounded-full flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-semibold flex items-center gap-1.5 text-foreground/90">
                                        {post.pinnedReply.authorName}
                                        {post.pinnedReply.isVerifiedScholar && <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-3">
                                        {post.pinnedReply.content}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </CardContent>

            <CardFooter className="pt-2 pb-4 border-t flex justify-between">
                <Button
                    id={`celebrate-btn-${post.id}`}
                    variant={hasLiked ? "secondary" : "ghost"}
                    size="sm"
                    disabled={!currentUserId || isLiking}
                    onClick={handleCelebrate}
                    className={`gap-2 rounded-full transition-all ${hasLiked ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-400' : 'hover:bg-amber-50 hover:text-amber-600'}`}
                >
                    <PartyPopper className={`w-4 h-4 ${hasLiked ? 'fill-amber-500 text-amber-500' : ''}`} />
                    Celebrate ({post.likes.length})
                </Button>
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-primary rounded-full">
                    <MessageCircle className="w-4 h-4" />
                    Discuss ({post.repliesCount || 0})
                </Button>
            </CardFooter>
        </Card>
    );
}
