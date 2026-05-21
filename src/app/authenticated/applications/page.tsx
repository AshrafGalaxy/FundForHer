'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth, useFirestore } from '@/firebase';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, GraduationCap, Building2, Calendar, IndianRupee, PieChart, Info, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { TimelineStatus } from '@/components/applications/TimelineStatus';
import { PivotRecommendations } from '@/components/applications/PivotRecommendations';
import { BankDetailsForm } from '@/components/applications/BankDetailsForm';
import { DisbursementTracker, DisbursementStatus } from '@/components/applications/DisbursementTracker';
import { ApplicationDetailModal } from '@/components/applications/ApplicationDetailModal';
import { formatDistanceToNow, format } from 'date-fns';
import type { ApplicationStatus, StatusHistoryEntry } from '@/lib/types';

// Canonical lowercase status values → display labels
export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  new:         'Submitted',
  reviewing:   'Under Review',
  shortlisted: 'Shortlisted',
  accepted:    'Awarded',
  rejected:    'Not Selected',
};

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  new:         'bg-primary',
  reviewing:   'bg-amber-400',
  shortlisted: 'bg-indigo-500',
  accepted:    'bg-emerald-500',
  rejected:    'bg-destructive',
};

type JoinedApplication = {
  id: string;
  scholarshipId: string;
  status: ApplicationStatus;
  appliedAt: Date | null;
  essay: string;
  scholarshipTitle: string;
  provider: string;
  providerLogo?: string;
  amount: number;
  matchScore: number;
  fieldOfStudy?: string;
  disbursementStatus?: DisbursementStatus;
  providerComment?: string | null;
  lastStatusUpdate: Date | null;        // never undefined — always null when missing
  statusHistory?: StatusHistoryEntry[];
};


