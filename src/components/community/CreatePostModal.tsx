import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Sparkles, Ghost, PenSquare, Loader2 } from "lucide-react";
import { useAuth, useFirestore } from "@/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

export function CreatePostModal({ onPostCreated }: { onPostCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();

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
        likes: [],
        createdAt: serverTimestamp(),
      });

      toast({ title: "Post published!", description: "Your thoughts have been shared with the community." });
      setOpen(false);
      setTitle("");
      setContent("");
      setIsAnonymous(false);
      onPostCreated();

    } catch (error) {
      console.error("Error adding post: ", error);
      toast({ title: "Error", description: "Failed to publish post.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-full shadow-lg shadow-primary/20 bg-theme-600 hover:bg-theme-700 text-white font-medium">
          <PenSquare className="w-4 h-4 mr-2" /> Ask a Question
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px] border-primary/20 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-headline flex items-center gap-2">
            Create a Community Post <Sparkles className="w-5 h-5 text-amber-500" />
          </DialogTitle>
          <DialogDescription>
            Share a milestone, ask for advice on essays, or seek help with documentation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="font-semibold">Title</Label>
            <Input
              id="title"
              placeholder="e.g. How do I get my income certificate quickly?"
              required
              maxLength={100}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content" className="font-semibold">Details</Label>
            <Textarea
              id="content"
              placeholder="Add your context here..."
              className="min-h-[150px] resize-y"
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between bg-secondary/50 p-4 border rounded-xl">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2 text-base">
                <Ghost className="w-4 h-4 text-primary" /> Ask Anonymously
              </Label>
              <p className="text-xs text-muted-foreground">Hide your name and avatar from this post.</p>
            </div>
            <Switch checked={isAnonymous} onCheckedChange={setIsAnonymous} />
          </div>

          <DialogFooter className="border-t pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting || !title || !content}>
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Posting...</> : "Publish to Hub"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
