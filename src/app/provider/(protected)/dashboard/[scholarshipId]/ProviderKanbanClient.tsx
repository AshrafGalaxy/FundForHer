'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/app/auth-provider';
import { useFirestore } from '@/firebase';
import { collection, query, where, onSnapshot, doc, getDoc, orderBy } from 'firebase/firestore';
import type { Application, ApplicationStatus, Scholarship } from '@/lib/types';
import type { ProviderProfile } from '@/server/db/user-data';
import { getProviderProfile } from '@/server/db/user-data';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, Star, Users, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { CandidateReviewModal } from '@/features/provider/CandidateReviewModal';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const COLUMNS: { id: ApplicationStatus; label: string; accent: string; pill: string }[] = [
  { id: 'new', label: 'New Applicants', accent: 'border-t-blue-500', pill: 'bg-blue-100 text-blue-700' },
  { id: 'reviewing', label: 'Under Review', accent: 'border-t-amber-500', pill: 'bg-amber-100 text-amber-700' },
  { id: 'shortlisted', label: 'Shortlisted', accent: 'border-t-purple-500', pill: 'bg-purple-100 text-purple-700' },
  { id: 'accepted', label: 'Accepted / Awarded', accent: 'border-t-green-500', pill: 'bg-green-100 text-green-700' },
  { id: 'rejected', label: 'Rejected', accent: 'border-t-zinc-400', pill: 'bg-zinc-100 text-zinc-600' },
];

export default function ProviderKanbanBoardClient() {
  const params = useParams();
  const scholarshipId = params.scholarshipId as string;
  const router = useRouter();
  const authContext = useAuth();
  const db = useFirestore();
  const user = authContext?.user;

  const [applications, setApplications] = useState<Application[]>([]);
  const [scholarship, setScholarship] = useState<Scholarship | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    if (!user || !db || !scholarshipId) return;

    let unsubscribe: (() => void) | null = null;

    const init = async () => {
      try {
        // 1. Verify provider
        const profile = await getProviderProfile(db, user.uid);
        if (!profile) { router.push('/provider/dashboard'); return; }

        // 2. Load scholarship details
        const sDoc = await getDoc(doc(db, 'scholarships', scholarshipId));
        if (!sDoc.exists() || sDoc.data().providerId !== user.uid) { router.push('/provider/dashboard'); return; }
        setScholarship({ id: sDoc.id, ...sDoc.data() } as Scholarship);

        // 3. Real-time listener on applications for this scholarship
        const appsQuery = query(
          collection(db, 'applications'),
          where('scholarshipId', '==', scholarshipId),
          orderBy('submittedAt', 'desc')   // matches field saved by apply/page.tsx
        );

        unsubscribe = onSnapshot(appsQuery, (snap) => {
          const apps: Application[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as Application));
          setApplications(apps);
          setLastUpdated(new Date());
          setLoading(false);
          // D5 FIX: Keep selectedApp in sync with live status updates
          setSelectedApp(prev => {
            if (!prev) return null;
            const updated = apps.find(a => a.id === prev.id);
            return updated ?? prev;
          });
        }, (err) => {
          console.error('Kanban listener error:', err);
          setLoading(false);
        });


      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };

    init();
    return () => { if (unsubscribe) unsubscribe(); };
  }, [user, db, scholarshipId, router]);

  const handleStatusUpdate = (appId: string, newStatus: ApplicationStatus) => {
    setApplications(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus } : a));
    // Also update the modal's app reference optimistically before onSnapshot arrives
    setSelectedApp(prev => prev?.id === appId ? { ...prev, status: newStatus } : prev);
  };


  if (loading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;
  }

  if (!scholarship) return null;

  // Normalise status: 'Submitted' (from apply form) → 'new' (kanban column)
  // This lets legacy + new applications always appear in the correct column.
  const normaliseStatus = (status: string): ApplicationStatus => {
    if (!status) return 'new';
    const s = status.toLowerCase();
    if (s === 'submitted' || s === 'new') return 'new';
    if (s === 'reviewing' || s === 'under review' || s === 'in review') return 'reviewing';
    if (s === 'shortlisted') return 'shortlisted';
    if (s === 'accepted' || s === 'awarded') return 'accepted';
    if (s === 'rejected') return 'rejected';
    return 'new'; // fallback
  };

  const columnData = COLUMNS.map(col => ({
    ...col,
    items: applications.filter(a => normaliseStatus(a.status) === col.id),
  }));

  return (
    <div className="container max-w-[1600px] mx-auto px-4 py-8 h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 shrink-0">
        <div>
          <Button asChild variant="ghost" className="-ml-4 mb-1">
            <Link href="/provider/dashboard"><ArrowLeft className="mr-2" /> Back to Dashboard</Link>
          </Button>
          <h1 className="text-2xl font-headline font-bold">{scholarship.title}</h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1 text-sm">
            <Users className="w-4 h-4" /> {applications.length} Total Applicants
            <span className="text-muted-foreground/50">·</span>
            <RefreshCw className="w-3 h-3" />
            <span className="text-xs">Live — last updated {lastUpdated.toLocaleTimeString()}</span>
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {COLUMNS.map(col => {
            const count = applications.filter(a => a.status === col.id).length;
            return count > 0 ? (
              <Badge key={col.id} className={cn('text-xs', col.pill)}>{count} {col.label}</Badge>
            ) : null;
          })}
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-6 pt-1 flex-1 items-start">
        {columnData.map(col => (
          <div key={col.id}
            className={`flex-shrink-0 w-72 rounded-xl border-t-4 ${col.accent} bg-card border border-border shadow-sm flex flex-col max-h-full`}>
            <div className="flex justify-between items-center p-3 border-b border-border/50">
              <h3 className="font-semibold text-sm">{col.label}</h3>
              <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', col.pill)}>{col.items.length}</span>
            </div>
            <div className="flex flex-col gap-2 overflow-y-auto p-2 flex-1">
              <AnimatePresence>
                {col.items.map(app => {
                  const name = app.fullName || app.resumeSnapshot?.fullName || 'Unknown';
                  const qual = app.currentEducationLevel || app.degree || app.resumeSnapshot?.qualification || '';
                  const inst = app.institution || app.resumeSnapshot?.college || '';
                  return (
                    <motion.div
                      key={app.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      onClick={() => setSelectedApp(app)}
                      className="bg-background border border-border/60 shadow-sm rounded-lg p-3 cursor-pointer hover:-translate-y-0.5 hover:shadow-md transition-all group"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                            {name.charAt(0).toUpperCase()}
                          </div>
                          <p className="font-medium text-sm truncate">{name}</p>
                        </div>
                        <div className={cn(
                          'text-[10px] px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5 shrink-0 ml-2',
                          app.matchScore >= 75 ? 'bg-green-100 text-green-700' : app.matchScore >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                        )}>
                          <Star className="w-2.5 h-2.5 fill-current" /> {app.matchScore}%
                        </div>
                      </div>
                      {qual && <p className="text-xs text-muted-foreground truncate">{qual}</p>}
                      {inst && <p className="text-xs text-muted-foreground/70 truncate">{inst}</p>}
                      {app.state && <p className="text-[10px] text-muted-foreground/60 mt-1">📍 {app.state}</p>}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {col.items.length === 0 && (
                <div className="text-center p-6 border-2 border-dashed border-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">No candidates here</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <CandidateReviewModal
        application={selectedApp}
        open={!!selectedApp}
        onOpenChange={(open) => !open && setSelectedApp(null)}
        onStatusChange={handleStatusUpdate}
      />
    </div>
  );
}
