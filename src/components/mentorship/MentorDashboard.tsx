'use client';

import { useState, useEffect } from 'react';
import { useAuth, useFirestore } from '@/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, MessageCircle, Clock, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

type MentorshipRequest = {
  id: string;
  studentId: string;
  studentName: string;
  studentPhotoUrl?: string;
  mentorId: string;
  message: string;
  scholarshipContext?: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Date;
};

export function MentorDashboard() {
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const [requests, setRequests] = useState<MentorshipRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (!auth?.currentUser || !db) return;
    const uid = auth.currentUser.uid;

    const q = query(
      collection(db, 'mentorship_requests'),
      where('mentorId', '==', uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      const reqs: MentorshipRequest[] = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate?.() ?? new Date(),
      } as MentorshipRequest)).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setRequests(reqs);
      setLoading(false);
    }, () => setLoading(false));

    return () => unsub();
  }, [auth?.currentUser, db]);

  const handleAction = async (reqId: string, action: 'accepted' | 'declined') => {
    if (!db) return;
    setUpdating(reqId);
    try {
      await updateDoc(doc(db, 'mentorship_requests', reqId), {
        status: action,
        updatedAt: serverTimestamp(),
      });
      toast({ title: action === 'accepted' ? 'Request Accepted! 🎉' : 'Request Declined', description: action === 'accepted' ? 'You are now connected with this student.' : 'The student will be notified.' });
    } catch (err: any) {
      toast({ title: 'Update Failed', description: err.message, variant: 'destructive' });
    } finally {
      setUpdating(null); }
  };

  const pending = requests.filter(r => r.status === 'pending');
  const accepted = requests.filter(r => r.status === 'accepted');
  const declined = requests.filter(r => r.status === 'declined');

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-amber-600">{pending.length}</p><p className="text-xs text-muted-foreground mt-0.5 font-medium">Pending</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-emerald-600">{accepted.length}</p><p className="text-xs text-muted-foreground mt-0.5 font-medium">Accepted</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-zinc-400">{declined.length}</p><p className="text-xs text-muted-foreground mt-0.5 font-medium">Declined</p></CardContent></Card>
      </div>

      {/* Pending requests */}
      {pending.length > 0 && (
        <section>
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" /> Pending Requests
          </h3>
          <div className="space-y-3">
            {pending.map(req => (
              <Card key={req.id} className="border-amber-200/50 dark:border-amber-700/20">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="w-10 h-10 border shrink-0">
                      <AvatarImage src={req.studentPhotoUrl} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">{req.studentName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{req.studentName}</p>
                        <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(req.createdAt, { addSuffix: true })}</span>
                      </div>
                      {req.scholarshipContext && (
                        <Badge variant="secondary" className="text-[10px] mt-1">🏆 {req.scholarshipContext}</Badge>
                      )}
                      <div className="mt-2 bg-muted/30 rounded-lg px-3 py-2 border border-border/40">
                        <p className="text-xs flex items-start gap-1.5">
                          <MessageCircle className="w-3 h-3 shrink-0 mt-0.5 text-muted-foreground" />
                          {req.message}
                        </p>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white flex-1"
                          disabled={updating === req.id} onClick={() => handleAction(req.id, 'accepted')}>
                          {updating === req.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          Accept
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/5 flex-1"
                          disabled={updating === req.id} onClick={() => handleAction(req.id, 'declined')}>
                          {updating === req.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                          Decline
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Accepted mentees */}
      {accepted.length > 0 && (
        <section>
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-500" /> Active Mentees
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {accepted.map(req => (
              <Card key={req.id} className="border-emerald-200/50 dark:border-emerald-700/20 bg-emerald-50/30 dark:bg-emerald-950/10">
                <CardContent className="p-3 flex items-center gap-3">
                  <Avatar className="w-9 h-9 border border-emerald-300">
                    <AvatarFallback className="bg-emerald-100 text-emerald-700 font-bold text-xs">{req.studentName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{req.studentName}</p>
                    {req.scholarshipContext && <p className="text-xs text-muted-foreground truncate">{req.scholarshipContext}</p>}
                  </div>
                  <Badge className="ml-auto shrink-0 bg-emerald-100 text-emerald-700 border-emerald-300 text-[10px]">Active</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {requests.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed rounded-xl">
          <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="font-semibold text-muted-foreground">No mentorship requests yet</p>
          <p className="text-sm text-muted-foreground mt-1">Your requests will appear here in real-time.</p>
        </div>
      )}
    </div>
  );
}
