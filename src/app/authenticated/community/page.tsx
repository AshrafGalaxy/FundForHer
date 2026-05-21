'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth, useFirestore } from '@/firebase';
import {
  collection, query, orderBy, getDoc,
  doc, onSnapshot, where, limit,
} from 'firebase/firestore';
import { Loader2, Users, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreatePostModal } from '@/components/community/CreatePostModal';
import { PostCard, CommunityPost, ReactionType } from '@/components/community/PostCard';

const ALL_TAGS = [
  'All', 'Scholarships', 'Essays', 'Documents', 'Results',
  'Mentorship', 'Tips', 'Internships', 'Fellowships', 'General',
];

export default function CommunityHubPage() {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [enrichedPosts, setEnrichedPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTag, setActiveTag] = useState('All');

  const auth = useAuth();
  const db = useFirestore();

  // ── D1 FIX: use a stable mutable ref for author cache instead of useState ──
  // Using useState caused `enrichWithAuthors` to depend on `authorCache` which
  // was updated inside it → infinite re-render loop on every author fetch.
  const authorCacheRef = useRef<Record<string, { name: string; photo?: string }>>({});
  const scholarCacheRef = useRef<Set<string>>(new Set());
  const enrichmentPending = useRef(false);

  // Fetch awarded userIds once (for Scholar badge)
  useEffect(() => {
    if (!db) return;
    const fetchScholars = async () => {
      try {
        // Use onSnapshot so new acceptances appear live
        const q = query(collection(db, 'applications'), where('status', '==', 'accepted'));
        const snap = await import('firebase/firestore').then(m => m.getDocs(q));
        snap.docs.forEach(d => {
          const uid = d.data().studentId as string;
          if (uid) scholarCacheRef.current.add(uid);
        });
      } catch { /* ignore */ }
    };
    fetchScholars();
  }, [db]);

  // Batch-resolve unique authorIds — writes to ref, not state (no re-render loop)
  const enrichPosts = async (raw: CommunityPost[]) => {
    if (!db || enrichmentPending.current) return;
    enrichmentPending.current = true;

    const uncachedIds = [
      ...new Set(raw.filter(p => !p.isAnonymous).map(p => p.authorId)),
    ].filter(id => !authorCacheRef.current[id]);

    await Promise.all(uncachedIds.map(async uid => {
      try {
        const snap = await getDoc(doc(db, 'users', uid));
        if (snap.exists()) {
          const d = snap.data();
          authorCacheRef.current[uid] = {
            name: d.fullName || d.displayName || 'User',
            photo: d.photoURL,
          };
        }
      } catch { /* skip */ }
    }));

    enrichmentPending.current = false;

    // Now merge cache into posts and update enriched state once
    setEnrichedPosts(raw.map(p => ({
      ...p,
      authorName: p.isAnonymous ? undefined : (authorCacheRef.current[p.authorId]?.name ?? p.authorName),
      authorPhotoUrl: p.isAnonymous ? undefined : (authorCacheRef.current[p.authorId]?.photo ?? p.authorPhotoUrl),
      isVerifiedScholar: scholarCacheRef.current.has(p.authorId),
    })));
  };

  useEffect(() => {
    if (!db) return;

    const q = query(
      collection(db, 'community_posts'),
      orderBy('createdAt', 'desc'),
      limit(80),
    );

    const unsub = onSnapshot(q, async snap => {
      const raw: CommunityPost[] = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate?.() ?? new Date(),
        tags: d.data().tags ?? [],
        reactions: d.data().reactions ?? {},
        reactionCounts: d.data().reactionCounts ?? {},
        repliesCount: d.data().repliesCount ?? 0,
        likes: d.data().likes ?? [],
      } as unknown as CommunityPost));


      setPosts(raw);
      setLoading(false);
      await enrichPosts(raw);
    });

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db]);

  const visiblePosts = activeTag === 'All'
    ? enrichedPosts
    : enrichedPosts.filter(p => p.tags?.includes(activeTag));

  return (
    <div className="container max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-headline font-bold flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl"><Users className="w-7 h-7 text-primary" /></div>
            Community Hub
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">Ask questions, celebrate wins, share knowledge — real-time.</p>
        </div>
        <CreatePostModal onPostCreated={() => {}} />
      </div>

      {/* Hashtag Filter Bar */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
        {ALL_TAGS.map(tag => (
          <button
            key={tag}
            onClick={() => setActiveTag(tag)}
            className={`shrink-0 flex items-center gap-1 text-xs font-semibold px-4 py-2 rounded-full border transition-all ${
              activeTag === tag
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
            }`}
          >
            {tag !== 'All' && <Hash className="w-3 h-3" />}
            {tag}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Feed */}
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
          ) : visiblePosts.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed rounded-xl">
              <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="font-semibold text-muted-foreground">
                {activeTag === 'All' ? 'No posts yet.' : `No posts in #${activeTag} yet.`}
              </p>
              <p className="text-sm text-muted-foreground mt-1">Be the first to share!</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {visiblePosts.map((post, i) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: i < 5 ? i * 0.04 : 0 }}
                >
                  <PostCard
                    post={post}
                    currentUserId={auth?.currentUser?.uid}
                    onReact={(_postId: string, _reaction: ReactionType | null) => {
                      // onSnapshot propagates actual reaction updates — no local state needed
                    }}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="hidden lg:flex flex-col gap-4">
          <div className="bg-card border rounded-xl p-4 shadow-sm">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Hash className="w-4 h-4 text-primary" /> Trending Tags
            </h3>
            <div className="space-y-1.5">
              {ALL_TAGS.filter(t => t !== 'All').map(tag => {
                const count = posts.filter(p => p.tags?.includes(tag)).length;
                return count > 0 ? (
                  <button
                    key={tag}
                    onClick={() => setActiveTag(tag)}
                    className="w-full flex justify-between items-center text-xs text-muted-foreground hover:text-primary py-1 transition-colors"
                  >
                    <span>#{tag}</span>
                    <span className="bg-muted px-2 py-0.5 rounded-full font-medium">{count}</span>
                  </button>
                ) : null;
              })}
            </div>
          </div>

          <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-4">
            <h3 className="font-semibold text-sm mb-2">🎓 Mentorship Hub</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Won a scholarship? Request a mentor to guide your next steps.
            </p>
            <a href="/authenticated/mentorship" className="text-xs font-semibold text-primary hover:underline">
              → Visit Mentorship Hub
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
