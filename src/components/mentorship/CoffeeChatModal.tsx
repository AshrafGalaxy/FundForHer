import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Coffee, Loader2, Sparkles, Send } from "lucide-react";
import { useAuth, useFirestore } from "@/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

export function CoffeeChatModal({ mentorId, mentorName }: { mentorId: string, mentorName: string }) {
    const [open, setOpen] = useState(false);
    const [pitch, setPitch] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const auth = useAuth();
    const db = useFirestore();
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth?.currentUser || !db) return;

        setSubmitting(true);
        try {
            await addDoc(collection(db, "mentorship_requests"), {
                menteeId: auth.currentUser.uid,
                mentorId: mentorId,
                pitch,
                status: 'Pending', // Pending -> Accepted -> Completed
                createdAt: serverTimestamp(),
            });

            toast({ title: "Request Sent!", description: `We have notified ${mentorName} of your request.` });
            setOpen(false);
            setPitch("");

        } catch (error) {
            console.error("Error sending request: ", error);
            toast({ title: "Error", description: "Failed to send request.", variant: "destructive" });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-500/20 rounded-full font-semibold">
                    <Coffee className="w-4 h-4 mr-2" /> Request Coffee Chat
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px] border-amber-200/50 dark:border-amber-900/50">
                <DialogHeader>
                    <DialogTitle className="text-xl font-headline flex items-center gap-2">
                        15-Min Coffee Chat <Sparkles className="w-5 h-5 text-amber-500" />
                    </DialogTitle>
                    <DialogDescription>
                        Send a brief message to <strong>{mentorName}</strong> explaining what you&apos;d like to discuss or drop your Calendly link.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                    <div className="space-y-2 relative">
                        <Label htmlFor="pitch" className="font-semibold">Your Pitch</Label>
                        <Textarea
                            id="pitch"
                            placeholder="Hi! I'm applying for the Women in Tech scholarship and would love to hear how you approached the leadership essay..."
                            className="min-h-[120px] resize-none bg-card"
                            required
                            maxLength={300}
                            value={pitch}
                            onChange={(e) => setPitch(e.target.value)}
                        />
                        <span className="absolute bottom-3 right-3 text-xs text-muted-foreground bg-card/80 px-1">
                            {pitch.length}/300
                        </span>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white rounded-full" disabled={submitting || pitch.length < 10}>
                            {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</> : <><Send className="w-4 h-4 mr-2" /> Send Request</>}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
