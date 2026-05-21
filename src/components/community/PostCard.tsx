'use client';

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, Pin, CheckCircle2, ShieldCheck, MoreVertical, Flag } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useFirestore } from "@/firebase";
import { doc, updateDoc, deleteField } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ThreadDrawer } from "./ThreadDrawer";
import { PublicProfileModal } from "./PublicProfileModal";

export const REACTIONS = [
  { id: 'like', emoji: '👍', label: 'Like', color: 'text-blue-500' },
  { id: 'love', emoji: '❤️', label: 'Love', color: 'text-rose-500' },
  { id: 'celebrate', emoji: '🎉', label: 'Celebrate', color: 'text-amber-500' },
  { id: 'insightful', emoji: '💡', label: 'Insightful', color: 'text-yellow-500' },
  { id: 'support', emoji: '👏', label: 'Support', color: 'text-emerald-500' },
  { id: 'inspire', emoji: '🌟', label: 'Inspire', color: 'text-purple-500' },
] as const;

export type ReactionType = typeof REACTIONS[number]['id'];

export type CommunityPost = {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName?: string;
  authorPhotoUrl?: string;
  isAnonymous: boolean;
  isVerifiedScholar?: boolean;
  tags?: string[];
  reactions?: Record<string, ReactionType>;
  reactionCounts?: Record<ReactionType, number>;
  repliesCount?: number;
  createdAt: Date;
  pinnedReply?: {
    authorName: string;
    content: string;
    isVerifiedScholar?: boolean;
  };
};

function ReactionSummary({ counts }: { counts?: Record<string, number> }) {
  if (!counts) return null;
  const sorted = REACTIONS
    .map(r => ({ ...r, count: counts[r.id] ?? 0 }))
    .filter(r => r.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
  if (!sorted.length) return null;
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      {sorted.map(r => <span key={r.id}>{r.emoji}</span>)}
      <span>{total}</span>
    </span>
  );
}