export default function ApplicationsTrackerPage() {
  const [applications, setApplications] = useState<JoinedApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<JoinedApplication | null>(null);
  const schCache = useRef<Record<string, { amount: number; provider: string; providerLogo?: string }>>({});
  const auth = useAuth();
  const db = useFirestore();

  useEffect(() => {
    if (!auth?.currentUser || !db) return;
    const uid = auth.currentUser.uid;

    // BUG FIX B4: query uses `studentId` not `userId`
    const q = query(collection(db, 'applications'), where('studentId', '==', uid));

    const unsub = onSnapshot(q, async (snap) => {
      // Batch-fetch unique scholarshipIds to avoid N+1
      const uniqueSchIds = [...new Set(snap.docs.map(d => d.data().scholarshipId).filter(Boolean))];
      const uncachedIds = uniqueSchIds.filter(id => !schCache.current[id]);

      await Promise.all(uncachedIds.map(async schId => {
        try {
          const schSnap = await getDoc(doc(db, 'scholarships', schId));
          if (schSnap.exists()) {
            const d = schSnap.data();
            schCache.current[schId] = {
              amount: d.amount || d.rewardAmount?.amount || 0,
              provider: d.provider || 'Unknown Provider',
              providerLogo: d.providerLogo,
            };
          }
        } catch { /* skip failed scholarship fetches */ }
      }));

      const joined: JoinedApplication[] = snap.docs.map(appDoc => {
        const d = appDoc.data();
        const sch = schCache.current[d.scholarshipId] ?? { amount: 0, provider: 'Unknown Provider' };
        const status = (d.status as ApplicationStatus) || 'new';

        // Safe toDate handler
        const toDate = (ts: any): Date | null => {
          if (!ts) return null;
          if (ts instanceof Date) return ts;
          if (typeof ts.toDate === 'function') return ts.toDate();
          return null;
        };

        const statusHistory: StatusHistoryEntry[] | undefined = d.statusHistory?.map((h: any) => ({
          ...h,
          timestamp: toDate(h.timestamp),
        }));

        let disbursementStatus: DisbursementStatus | undefined;
        if (status === 'accepted') disbursementStatus = 'Awaiting Details';

        return {
          id: appDoc.id,
          scholarshipId: d.scholarshipId,
          status,
          appliedAt: toDate(d.appliedAt || d.submittedAt),
          essay: d.personalStatement || d.essay || '',
          scholarshipTitle: d.scholarshipTitle || 'Scholarship',
          provider: d.provider || sch.provider,
          providerLogo: sch.providerLogo,
          amount: sch.amount,
          // BUG FIX B5: use real matchScore from Firestore, not random
          matchScore: d.matchScore ?? 0,
          fieldOfStudy: d.fieldOfStudy || d.major,
          disbursementStatus,
          providerComment: d.providerComment ?? null,
          lastStatusUpdate: toDate(d.lastStatusUpdate) ?? null,
          statusHistory,

        };
      }).sort((a, b) => {
        if (!a.appliedAt || !b.appliedAt) return 0;
        return b.appliedAt.getTime() - a.appliedAt.getTime();
      });

      setApplications(joined);
      setLoading(false);
    }, err => {
      console.error('Application onSnapshot error:', err);
      setLoading(false);
    });

    return () => unsub();
  }, [auth?.currentUser, db]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-muted-foreground animate-pulse text-sm font-medium">Loading your applications...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-headline font-bold text-foreground tracking-tight flex items-center gap-3">
            <GraduationCap className="w-8 h-8 text-primary" />
            My Applications
          </h1>
          <p className="text-muted-foreground mt-2 text-sm max-w-xl">
            Track real-time status updates, view provider feedback, and discover pivot opportunities.
          </p>
        </div>
      </div>

      {applications.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed border-2 bg-secondary/20">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <PieChart className="w-8 h-8 text-primary" />
          </div>
          <p className="text-xl font-headline font-semibold">No Applications Yet</p>
          <p className="max-w-md mt-2 mb-6 text-sm text-muted-foreground">
            You haven&apos;t applied to any scholarships yet. Explore the dashboard to find matching opportunities.
          </p>
          <Button size="lg" className="rounded-full shadow-lg shadow-primary/20" asChild>
            <Link href="/authenticated/dashboard">Explore Scholarships</Link>
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {applications.map((app, index) => {
            const displayStatus = STATUS_LABELS[app.status] ?? app.status;
            const statusColor = STATUS_COLORS[app.status] ?? 'bg-primary';
            return (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08, duration: 0.4 }}
              >
                <Card className="overflow-hidden border-border/60 hover:border-primary/30 transition-all shadow-sm group relative">
                  {/* Status Color Banner */}
                  <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${statusColor}`} />

                  <CardContent className="p-0">
                    <div className="p-6 md:p-8 flex flex-col xl:flex-row gap-8">
                      {/* Left Column: Details */}
                      <div className="flex-1 space-y-4">
                        <div>
                          <p className="text-sm font-semibold text-primary mb-1 tracking-wide uppercase">{app.provider}</p>
                          <h2 className="text-2xl font-headline font-bold text-foreground pr-4">{app.scholarshipTitle}</h2>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          {app.amount > 0 && (
                            <Badge variant="secondary" className="flex items-center gap-1.5 px-3 py-1">
                              <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="font-semibold">₹{app.amount.toLocaleString('en-IN')}</span>
                            </Badge>
                          )}
                          {app.appliedAt && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1.5 bg-background border px-2.5 py-1 rounded-md">
                              <Calendar className="w-3.5 h-3.5" />
                              Applied {formatDistanceToNow(app.appliedAt, { addSuffix: true })}
                            </span>
                          )}
                          {app.lastStatusUpdate && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1.5 bg-background border px-2.5 py-1 rounded-md">
                              <Info className="w-3.5 h-3.5 text-primary" />
                              Updated {formatDistanceToNow(app.lastStatusUpdate, { addSuffix: true })}
                            </span>
                          )}
                          {app.matchScore > 0 && (
                            <div className="text-xs font-semibold px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                              <PieChart className="w-3.5 h-3.5" /> {app.matchScore}% Match
                            </div>
                          )}
                        </div>

                        {/* Provider comment preview */}
                        {app.providerComment && (
                          <div className="text-xs bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700/30 p-3 rounded-lg flex items-start gap-2">
                            <MessageSquare className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-semibold text-amber-800 dark:text-amber-300 mb-0.5">Provider Feedback</p>
                              <p className="text-amber-700/80 dark:text-amber-400/80 line-clamp-2">{app.providerComment}</p>
                            </div>
                          </div>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 text-xs"
                          onClick={() => setSelectedApp(app)}
                        >
                          <Info className="w-3.5 h-3.5" /> View Full Timeline & Details
                        </Button>
                      </div>

                      {/* Right Column: Timeline */}
                      <div className="xl:w-1/2 bg-muted/20 rounded-xl border p-4 sm:p-6 shadow-inner flex flex-col justify-center">
                        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          Track Status
                          <Badge className="ml-auto text-[10px]" variant="secondary">{displayStatus}</Badge>
                        </h3>

                        <TimelineStatus currentStatus={app.status} />

                        {app.status === 'rejected' && (
                          <PivotRecommendations originalFieldOfStudy={app.fieldOfStudy || ''} />
                        )}

                        {app.status === 'accepted' && (
                          <div className="mt-4 pt-4 border-t border-border/50">
                            {app.disbursementStatus === 'Awaiting Details' ? (
                              <BankDetailsForm applicationId={app.id} onSubmitted={() => {}} />
                            ) : (
                              <DisbursementTracker currentStatus={app.disbursementStatus as DisbursementStatus} amount={app.amount} />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {selectedApp && (
        <ApplicationDetailModal
          application={selectedApp}
          open={!!selectedApp}
          onOpenChange={o => !o && setSelectedApp(null)}
        />
      )}
    </div>
  );
}
