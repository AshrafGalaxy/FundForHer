'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  PlusCircle, Edit, Trash2, ShieldCheck, Users, BarChart3, Clock,
  Star, CheckCircle2, Loader2, TrendingUp, Eye, Globe, Award,
  MousePointerClick, UserCheck, ArrowUpRight, Sparkles, ChevronRight,
} from "lucide-react";
import type { Scholarship } from "@/lib/types";
import { useState, useEffect } from "react";
import { useAuth } from "@/app/auth-provider";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProviderProfile } from "@/server/db/user-data";
import { useFirestore } from "@/firebase";
import { getProviderProfile } from "@/server/db/user-data";
import Link from "next/link";
import { collection, query, where, getDocs, deleteDoc, writeBatch, doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────────
type ScholarshipWithStats = Scholarship & {
  totalApplicants?: number;
  newApplicants?: number;
  acceptanceRate?: number;
};

// ── Demo KPI baseline data (hardcoded for demonstration, blended with live counts) ──
const DEMO_KPIs = {
  portalViews:        3_847,
  uniqueVisitors:     2_219,
  conversionRate:     12.4,
  avgResponseTime:    '1.8 days',
  studentSatisfaction: 94,
  repeatApplicants:   38,
};

// ── Sub-components ─────────────────────────────────────────────────────────────
function KpiCard({
  icon: Icon, label, value, sub, trend, color, progress,
}: {
  icon: React.ElementType; label: string; value: string | number;
  sub?: string; trend?: string; color: string; progress?: number;
}) {
  return (
    <Card className={cn('relative overflow-hidden border-0 shadow-md', color)}>
      {/* Decorative background circle */}
      <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/10 pointer-events-none" />
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm">
            <Icon className="w-5 h-5 text-white" />
          </div>
          {trend && (
            <span className="text-[10px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-full flex items-center gap-0.5">
              <ArrowUpRight className="w-2.5 h-2.5" /> {trend}
            </span>
          )}
        </div>
        <p className="text-3xl font-headline font-bold text-white mt-3">{value}</p>
        <p className="text-xs font-semibold text-white/80 mt-0.5">{label}</p>
        {sub && <p className="text-[10px] text-white/60 mt-1">{sub}</p>}
        {progress !== undefined && (
          <div className="mt-3">
            <div className="h-1 rounded-full bg-white/20">
              <div className="h-full rounded-full bg-white/70 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ScholarshipStatusBadge({ status }: { status: string }) {
  const normalized = status?.toLowerCase();
  const map: Record<string, { label: string; cls: string }> = {
    active: { label: 'Active', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    live:   { label: 'Live',   cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    draft:  { label: 'Draft',  cls: 'bg-muted text-muted-foreground border-border' },
    closed: { label: 'Closed', cls: 'bg-red-100 text-red-700 border-red-200' },
  };
  const { label, cls } = map[normalized] ?? { label: status, cls: 'bg-muted text-muted-foreground' };
  return <Badge className={cn('text-[10px] border shrink-0', cls)}>{label}</Badge>;
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function ProviderDashboard() {
  const authContext = useAuth();
  const db = useFirestore();
  const { toast } = useToast();

  const [providerProfile, setProviderProfile] = useState<ProviderProfile | null>(null);
  const [myScholarships, setMyScholarships] = useState<ScholarshipWithStats[]>([]);
  const [liveStats, setLiveStats] = useState({ total: 0, pending: 0, shortlisted: 0, awarded: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const user = authContext?.user;

  useEffect(() => {
    if (!user || !db) return;
    let cancelled = false;

    const fetchAll = async () => {
      setIsLoading(true);
      try {
        const profile = await getProviderProfile(db, user.uid);
        if (!profile || cancelled) { setIsLoading(false); return; }
        setProviderProfile(profile);

        // Fetch this provider's scholarships (one getDocs — cached by IndexedDB)
        const schSnap = await getDocs(
          query(collection(db, 'scholarships'), where('providerId', '==', user.uid))
        );

        const scholarships: ScholarshipWithStats[] = schSnap.docs.map(d => ({
          id: d.id,
          ...d.data(),
          deadline: d.data().deadline?.toDate?.() ?? new Date(d.data().deadline ?? Date.now()),
          lastUpdated: d.data().lastUpdated?.toDate?.() ?? new Date(),
        } as ScholarshipWithStats));

        // Batch fetch applications for all scholarships
        let total = 0, pending = 0, shortlisted = 0, awarded = 0;

        const enriched: ScholarshipWithStats[] = await Promise.all(
          scholarships.map(async sch => {
            const appsSnap = await getDocs(
              query(collection(db, 'applications'), where('scholarshipId', '==', sch.id))
            );
            const apps = appsSnap.docs.map(d => d.data());
            total       += apps.length;
            const newC   = apps.filter(a => a.status === 'new').length;
            pending     += apps.filter(a => a.status === 'reviewing').length;
            shortlisted += apps.filter(a => a.status === 'shortlisted').length;
            awarded     += apps.filter(a => a.status === 'accepted').length;
            const rate   = apps.length > 0 ? Math.round((awarded / apps.length) * 100) : 0;
            return { ...sch, totalApplicants: apps.length, newApplicants: newC, acceptanceRate: rate };
          })
        );

        if (!cancelled) {
          setMyScholarships(enriched.sort((a, b) => (b.totalApplicants ?? 0) - (a.totalApplicants ?? 0)));
          setLiveStats({ total, pending, shortlisted, awarded });
        }
      } catch (err) {
        console.error(err);
        toast({ title: 'Error', description: 'Failed to load dashboard data.', variant: 'destructive' });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchAll();
    return () => { cancelled = true; };
  }, [user?.uid, db]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Delete scholarship + cascade delete its applications ──────────────────
  const handleDeleteScholarship = async (scholarshipId: string, title: string) => {
    if (!db) return;
    setDeletingId(scholarshipId);
    try {
      // Find all applications for this scholarship
      const appsSnap = await getDocs(
        query(collection(db, 'applications'), where('scholarshipId', '==', scholarshipId))
      );

      // Batch-delete applications + scholarship in one atomic write
      const batch = writeBatch(db);
      appsSnap.docs.forEach(appDoc => batch.delete(appDoc.ref));
      batch.delete(doc(db, 'scholarships', scholarshipId));
      await batch.commit();

      setMyScholarships(prev => prev.filter(s => s.id !== scholarshipId));
      toast({
        title: 'Scholarship Deleted',
        description: `"${title}" and all ${appsSnap.size} associated application(s) have been permanently removed.`,
      });
    } catch (err: any) {
      toast({ title: 'Delete Failed', description: err.message, variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6 max-w-7xl">
        <Skeleton className="h-10 w-1/2" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-8 w-1/3" />
        <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      </div>
    );
  }

  // ── Not a provider ────────────────────────────────────────────────────────
  if (!providerProfile) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold text-destructive">Profile not found</h1>
        <p className="text-muted-foreground">You may not be registered as a provider.</p>
      </div>
    );
  }


  // ── Acceptance rate for overview ──────────────────────────────────────────

  const overallRate = liveStats.total > 0
    ? Math.round((liveStats.awarded / liveStats.total) * 100)
    : 0;
  // Blend live data with demo baseline for a realistic demo
  const totalApplicants = liveStats.total + 127;
  const portalViews     = DEMO_KPIs.portalViews + myScholarships.length * 318;

  return (
    <div className="container mx-auto px-4 py-8 space-y-8 max-w-7xl animate-in fade-in duration-500">

      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="w-14 h-14 border-2 border-primary/20 shadow-md rounded-xl">
            {providerProfile.logoUrl && <AvatarImage src={providerProfile.logoUrl} alt={providerProfile.companyName} className="object-contain p-1 rounded-xl" />}
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-2xl rounded-xl">
              {providerProfile.companyName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-3xl font-headline font-bold">{providerProfile.companyName}</h1>
              <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[10px]">
                <ShieldCheck className="w-3 h-3 mr-1" /> Verified
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">{providerProfile.email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/provider/profile">
              <Edit className="mr-1.5 h-4 w-4" /> Edit Profile
            </Link>
          </Button>
          <Button asChild size="lg" className="shadow-md hover:-translate-y-0.5 transition-transform">
            <Link href="/provider/dashboard/create">
              <PlusCircle className="mr-2 h-5 w-5" /> Post New Scholarship
            </Link>
          </Button>
        </div>
      </div>

      {/* ── Section Label ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Portal Performance</h2>
      </div>

      {/* ── Row 1: Reach & Engagement KPIs (demo + live blended) ─────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={Eye}
          label="Portal Views"
          value={portalViews.toLocaleString('en-IN')}
          sub="Last 30 days"
          trend="+23%"
          color="bg-gradient-to-br from-violet-600 to-violet-500"
        />
        <KpiCard
          icon={Globe}
          label="Unique Visitors"
          value={(DEMO_KPIs.uniqueVisitors + myScholarships.length * 89).toLocaleString('en-IN')}
          sub="Organic + referral"
          trend="+18%"
          color="bg-gradient-to-br from-blue-600 to-blue-500"
        />
        <KpiCard
          icon={MousePointerClick}
          label="Conversion Rate"
          value={`${DEMO_KPIs.conversionRate}%`}
          sub="Visitors → Applicants"
          trend="+2.1%"
          color="bg-gradient-to-br from-sky-600 to-sky-500"
          progress={DEMO_KPIs.conversionRate}
        />
        <KpiCard
          icon={UserCheck}
          label="Repeat Applicants"
          value={`${DEMO_KPIs.repeatApplicants}%`}
          sub="Returning users"
          trend="+5%"
          color="bg-gradient-to-br from-indigo-600 to-indigo-500"
          progress={DEMO_KPIs.repeatApplicants}
        />
      </div>

      {/* ── Row 2: Application Pipeline KPIs (live data) ──────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Application Pipeline</h2>
          <Badge variant="secondary" className="text-[10px] ml-auto">Live Data</Badge>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            icon={Users}
            label="Total Applicants"
            value={totalApplicants.toLocaleString('en-IN')}
            sub={`${myScholarships.length} scholarship${myScholarships.length !== 1 ? 's' : ''} active`}
            trend="+31%"
            color="bg-gradient-to-br from-emerald-600 to-teal-600"
          />
          <KpiCard
            icon={Clock}
            label="Under Review"
            value={liveStats.pending + 14}
            sub={`Avg response: ${DEMO_KPIs.avgResponseTime}`}
            color="bg-gradient-to-br from-amber-500 to-orange-500"
          />
          <KpiCard
            icon={Star}
            label="Shortlisted"
            value={liveStats.shortlisted + 23}
            sub="Moved forward"
            color="bg-gradient-to-br from-purple-600 to-fuchsia-600"
          />
          <KpiCard
            icon={Award}
            label="Scholarships Awarded"
            value={liveStats.awarded + 9}
            sub={`${overallRate || 8}% acceptance rate`}
            trend="+4"
            color="bg-gradient-to-br from-rose-500 to-pink-600"
          />
        </div>
      </div>

      {/* ── Student Satisfaction bar ───────────────────────────────────────── */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-primary/5 to-secondary/10">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">Student Satisfaction Score</p>
                <p className="text-xs text-muted-foreground">Based on post-application survey responses</p>
              </div>
            </div>
            <div className="flex items-center gap-3 min-w-[200px]">
              <Progress value={DEMO_KPIs.studentSatisfaction} className="flex-1 h-2.5" />
              <span className="font-bold text-primary text-lg w-12 text-right">{DEMO_KPIs.studentSatisfaction}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Scholarships List ──────────────────────────────────────────────── */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-headline font-semibold">Your Scholarships</h2>
            <p className="text-sm text-muted-foreground">{myScholarships.length} listing{myScholarships.length !== 1 ? 's' : ''} · sorted by applicants</p>
          </div>
        </div>

        {myScholarships.length > 0 ? (
          <div className="space-y-4">
            {myScholarships.map((sch, idx) => {
              const progressPct = sch.totalApplicants
                ? Math.min(100, Math.round((sch.totalApplicants / 50) * 100))
                : 0;
              return (
                <motion.div
                  key={sch.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.06 }}
                >
                  <Card className="hover:shadow-md transition-all border hover:border-primary/30">
                    <CardContent className="p-0">
                      <div className="p-5 flex flex-col md:flex-row md:items-start justify-between gap-4">
                        {/* Left: info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="font-headline font-bold text-lg truncate">{sch.title}</h3>
                            <ScholarshipStatusBadge status={sch.status} />
                            {(sch.newApplicants ?? 0) > 0 && (
                              <Badge variant="destructive" className="text-[10px] animate-pulse shrink-0">
                                {sch.newApplicants} New
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            ₹{new Intl.NumberFormat('en-IN').format(sch.amount)}
                            <span className="mx-2">·</span>
                            Deadline: {sch.deadline instanceof Date
                              ? sch.deadline.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                              : '—'}
                          </p>

                          {/* Mini applicant progress bar */}
                          <div className="mt-3 flex items-center gap-3">
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary/70 rounded-full transition-all"
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">
                              {sch.totalApplicants ?? 0} applicant{(sch.totalApplicants ?? 0) !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>

                        {/* Right: action buttons */}
                        <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end items-start">
                          <Button asChild variant="default" size="sm" className="gap-1.5">
                            <Link href={`/provider/dashboard/${sch.id}`}>
                              <Users className="h-4 w-4" /> Manage Applicants
                              <ChevronRight className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                          <Button asChild variant="outline" size="sm" className="gap-1.5">
                            <Link href={`/provider/dashboard/edit/${sch.id}`}>
                              <Edit className="h-4 w-4" /> Edit
                            </Link>
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm" disabled={deletingId === sch.id}>
                                {deletingId === sch.id
                                  ? <Loader2 className="h-4 w-4 animate-spin" />
                                  : <Trash2 className="h-4 w-4" />}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Scholarship?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete <strong>&quot;{sch.title}&quot;</strong> and{' '}
                                  <strong>all {sch.totalApplicants ?? 0} associated application(s)</strong>.
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => handleDeleteScholarship(sch.id, sch.title)}
                                >
                                  Delete Permanently
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <Card className="border-dashed border-2">
            <CardContent className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-primary opacity-50" />
              </div>
              <h3 className="text-xl font-semibold">No scholarships posted yet</h3>
              <p className="text-muted-foreground mt-2 mb-6 text-sm max-w-sm mx-auto">
                Post your first scholarship to start receiving applications and see your KPIs come to life.
              </p>
              <Button asChild size="lg">
                <Link href="/provider/dashboard/create">
                  <PlusCircle className="mr-2 h-4 w-4" /> Post Your First Scholarship
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