export function PostCard({
  post, currentUserId, onReact, onOpenThread,
}: {
  post: CommunityPost;
  currentUserId?: string;
  onReact: (postId: string, reaction: ReactionType | null) => void;
  onOpenThread?: (post: CommunityPost) => void;
}) {
  const db = useFirestore();
  const { toast } = useToast();
  const [showPicker, setShowPicker] = useState(false);
  const [isReacting, setIsReacting] = useState(false);
  const [threadOpen, setThreadOpen] = useState(false);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const myReaction = currentUserId ? (post.reactions?.[currentUserId] ?? null) : null;
  const myReactionData = REACTIONS.find(r => r.id === myReaction);

  const handleReact = async (reactionId: ReactionType) => {
    if (!currentUserId || !db || isReacting) return;
    setIsReacting(true);
    setShowPicker(false);
    try {
      const isSame = myReaction === reactionId;
      const postRef = doc(db, 'community_posts', post.id);
      const oldCounts = { ...(post.reactionCounts ?? {}) };
      const newCounts = { ...oldCounts };

      if (isSame) {
        // Toggle off: remove reaction
        await updateDoc(postRef, {
          [`reactions.${currentUserId}`]: deleteField(),
          [`reactionCounts.${reactionId}`]: Math.max(0, (newCounts[reactionId] ?? 1) - 1),
        });
        onReact(post.id, null);
      } else {
        // Switch/new reaction
        const updates: Record<string, any> = {
          [`reactions.${currentUserId}`]: reactionId,
          [`reactionCounts.${reactionId}`]: (newCounts[reactionId] ?? 0) + 1,
        };
        if (myReaction && newCounts[myReaction]) {
          updates[`reactionCounts.${myReaction}`] = Math.max(0, newCounts[myReaction] - 1);
        }
        await updateDoc(postRef, updates);
        onReact(post.id, reactionId);
      }
    } catch (e) {
      console.error('Reaction failed', e);
    } finally {
      setIsReacting(false);
    }
  };

  const handleReport = async () => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'community_posts', post.id), { isFlagged: true });
      toast({ title: 'Reported', description: 'Our moderation team will review this content.' });
    } catch {
      toast({ title: 'Error', description: 'Could not flag post.', variant: 'destructive' });
    }
  };

  const openProfile = () => {
    if (!post.isAnonymous && post.authorId) setProfileUserId(post.authorId);
  };

  return (
    <>
      <Card className="hover:border-primary/30 transition-all overflow-hidden shadow-sm group">
        <CardHeader className="pb-3 border-b bg-muted/20">
          <div className="flex justify-between items-start gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar className="w-10 h-10 border-2 border-background shadow-sm">
                  <AvatarImage src={post.isAnonymous ? undefined : post.authorPhotoUrl} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                    {post.isAnonymous ? 'A' : (post.authorName?.[0] || '?')}
                  </AvatarFallback>
                </Avatar>
                {!post.isAnonymous && post.isVerifiedScholar && (
                  <motion.div className="absolute -inset-1.5 rounded-full border-2 border-emerald-400 opacity-60 pointer-events-none"
                    animate={{ rotate: 360, scale: [1, 1.05, 1] }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'linear' }} />
                )}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={openProfile}
                    className={cn('font-semibold text-sm', !post.isAnonymous && 'hover:text-primary hover:underline cursor-pointer transition-colors')}
                    disabled={post.isAnonymous}
                  >
                    {post.isAnonymous ? 'Anonymous Applicant' : post.authorName}
                  </button>
                  {!post.isAnonymous && post.isVerifiedScholar && (
                    <span className="flex items-center gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border border-emerald-500/20">
                      <ShieldCheck className="w-3 h-3" /> Scholar
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{formatDistanceToNow(post.createdAt, { addSuffix: true })}</p>
              </div>
            </div>
            {currentUserId && currentUserId !== post.authorId && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted/50">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={handleReport} className="text-destructive focus:text-destructive cursor-pointer">
                    <Flag className="w-4 h-4 mr-2" /> Report Post
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-3">
          <h3 className="text-lg font-headline font-bold leading-tight">{post.title}</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed line-clamp-5">{post.content}</p>

          {/* Hashtags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {post.tags.map(tag => (
                <span key={tag} className="text-xs text-primary font-medium bg-primary/8 px-2 py-0.5 rounded-full border border-primary/20 hover:bg-primary/15 cursor-pointer transition-colors">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Pinned Reply */}
          {post.pinnedReply && (
            <div className="bg-emerald-50/60 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2 opacity-10"><CheckCircle2 className="w-16 h-16 text-emerald-500" /></div>
              <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mb-1.5 uppercase tracking-wide">
                <Pin className="w-3 h-3" /> Pinned Reply
              </p>
              <div className="flex gap-2">
                <div className="w-0.5 bg-emerald-300 dark:bg-emerald-700 rounded-full shrink-0" />
                <div>
                  <p className="text-xs font-semibold flex items-center gap-1">
                    {post.pinnedReply.authorName}
                    {post.pinnedReply.isVerifiedScholar && <ShieldCheck className="w-3 h-3 text-emerald-500" />}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{post.pinnedReply.content}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="pt-2 pb-3 border-t flex items-center justify-between gap-2">
          {/* Reaction Area */}
          <div className="flex items-center gap-2">
            {/* Reaction button with hover picker */}
            <div className="relative"
              onMouseEnter={() => { clearTimeout(hoverTimeout.current); setShowPicker(true); }}
              onMouseLeave={() => { hoverTimeout.current = setTimeout(() => setShowPicker(false), 300); }}
            >
              <Button
                variant={myReaction ? 'secondary' : 'ghost'}
                size="sm"
                disabled={!currentUserId || isReacting}
                onClick={() => myReaction ? handleReact(myReaction) : setShowPicker(p => !p)}
                className={cn('gap-1.5 rounded-full h-8 px-3 text-xs font-medium transition-all',
                  myReaction && 'bg-primary/10 border border-primary/20'
                )}
              >
                <span className="text-sm">{myReactionData?.emoji ?? '👍'}</span>
                <span className={myReactionData?.color ?? 'text-muted-foreground'}>
                  {myReactionData?.label ?? 'Like'}
                </span>
              </Button>

              {/* Emoji Picker Popup */}
              <AnimatePresence>
                {showPicker && currentUserId && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.9 }}
                    transition={{ duration: 0.15 }}
                    className="absolute bottom-full left-0 mb-2 bg-card border border-border rounded-2xl shadow-xl px-2 py-1.5 flex gap-1 z-50"
                    onMouseEnter={() => clearTimeout(hoverTimeout.current)}
                    onMouseLeave={() => { hoverTimeout.current = setTimeout(() => setShowPicker(false), 300); }}
                  >
                    {REACTIONS.map(r => (
                      <button
                        key={r.id}
                        onClick={() => handleReact(r.id)}
                        title={r.label}
                        className={cn(
                          'text-xl p-1.5 rounded-xl hover:scale-125 transition-transform',
                          myReaction === r.id && 'bg-primary/10 scale-110 ring-2 ring-primary/30'
                        )}
                      >
                        {r.emoji}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <ReactionSummary counts={post.reactionCounts} />
          </div>

          {/* Discuss Thread Button */}
          <Button
            variant="ghost" size="sm"
            className="gap-1.5 text-muted-foreground hover:text-primary rounded-full h-8 px-3 text-xs"
            onClick={() => setThreadOpen(true)}
          >
            <MessageCircle className="w-4 h-4" />
            {(post.repliesCount ?? 0) > 0 ? `${post.repliesCount} Replies` : 'Discuss'}
          </Button>
        </CardFooter>
      </Card>

      {/* Thread Drawer */}
      <ThreadDrawer post={post} open={threadOpen} onOpenChange={setThreadOpen} currentUserId={currentUserId} />

      {/* Public Profile Modal */}
      {profileUserId && (
        <PublicProfileModal userId={profileUserId} open={!!profileUserId} onOpenChange={(o) => !o && setProfileUserId(null)} />
      )}
    </>
  );
}
