'use client';

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Sparkles, Ghost, PenSquare, Loader2, X, Hash } from "lucide-react";
import { useAuth, useFirestore } from "@/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const PRESET_TAGS = ['Scholarships', 'Essays', 'Documents', 'Results', 'Mentorship', 'Tips', 'Internships', 'Fellowships', 'General'];

export function CreatePostModal({ onPostCreated }: { onPostCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");

  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag].slice(0, 5));
  };

  const addCustomTag = () => {
    const clean = customTag.replace(/[^a-zA-Z0-9]/g, '').trim();
    if (clean && !selectedTags.includes(clean) && selectedTags.length < 5) {
      setSelectedTags(prev => [...prev, clean]);
    }
    setCustomTag("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth?.currentUser || !db) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, "community_posts"), {
        title,
        content,
        authorId: auth.currentUser.uid,
        isAnonymous,
        tags: selectedTags,
        reactions: {},
        reactionCounts: { like: 0, love: 0, celebrate: 0, insightful: 0, support: 0, inspire: 0 },
        repliesCount: 0,
        createdAt: serverTimestamp(),
      });
      toast({ title: "Post published!", description: "Your thoughts have been shared with the community." });
      setOpen(false);
      setTitle(""); setContent(""); setIsAnonymous(false); setSelectedTags([]);
      onPostCreated();
    } catch (error) {
      toast({ title: "Error", description: "Failed to publish post.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-full shadow-lg shadow-primary/20 font-medium">
          <PenSquare className="w-4 h-4 mr-2" /> Ask a Question
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px] border-primary/20 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-headline flex items-center gap-2">
            Create a Community Post <Sparkles className="w-5 h-5 text-amber-500" />
          </DialogTitle>
          <DialogDescription>Share a milestone, ask for essay advice, or seek help with documentation.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          <div className="space-y-2">
            <Label htmlFor="post-title" className="font-semibold">Title</Label>
            <Input id="post-title" placeholder="e.g. How do I get my income certificate quickly?" required maxLength={100} value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="post-content" className="font-semibold">Details</Label>
            <Textarea id="post-content" placeholder="Add your context here..." className="min-h-[120px] resize-y" required value={content} onChange={e => setContent(e.target.value)} />
          </div>

          {/* Tag selector */}
          <div className="space-y-2">
            <Label className="font-semibold flex items-center gap-1.5"><Hash className="w-3.5 h-3.5" /> Tags (up to 5)</Label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_TAGS.map(tag => (
                <button key={tag} type="button" onClick={() => toggleTag(tag)}
                  className={cn('text-xs px-2.5 py-1 rounded-full border transition-all font-medium',
                    selectedTags.includes(tag)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-muted-foreground/20 text-muted-foreground hover:border-primary/40 hover:text-foreground bg-muted/30'
                  )}>
                  #{tag}
                </button>
              ))}
            </div>
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {selectedTags.map(t => (
                  <span key={t} className="flex items-center gap-1 text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-medium">
                    #{t}
                    <button type="button" onClick={() => setSelectedTags(p => p.filter(x => x !== t))}>
                      <X className="w-3 h-3 hover:text-destructive" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {selectedTags.length < 5 && (
              <div className="flex gap-2 mt-1">
                <Input className="h-8 text-xs" placeholder="Custom tag..." value={customTag}
                  onChange={e => setCustomTag(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag(); } }} />
                <Button type="button" variant="outline" size="sm" className="h-8 px-3 text-xs shrink-0" onClick={addCustomTag} disabled={!customTag.trim()}>Add</Button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between bg-secondary/50 p-3 border rounded-xl">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2"><Ghost className="w-4 h-4 text-primary" /> Ask Anonymously</Label>
              <p className="text-xs text-muted-foreground">Hide your name and avatar from this post.</p>
            </div>
            <Switch checked={isAnonymous} onCheckedChange={setIsAnonymous} />
          </div>

          <DialogFooter className="border-t pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting || !title || !content}>
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Posting...</> : 'Publish to Hub'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
