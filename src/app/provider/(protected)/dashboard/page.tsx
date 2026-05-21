'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Edit, Trash2, ShieldCheck, Users, BarChart3, Clock, Star, CheckCircle2, Loader2 } from "lucide-react";
import type { Scholarship } from "@/lib/types";
import { useState, useEffect } from "react";
import { useAuth } from "@/app/auth-provider";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProviderProfile } from "@/server/db/user-data";
import { useFirestore } from "@/firebase";
import { getProviderProfile } from "@/server/db/user-data";
import Link from "next/link";
import { collection, query, where, getDocs, deleteDoc, doc, getAggregateFromServer, count } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

type ScholarshipWithStats = Scholarship & { totalApplicants?: number; newApplicants?: number };

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number | string; color: string }) {
  return (
    <Card className={`border-l-4 ${color}`}>
      <CardContent className="p-4 flex items-center gap-4">
        <div className={`p-2 rounded-lg bg-muted`}><Icon className="w-5 h-5 text-muted-foreground" /></div>
        <div>
          <p className="text-2xl font-headline font-bold">{value}</p>
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ProviderDashboard() {
  const authContext = useAuth();
  const db = useFirestore();
  const { toast } = useToast();

  const [providerProfile, setProviderProfile] = useState<ProviderProfile | null>(null);
  const [myScholarships, setMyScholarships] = useState<ScholarshipWithStats[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, shortlisted: 0, awarded: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const user = authContext?.user;

  useEffect(() => {
    if (!user || !db) return;

    const fetchAll = async () => {
      setIsLoading(true);
      try {
        const profile = await getProviderProfile(db, user.uid);
        if (!profile) { setIsLoading(false); return; }
        setProviderProfile(profile);
        if (profile.kycStatus !== 'verified') { setIsLoading(false); return; }

        // Direct Firestore query — only this provider's scholarships
        const schSnap = await getDocs(
          query(collection(db, 'scholarships'), where('providerId', '==', user.uid))
        );

        const scholarships: ScholarshipWithStats[] = schSnap.docs.map(d => ({
          id: d.id,
          ...d.data(),
          deadline: d.data().deadline?.toDate?.() ?? new Date(d.data().deadline ?? Date.now()),
          lastUpdated: d.data().lastUpdated?.toDate?.() ?? new Date(),
        } as ScholarshipWithStats));

        // Fetch application counts for each scholarship + global stats
        let totalApps = 0, pendingApps = 0, shortlistedApps = 0, awardedApps = 0;

        const enriched = await Promise.all(scholarships.map(async sch => {
          const appsSnap = await getDocs(
            query(collection(db, 'applications'), where('scholarshipId', '==', sch.id))
          );
          const apps = appsSnap.docs.map(d => d.data());
          totalApps += apps.length;
          const newCount = apps.filter(a => a.status === 'new').length;
          pendingApps += apps.filter(a => a.status === 'reviewing').length;
          shortlistedApps += apps.filter(a => a.status === 'shortlisted').length;
          awardedApps += apps.filter(a => a.status === 'accepted').length;
          return { ...sch, totalApplicants: apps.length, newApplicants: newCount };
        }));

        setMyScholarships(enriched);
        setStats({ total: totalApps, pending: pendingApps, shortlisted: shortlistedApps, awarded: awardedApps });

      } catch (err) {
        console.error(err);
        toast({ title: 'Error', description: 'Failed to load dashboard data.', variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAll();
  }, [user, db]);

  const handleDelete = async (scholarshipId: string, title: string) => {
    if (!db) return;
    setDeletingId(scholarshipId);
    try {
      await deleteDoc(doc(db, 'scholarships', scholarshipId));
      setMyScholarships(prev => prev.filter(s => s.id !== scholarshipId));
      toast({ title: 'Deleted', description: `"${title}" has been removed.` });
    } catch (err: any) {
      toast({ title: 'Delete Failed', description: err.message, variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-10 w-1/2" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-8 w-1/3" />
        <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      </div>
    );
  }

  if (!providerProfile) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold text-destructive">Profile not found</h1>
        <p className="text-muted-foreground">You may not be registered as a provider.</p>
      </div>
    );
  }

  if (providerProfile.kycStatus !== 'verified') {
    return (
      <div className="container mx-auto px-4 py-16 flex justify-center">
        <Card className="text-center p-8 border-primary/20 bg-primary/5 shadow-xl max-w-xl">
          <div className="mx-auto w-24 h-24 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-6 shadow-sm border border-orange-200">
            <ShieldCheck className="w-12 h-12" />
          </div>
          <CardTitle className="font-headline text-3xl">Verification in Progress</CardTitle>
          <CardDescription className="text-lg mt-4 px-4 text-muted-foreground">
            Your account is under review. Once your <strong>Verified Blue Tick</strong> is approved, your full dashboard will unlock.
          </CardDescription>
          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
            Status: <strong className="capitalize">{providerProfile.kycStatus.replace('_', ' ')}</strong>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-headline font-bold">{providerProfile.companyName}</h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-blue-600">Verified Provider</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-sm">{providerProfile.email}</span>
          </p>
        </div>
        <Button asChild size="lg" className="shadow-md hover:-translate-y-0.5 transition-transform">
          <Link href="/provider/dashboard/create">
            <PlusCircle className="mr-2 h-5 w-5" />
            Post New Scholarship
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Applicants" value={stats.total} color="border-l-blue-500" />
        <StatCard icon={Clock} label="Under Review" value={stats.pending} color="border-l-amber-500" />
        <StatCard icon={Star} label="Shortlisted" value={stats.shortlisted} color="border-l-purple-500" />
        <StatCard icon={CheckCircle2} label="Awarded" value={stats.awarded} color="border-l-green-500" />
      </div>

      {/* Scholarships List */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-headline font-semibold">Your Scholarships</h2>
          <span className="text-sm text-muted-foreground">{myScholarships.length} listing{myScholarships.length !== 1 ? 's' : ''}</span>
        </div>

        {myScholarships.length > 0 ? (
          <div className="space-y-4">
            {myScholarships.map((sch, idx) => (
              <motion.div
                key={sch.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="hover:shadow-md transition-all border hover:border-primary/20">
                  <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-headline font-bold text-lg truncate">{sch.title}</h3>
                        <Badge variant={sch.status === 'active' || sch.status === 'Live' ? 'default' : 'secondary'}
                          className="text-[10px] shrink-0">
                          {sch.status}
                        </Badge>
                        {(sch.newApplicants ?? 0) > 0 && (
                          <Badge variant="destructive" className="text-[10px] shrink-0 animate-pulse">
                            {sch.newApplicants} New
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        ₹{new Intl.NumberFormat('en-IN').format(sch.amount)}
                        <span className="mx-2">·</span>
                        Deadline: {sch.deadline instanceof Date ? sch.deadline.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                        <span className="mx-2">·</span>
                        <span className="font-medium">{sch.totalApplicants ?? 0} applicant{(sch.totalApplicants ?? 0) !== 1 ? 's' : ''}</span>
                      </p>
                    </div>

                    <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
                      <Button asChild variant="default" size="sm">
                        <Link href={`/provider/dashboard/${sch.id}`}>
                          <Users className="mr-2 h-4 w-4" /> Manage Applicants
                        </Link>
                      </Button>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/provider/dashboard/edit/${sch.id}`}>
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </Link>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm" disabled={deletingId === sch.id}>
                            {deletingId === sch.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Scholarship?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete <strong>"{sch.title}"</strong> and cannot be undone. Existing applications will remain in the database.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => handleDelete(sch.id, sch.title)}
                            >
                              Delete Permanently
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-primary opacity-50" />
              </div>
              <h3 className="text-xl font-semibold">No scholarships posted yet</h3>
              <p className="text-muted-foreground mt-2 mb-6">Post your first scholarship to start receiving applications.</p>
              <Button asChild>
                <Link href="/provider/dashboard/create"><PlusCircle className="mr-2 h-4 w-4" /> Post Scholarship</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
