'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, Send, AlertCircle } from 'lucide-react';
import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useAuth } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

interface WonApplication {
  id: string;
  scholarshipId: string;
  scholarshipTitle?: string;
}

interface Props {
  mentor: { uid: string; fullName: string; photoURL?: string };
  wonApplications: WonApplication[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MentorshipRequestModal({ mentor, wonApplications, open, onOpenChange }: Props) {
  const db = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();

  const [message, setMessage] = useState('');
  const [selectedAppId, setSelectedAppId] = useState(wonApplications[0]?.id ?? '');
  const [isSending, setIsSending] = useState(false);
  const [alreadyRequested, setAlreadyRequested] = useState(false);

  useEffect(() => {
    if (!db || !auth?.currentUser || !mentor.uid || !open) return;
    // Check if request already exists for this student+mentor pair
    getDocs(
      query(
        collection(db, 'mentorship_requests'),
        where('studentId', '==', auth.currentUser.uid),
        where('mentorId', '==', mentor.uid)
      )
    ).then(snap => setAlreadyRequested(!snap.empty));
  }, [db, auth?.currentUser, mentor.uid, open]);

  const selectedApp = wonApplications.find(a => a.id === selectedAppId);

  const handleSubmit = async () => {
    if (!db || !auth?.currentUser || !message.trim()) return;
    setIsSending(true);
    try {
      await addDoc(collection(db, 'mentorship_requests'), {
        studentId: auth.currentUser.uid,
        studentName: auth.currentUser.displayName || 'Student',
        studentPhotoUrl: auth.currentUser.photoURL || null,
        mentorId: mentor.uid,
        message: message.trim(),
        scholarshipContext: selectedApp?.scholarshipTitle || selectedApp?.scholarshipId || 'Scholarship win',
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast({ title: 'Request Sent! 🎉', description: `Your mentorship request has been sent to ${mentor.fullName}.` });
      onOpenChange(false);
      setMessage('');
    } catch (err: any) {
      toast({ title: 'Failed to send', description: err.message, variant: 'destructive' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline text-xl">Request Mentorship</DialogTitle>
          <DialogDescription>Send a personalised message to your chosen mentor.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Mentor info */}
          <div className="flex items-center gap-3 bg-muted/30 border rounded-xl px-4 py-3">
            <Avatar className="w-10 h-10 border">
              <AvatarFallback className="bg-primary/10 text-primary font-bold">{mentor.fullName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-sm">{mentor.fullName}</p>
              <p className="text-xs text-muted-foreground">Verified Scholar Mentor</p>
            </div>
          </div>

          {alreadyRequested ? (
            <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-700/30 rounded-xl p-4 text-sm text-amber-800 dark:text-amber-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              You've already sent a mentorship request to this mentor. Please wait for their response.
            </div>
          ) : (
            <>
              {/* Scholarship context */}
              {wonApplications.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Scholarship Context</Label>
                  <Select value={selectedAppId} onValueChange={setSelectedAppId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your won scholarship" />
                    </SelectTrigger>
                    <SelectContent>
                      {wonApplications.map(a => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.scholarshipTitle || a.scholarshipId}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">This will be shared with the mentor to add context.</p>
                </div>
              )}

              {/* Message */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Your Message <span className="text-muted-foreground font-normal">({message.length}/300)</span>
                </Label>
                <Textarea
                  placeholder={`Hi ${mentor.fullName.split(' ')[0]}, I've been accepted into a scholarship and would love your guidance on...`}
                  value={message}
                  onChange={e => setMessage(e.target.value.slice(0, 300))}
                  className="min-h-[120px] resize-none text-sm"
                />
              </div>

              <Button
                className="w-full gap-2"
                onClick={handleSubmit}
                disabled={!message.trim() || isSending}
              >
                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send Mentorship Request
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
