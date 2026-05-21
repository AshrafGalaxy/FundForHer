'use client';

import { useState, useEffect, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Send, Loader2, ShieldCheck, MessageCircle } from 'lucide-react';
import {
  collection, onSnapshot, addDoc, doc, increment,
  updateDoc, orderBy, query, serverTimestamp,
} from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import type { CommunityPost } from './PostCard';

type Reply = {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorPhotoUrl?: string;
  isAnonymous: boolean;
  isVerifiedScholar?: boolean;
  createdAt: Date;
  likes: string[];
};

interface Props {
  post: CommunityPost;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId?: string;
}

export function ThreadDrawer({ post, open, onOpenChange, currentUserId }: Props) {
  const db = useFirestore();
  const { toast } = useToast();
  const [replies, setReplies] = useState<Reply[]>([]);
  const [replyText, setReplyText] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!db || !open) return;
    const q = query(
      collection(db, 'community_posts', post.id, 'replies'),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setReplies(snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate?.() ?? new Date(),
        likes: d.data().likes ?? [],
      } as Reply)));
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    return () => unsub();
  }, [db, post.id, open]);

  const handleSubmit = async () => {
    if (!db || !currentUserId || !replyText.trim()) return;
    setIsSending(true);
    try {
      await addDoc(collection(db, 'community_posts', post.id, 'replies'), {
        content: replyText.trim(),
        authorId: currentUserId,
        authorName: isAnonymous ? 'Anonymous' : 'You',
        isAnonymous,
        isVerifiedScholar: false,
        createdAt: serverTimestamp(),
        likes: [],
      });
      await updateDoc(doc(db, 'community_posts', post.id), {
        repliesCount: increment(1),
      });
      setReplyText('');
    } catch (err: any) {
      toast({ title: 'Failed to post reply', description: err.message, variant: 'destructive' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col p-0 bg-background">
        <SheetHeader className="p-4 border-b bg-muted/20 shrink-0">
          <SheetTitle className="font-headline text-lg line-clamp-1">{post.title}</SheetTitle>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <MessageCircle className="w-3.5 h-3.5" /> {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
          </p>
        </SheetHeader>

        {/* Original post preview */}
        <div className="px-4 py-3 border-b bg-muted/10 shrink-0">
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{post.content}</p>
        </div>

        <Separator />

        {/* Replies */}
        <ScrollArea className="flex-1 px-4">
          <div className="py-4 space-y-4">
            <AnimatePresence initial={false}>
              {replies.length === 0 && (
                <div className="text-center py-12">
                  <MessageCircle className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No replies yet. Be the first to discuss!</p>
                </div>
              )}
              {replies.map((reply) => (
                <motion.div
                  key={reply.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="flex gap-3"
                >
                  <Avatar className="w-8 h-8 border shrink-0 mt-0.5">
                    <AvatarImage src={reply.isAnonymous ? undefined : reply.authorPhotoUrl} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary font-bold">
                      {reply.isAnonymous ? 'A' : reply.authorName?.[0] ?? '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 bg-muted/30 rounded-2xl rounded-tl-sm px-3 py-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold">
                        {reply.isAnonymous ? 'Anonymous' : reply.authorName}
                        {reply.authorId === currentUserId && !reply.isAnonymous && (
                          <span className="text-[9px] text-muted-foreground ml-1">(you)</span>
                        )}
                      </span>
                      {reply.isVerifiedScholar && <ShieldCheck className="w-3 h-3 text-emerald-500 shrink-0" />}
                      <span className="text-[10px] text-muted-foreground ml-auto">
                        {formatDistanceToNow(reply.createdAt, { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{reply.content}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        {/* Reply Composer */}
        <div className="p-4 border-t bg-card shrink-0 space-y-3">
          <Textarea
            placeholder="Write a reply..."
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            className="resize-none text-sm min-h-[80px]"
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit();
            }}
          />
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Switch id="anon-reply" checked={isAnonymous} onCheckedChange={setIsAnonymous} />
              <Label htmlFor="anon-reply" className="text-xs text-muted-foreground cursor-pointer">Reply anonymously</Label>
            </div>
            <Button
              size="sm" onClick={handleSubmit}
              disabled={!currentUserId || !replyText.trim() || isSending}
              className="gap-2"
            >
              {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Post Reply
            </Button>
          </div>
          {!currentUserId && <p className="text-xs text-muted-foreground text-center">Log in to join the discussion.</p>}
        </div>
      </SheetContent>
    </Sheet>
  );
}
