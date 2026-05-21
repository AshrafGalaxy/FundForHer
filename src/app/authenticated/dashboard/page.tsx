
// src/app/authenticated/dashboard/page.tsx
'use client';

import { useState, useMemo, useEffect } from 'react';
import { ScholarshipCard } from '@/features/scholarships/ScholarshipCard';
import { TopFilterBar } from '@/features/scholarships/TopFilterBar';
import type { Scholarship } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Loader2, Bookmark, SearchX, Telescope, IndianRupee, Calendar, Target, ChevronLeft, ChevronRight, X, Archive } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useUser } from '@/firebase/auth/use-user';
import { collection, doc, onSnapshot, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useRouter, useSearchParams } from 'next/navigation';
import { logout } from '@/lib/auth';
import { useAuth } from '@/firebase';

// ─── Types ────────────────────────────────────────────────────────────────────

type Filters = {
  search: string;
  fieldOfStudy: string[];
  eligibilityLevel: string[];
  scholarshipType: string[];
  gender: string;
  religion: string;
  location: string;
  sortBy: 'deadline_asc' | 'deadline_desc' | 'default';
};

type ScholarshipStatus = 'All' | 'Live' | 'Upcoming' | 'Always Open';
type ActiveTab = 'all' | 'saved' | 'archived';

// ─── Module-level helpers (stable, no closure issues) ─────────────────────────

/**
 * Real-time client-side expiry check.
 * A scholarship is considered expired if:
 *   1. Firestore status field is 'Expired', OR
 *   2. Its deadline Date is in the past (checked live against new Date())
 */
function isExpiredClient(s: Scholarship): boolean {
  if ((s as any).status === 'Expired') return true;
  if (s.deadline && new Date(s.deadline) < new Date()) return true;
  return false;
}

const getAllScholarshipTypes = (scholarships: Scholarship[]): string[] => {
  const allTypes = scholarships.map(s => s.scholarshipType);
  return Array.from(new Set(allTypes)).sort();
};

const getAllFieldsOfStudy = (scholarships: Scholarship[]): string[] => {
  const fields = new Set<string>();
  scholarships.forEach(doc => {
    if (doc.fieldOfStudy) {
      if (Array.isArray(doc.fieldOfStudy)) doc.fieldOfStudy.forEach(f => fields.add(f));
      else fields.add(doc.fieldOfStudy as any);
    }
  });
  return Array.from(fields).sort();
};

const getAllEligibilityLevels = (scholarships: Scholarship[]): string[] => {
  const levels = new Set<string>();
  scholarships.forEach(doc => {
    if (doc.eligibilityLevel) {
      if (Array.isArray(doc.eligibilityLevel)) doc.eligibilityLevel.forEach(l => levels.add(l));
      else levels.add(doc.eligibilityLevel as any);
    }
  });
  return Array.from(levels).sort();
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [allScholarshipTypes, setAllScholarshipTypes] = useState<string[]>([]);
  const [allFieldsOfStudy, setAllFieldsOfStudy] = useState<string[]>([]);
  const [allEligibilityLevels, setAllEligibilityLevels] = useState<string[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [activeStatus, setActiveStatus] = useState<ScholarshipStatus>('All');
  const [activeTab, setActiveTab] = useState<ActiveTab>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const authUser = useAuth();
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Deep-link support: ?tab=all|saved|archived
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'saved' || tabParam === 'all' || tabParam === 'archived') {
      setActiveTab(tabParam as ActiveTab);
    }
  }, [searchParams]);

  const [filters, setFilters] = useState<Filters>({
    search: '',
    fieldOfStudy: [],
    eligibilityLevel: [],
    scholarshipType: [],
    gender: 'female',
    religion: 'all',
    location: 'all',
    sortBy: 'default',
  });

  // Reset to page 1 when tab/filter/status changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, activeTab, activeStatus]);

  // ── Firestore listener: load ALL scholarships (including Expired) ───────────
  // We do NOT filter Expired on the server. We classify client-side in real-time
  // so scholarships move to "Archived" the moment their deadline passes.
  useEffect(() => {
    if (!db) return;
    setLoading(true);

    const scholarshipsRef = collection(db, 'scholarships');
    const unsubscribe = onSnapshot(scholarshipsRef, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          ...d,
          deadline: d.deadline?.toDate ? d.deadline.toDate() : (d.deadline ? new Date(d.deadline) : null),
          lastUpdated: d.lastUpdated?.toDate ? d.lastUpdated.toDate() : (d.lastUpdated ? new Date(d.lastUpdated) : null),
        } as Scholarship;
      });

      setScholarships(data);
      // Build filter option lists only from active scholarships
      const active = data.filter(s => !isExpiredClient(s));
      setAllScholarshipTypes(getAllScholarshipTypes(active));
      setAllFieldsOfStudy(getAllFieldsOfStudy(active));
      setAllEligibilityLevels(getAllEligibilityLevels(active));
      setLoading(false);
    }, (err) => {
      console.error('Firestore onSnapshot error:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [db]);

  // ── Bookmarks listener ────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !db) return;
    const bookmarksCollection = collection(db, 'users', user.uid, 'bookmarkedScholarships');
    const unsubscribe = onSnapshot(bookmarksCollection, (snapshot) => {
      setBookmarkedIds(new Set(snapshot.docs.map(d => d.id)));
    });
    return () => unsubscribe();
  }, [user, db]);

  // ── Bookmark toggle ───────────────────────────────────────────────────────
  const handleToggleBookmark = async (scholarship: Scholarship) => {
    if (!user || !db) return;
    const bookmarkRef = doc(db, 'users', user.uid, 'bookmarkedScholarships', scholarship.id);
    if (bookmarkedIds.has(scholarship.id)) {
      await deleteDoc(bookmarkRef);
    } else {
      await setDoc(bookmarkRef, {
        ...scholarship,
        deadline: scholarship.deadline ?? null,
        lastUpdated: scholarship.lastUpdated ?? null,
        bookmarkedAt: serverTimestamp(),
      });
    }
  };

  const handleLogout = async () => {
    if (authUser) {
      await logout(authUser);
      router.push('/login');
    }
  };

  // ── Real-time splits ──────────────────────────────────────────────────────
  const activeScholarships = useMemo(
    () => scholarships.filter(s => !isExpiredClient(s)),
    [scholarships],
  );
  const archivedScholarships = useMemo(
    () => scholarships.filter(s => isExpiredClient(s)),
    [scholarships],
  );

  // ── Shared filter logic (reusable for both active + archived) ─────────────
  const applyFilters = (list: Scholarship[]) => {
    const lowerSearch = filters.search.toLowerCase();
    return list.filter(s => {
      const searchMatch = !lowerSearch ||
        s.title.toLowerCase().includes(lowerSearch) ||
        (s.provider && s.provider.toLowerCase().includes(lowerSearch));

      const fieldMatch =
        filters.fieldOfStudy.length === 0 || filters.fieldOfStudy.some(field => {
          if (!s.fieldOfStudy) return false;
          return Array.isArray(s.fieldOfStudy) ? s.fieldOfStudy.includes(field) : s.fieldOfStudy === field;
        });

      const eligibilityMatch =
        filters.eligibilityLevel.length === 0 || filters.eligibilityLevel.some(level => {
          if (!s.eligibilityLevel) return false;
          return Array.isArray(s.eligibilityLevel) ? s.eligibilityLevel.includes(level) : s.eligibilityLevel === level;
        });

      const typeMatch =
        filters.scholarshipType.length === 0 || filters.scholarshipType.includes(s.scholarshipType);

      const genderMatch = filters.gender === 'all' || s.gender.toLowerCase() === filters.gender;
      const religionMatch = filters.religion === 'all' || s.religion.toLowerCase() === filters.religion;
      const locationMatch =
        filters.location === 'all' ||
        s.location.toLowerCase() === 'all' ||
        s.location.toLowerCase() === filters.location ||
        (filters.location === 'india' && s.location.toLowerCase() !== 'abroad');

      return searchMatch && fieldMatch && eligibilityMatch && typeMatch && genderMatch && religionMatch && locationMatch;
    });
  };

  // Active scholarships after all filters applied
  const filteredScholarships = useMemo(
    () => applyFilters(activeScholarships),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeScholarships, filters],
  );

  // Archived scholarships after ALL the same filters + sorted most-recently-expired first
  const archivedFiltered = useMemo(() => {
    return applyFilters(archivedScholarships).sort((a, b) => {
      const dateA = a.deadline?.getTime() ?? 0;
      const dateB = b.deadline?.getTime() ?? 0;
      return dateB - dateA; // Most recently expired first
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [archivedScholarships, filters]);

  // Status sub-filter counts (only for "All" tab)
  const liveCount = useMemo(() => filteredScholarships.filter(s => s.status === 'Live').length, [filteredScholarships]);
  const upcomingCount = useMemo(() => filteredScholarships.filter(s => s.status === 'Upcoming').length, [filteredScholarships]);
  const alwaysOpenCount = useMemo(() => filteredScholarships.filter(s => s.status === 'Always Open').length, [filteredScholarships]);

  // ── Final sorted list for current tab ────────────────────────────────────
  const fullySortedList = useMemo(() => {
    // Archived tab: use pre-sorted archivedFiltered
    if (activeTab === 'archived') return archivedFiltered;

    // Saved tab: ALL bookmarked (active + archived), active first
    let baseList = activeTab === 'saved'
      ? [
          ...scholarships.filter(s => bookmarkedIds.has(s.id) && !isExpiredClient(s)),
          ...scholarships.filter(s => bookmarkedIds.has(s.id) && isExpiredClient(s)),
        ]
      : filteredScholarships;

    let results = activeStatus === 'All'
      ? [...baseList]
      : baseList.filter(s => s.status === activeStatus);

    if (filters.sortBy === 'deadline_asc') {
      results.sort((a, b) => {
        const dateA = a.deadline?.getTime() ?? 0;
        const dateB = b.deadline?.getTime() ?? 0;
        if (dateA === dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateA < dateB ? -1 : 1;
      });
    } else if (filters.sortBy === 'deadline_desc') {
      results.sort((a, b) => {
        const dateA = a.deadline?.getTime() ?? 0;
        const dateB = b.deadline?.getTime() ?? 0;
        if (dateA === dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateA > dateB ? -1 : 1;
      });
    } else {
      results.sort((a, b) => {
        const dateA = a.lastUpdated?.getTime() ?? 0;
        const dateB = b.lastUpdated?.getTime() ?? 0;
        if (dateA === dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateA > dateB ? -1 : 1;
      });
    }

    return results;
  }, [filteredScholarships, archivedFiltered, activeStatus, filters.sortBy, activeTab, scholarships, bookmarkedIds]);

  // ── Pagination ────────────────────────────────────────────────────────────
  const totalPages = Math.ceil(fullySortedList.length / ITEMS_PER_PAGE) || 1;
  const displayedScholarships = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return fullySortedList.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [fullySortedList, currentPage]);

  // ── KPI data ──────────────────────────────────────────────────────────────
  const savedFunding = useMemo(() =>
    scholarships.filter(s => bookmarkedIds.has(s.id)).reduce((sum, s) => sum + (Number(s.amount) || 0), 0),
    [scholarships, bookmarkedIds],
  );

  const urgentDeadlines = useMemo(() => {
    const now = new Date();
    const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return scholarships.filter(s =>
      bookmarkedIds.has(s.id) && s.deadline && s.deadline > now && s.deadline <= next7Days,
    ).length;
  }, [scholarships, bookmarkedIds]);

  // ── Tab badge counts ──────────────────────────────────────────────────────
  const savedCount = useMemo(() => scholarships.filter(s => bookmarkedIds.has(s.id)).length, [scholarships, bookmarkedIds]);
  const archivedCount = archivedFiltered.length;

  // ─────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-16 w-16 animate-spin text-theme-600 dark:text-theme-400" />
          <p className="text-muted-foreground">Loading scholarships...</p>
        </div>
      </div>
    );
  }

  const tabClass = (tab: ActiveTab) =>
    `flex items-center gap-2 py-2.5 px-4 text-sm font-medium transition-all rounded-t-lg whitespace-nowrap ${
      activeTab === tab
        ? 'bg-theme-100 dark:bg-theme-900/50 border-b-2 border-theme-600 dark:border-theme-400 text-theme-900 dark:text-theme-100 font-bold'
        : 'border-b-2 border-transparent text-muted-foreground hover:bg-theme-50 dark:hover:bg-theme-900/20 hover:text-theme-900 dark:hover:text-theme-200'
    }`;

  const TabCount = ({ count }: { count: number }) => (
    <span className="ml-1 bg-theme-200 dark:bg-theme-800 text-theme-950 dark:text-theme-50 rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums">
      {count}
    </span>
  );

  const emptyState = () => {
    const isArchived = activeTab === 'archived';
    const isSaved = activeTab === 'saved';
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-card/40 backdrop-blur-sm rounded-2xl border border-dashed border-theme-200 dark:border-theme-800 animate-in fade-in duration-700">
        <div className="w-20 h-20 bg-theme-100 dark:bg-theme-900/50 rounded-full flex items-center justify-center mb-6 shadow-inner">
          {isSaved ? (
            <Telescope className="w-10 h-10 text-theme-500 animate-pulse" />
          ) : isArchived ? (
            <Archive className="w-10 h-10 text-theme-500 opacity-60" />
          ) : (
            <SearchX className="w-10 h-10 text-theme-500" />
          )}
        </div>
        <h2 className="text-2xl font-headline font-semibold text-card-foreground mb-3">
          {isSaved
            ? 'Your saved list is empty'
            : isArchived
            ? 'No archived scholarships'
            : 'No exact matches found'}
        </h2>
        <p className="text-muted-foreground max-w-md mx-auto mb-8">
          {isSaved
            ? "You haven't bookmarked any scholarships yet. Start exploring to build your personalized list!"
            : isArchived
            ? 'No scholarships with passed deadlines match your current filters. Try broadening your search.'
            : "We couldn't find scholarships matching all your selected filters. Try broadening your search criteria."}
        </p>
        {isSaved ? (
          <Button onClick={() => setActiveTab('all')} className="bg-theme-600 hover:bg-theme-700 text-white rounded-full px-8 h-12">
            Explore Scholarships
          </Button>
        ) : (
          <Button
            onClick={() => setFilters({ search: '', fieldOfStudy: [], eligibilityLevel: [], scholarshipType: [], gender: 'female', religion: 'all', location: 'all', sortBy: 'default' })}
            variant="outline"
            className="rounded-full px-8 h-12 border-theme-200 hover:bg-theme-50 dark:border-theme-800 dark:hover:bg-theme-900/50"
          >
            Clear All Filters
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col min-w-0 bg-background h-full">
      <TopFilterBar
        filters={filters}
        setFilters={setFilters}
        scholarshipTypes={allScholarshipTypes}
        fieldsOfStudy={allFieldsOfStudy}
        eligibilityLevels={allEligibilityLevels}
      />

      <main className="flex-1 overflow-x-hidden pt-4 relative">
        {/* Subtle animated background */}
        <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-primary/10 via-background to-background -z-10" />

        <div className="container mx-auto px-4 sm:px-6 pb-12 md:p-8 space-y-8 max-w-[1600px] mx-auto">

          {/* Hero Banner */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
            <div>
              <h1 className="text-3xl md:text-4xl font-headline font-bold mb-2">
                {user?.displayName ? (
                  <>Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}, <span className="text-primary">{user.displayName.split(' ')[0]}</span> ✨</>
                ) : (
                  <>Find Your <span className="text-primary italic">Funding.</span></>
                )}
              </h1>
              <p className="text-muted-foreground text-lg">
                {activeTab === 'archived' ? (
                  <>Showing <strong className="text-foreground">{archivedCount}</strong> archived scholarships with passed deadlines.</>
                ) : activeTab === 'saved' ? (
                  <>You have saved <strong className="text-foreground">{savedCount}</strong> scholarship{savedCount !== 1 ? 's' : ''}.</>
                ) : (
                  <>We found <strong className="text-foreground">{filteredScholarships.length}</strong> active opportunities matching your profile.</>
                )}
              </p>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-card/60 backdrop-blur-md rounded-2xl p-5 border shadow-sm transition-transform hover:-translate-y-1 duration-300">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-primary/20 p-2 rounded-lg text-primary"><IndianRupee className="w-5 h-5" /></div>
                <h3 className="font-semibold text-sm text-muted-foreground">Total Funding Saved</h3>
              </div>
              <p className="text-3xl font-headline font-bold text-foreground tabular-nums tracking-tight">
                <span style={{ fontFamily: 'sans-serif' }}>₹</span>{savedFunding.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="bg-card/60 backdrop-blur-md rounded-2xl p-5 border shadow-sm transition-transform hover:-translate-y-1 duration-300">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-orange-500/20 p-2 rounded-lg text-orange-500"><Calendar className="w-5 h-5" /></div>
                <h3 className="font-semibold text-sm text-muted-foreground">Urgent Deadlines</h3>
              </div>
              <p className="text-3xl font-headline font-bold text-foreground tabular-nums tracking-tight">{urgentDeadlines}</p>
              <p className="text-xs text-muted-foreground mt-1">Expiring within 7 days</p>
            </div>
            <div className="bg-card/60 backdrop-blur-md rounded-2xl p-5 border shadow-sm transition-transform hover:-translate-y-1 duration-300">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-slate-500/20 p-2 rounded-lg text-slate-500"><Archive className="w-5 h-5" /></div>
                <h3 className="font-semibold text-sm text-muted-foreground">Archived</h3>
              </div>
              <p className="text-3xl font-headline font-bold text-foreground tabular-nums tracking-tight">{archivedScholarships.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Scholarships with passed deadlines</p>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            {/* Active Filter Chips */}
            {(filters.search || filters.fieldOfStudy.length > 0 || filters.eligibilityLevel.length > 0 || filters.scholarshipType.length > 0 || (filters.gender !== 'female' && filters.gender !== 'all') || filters.religion !== 'all' || filters.location !== 'all') && (
              <div className="flex flex-wrap items-center gap-2 mb-[-10px]">
                <span className="text-sm font-medium text-muted-foreground mr-1">Active Filters:</span>
                {filters.search && (
                  <Badge variant="secondary" className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 hover:bg-primary/20 text-primary border-primary/20 transition-colors cursor-pointer font-medium" onClick={() => setFilters(prev => ({ ...prev, search: '' }))}>
                    Search: {filters.search} <X className="w-3 h-3" />
                  </Badge>
                )}
                {filters.gender !== 'female' && filters.gender !== 'all' && (
                  <Badge variant="secondary" className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 hover:bg-primary/20 text-primary border-primary/20 transition-colors cursor-pointer font-medium" onClick={() => setFilters(prev => ({ ...prev, gender: 'female' }))}>
                    Gender: {filters.gender} <X className="w-3 h-3" />
                  </Badge>
                )}
                {filters.religion !== 'all' && (
                  <Badge variant="secondary" className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 hover:bg-primary/20 text-primary border-primary/20 transition-colors cursor-pointer font-medium" onClick={() => setFilters(prev => ({ ...prev, religion: 'all' }))}>
                    Religion: {filters.religion} <X className="w-3 h-3" />
                  </Badge>
                )}
                {filters.location !== 'all' && (
                  <Badge variant="secondary" className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 hover:bg-primary/20 text-primary border-primary/20 transition-colors cursor-pointer font-medium" onClick={() => setFilters(prev => ({ ...prev, location: 'all' }))}>
                    Location: {filters.location} <X className="w-3 h-3" />
                  </Badge>
                )}
                {filters.fieldOfStudy.map(field => (
                  <Badge key={field} variant="secondary" className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 hover:bg-primary/20 text-primary border-primary/20 transition-colors cursor-pointer font-medium" onClick={() => setFilters(prev => ({ ...prev, fieldOfStudy: prev.fieldOfStudy.filter(f => f !== field) }))}>
                    {field} <X className="w-3 h-3" />
                  </Badge>
                ))}
                {filters.eligibilityLevel.map(level => (
                  <Badge key={level} variant="secondary" className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 hover:bg-primary/20 text-primary border-primary/20 transition-colors cursor-pointer font-medium" onClick={() => setFilters(prev => ({ ...prev, eligibilityLevel: prev.eligibilityLevel.filter(l => l !== level) }))}>
                    {level} <X className="w-3 h-3" />
                  </Badge>
                ))}
                {filters.scholarshipType.map(type => (
                  <Badge key={type} variant="secondary" className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 hover:bg-primary/20 text-primary border-primary/20 transition-colors cursor-pointer font-medium" onClick={() => setFilters(prev => ({ ...prev, scholarshipType: prev.scholarshipType.filter(t => t !== type) }))}>
                    {type} <X className="w-3 h-3" />
                  </Badge>
                ))}
              </div>
            )}

            {/* ── Tabs ── */}
            <div className="border-b overflow-x-auto">
              <div className="flex gap-1 min-w-max">
                <button id="tab-all" onClick={() => setActiveTab('all')} className={tabClass('all')}>
                  All Scholarships
                  <TabCount count={filteredScholarships.length} />
                </button>
                <button id="tab-saved" onClick={() => setActiveTab('saved')} className={tabClass('saved')}>
                  <Bookmark className="h-3.5 w-3.5" />
                  Saved
                  <TabCount count={savedCount} />
                </button>
                <button id="tab-archived" onClick={() => setActiveTab('archived')} className={tabClass('archived')}>
                  <Archive className="h-3.5 w-3.5" />
                  Archived
                  <TabCount count={archivedCount} />
                </button>
              </div>
            </div>

            {/* Sub-status filter — only on "All" tab */}
            {activeTab === 'all' && (
              <div className="flex flex-wrap gap-2">
                <Button id="filter-all" onClick={() => setActiveStatus('All')} variant={activeStatus === 'All' ? 'default' : 'outline'} size="sm">
                  All <span className="ml-2 bg-theme-200 dark:bg-theme-800 text-theme-950 dark:text-theme-50 rounded-full px-2 py-0.5 text-[10px] font-bold">{filteredScholarships.length}</span>
                </Button>
                <Button id="filter-live" onClick={() => setActiveStatus('Live')} variant={activeStatus === 'Live' ? 'default' : 'outline'} size="sm">
                  Live <span className="ml-2 bg-theme-200 dark:bg-theme-800 text-theme-950 dark:text-theme-50 rounded-full px-2 py-0.5 text-[10px] font-bold">{liveCount}</span>
                </Button>
                <Button id="filter-upcoming" onClick={() => setActiveStatus('Upcoming')} variant={activeStatus === 'Upcoming' ? 'default' : 'outline'} size="sm">
                  Upcoming <span className="ml-2 bg-theme-200 dark:bg-theme-800 text-theme-950 dark:text-theme-50 rounded-full px-2 py-0.5 text-[10px] font-bold">{upcomingCount}</span>
                </Button>
                <Button id="filter-always-open" onClick={() => setActiveStatus('Always Open')} variant={activeStatus === 'Always Open' ? 'default' : 'outline'} size="sm">
                  Always Open <span className="ml-2 bg-theme-200 dark:bg-theme-800 text-theme-950 dark:text-theme-50 rounded-full px-2 py-0.5 text-[10px] font-bold">{alwaysOpenCount}</span>
                </Button>
              </div>
            )}

            {/* Archived-tab info banner */}
            {activeTab === 'archived' && archivedFiltered.length > 0 && (
              <div className="flex items-center gap-3 px-4 py-3 bg-slate-100 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-600 dark:text-slate-400">
                <Archive className="w-4 h-4 flex-shrink-0" />
                <span>These scholarships have passed their application deadline. They are read-only for reference. Deadlines are recalculated in real time.</span>
              </div>
            )}
          </div>

          {/* ── Card Grid ── */}
          {scholarships.length > 0 ? (
            displayedScholarships.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                  {displayedScholarships.map(scholarship => (
                    <ScholarshipCard
                      key={scholarship.id}
                      scholarship={scholarship}
                      isBookmarked={bookmarkedIds.has(scholarship.id)}
                      onToggleBookmark={() => handleToggleBookmark(scholarship)}
                      isExpired={isExpiredClient(scholarship)}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between mt-10 border-t pt-6 text-sm text-muted-foreground gap-4">
                    <div className="font-medium bg-secondary/50 px-4 py-2 rounded-lg">
                      Showing <strong className="text-foreground">{Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, fullySortedList.length)}</strong> to{' '}
                      <strong className="text-foreground">{Math.min(currentPage * ITEMS_PER_PAGE, fullySortedList.length)}</strong> of{' '}
                      <strong className="text-foreground">{fullySortedList.length}</strong> results
                    </div>
                    <div className="flex items-center gap-2 bg-card border rounded-lg p-1 shadow-sm">
                      <Button variant="ghost" size="sm" onClick={() => { setCurrentPage(prev => Math.max(1, prev - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }} disabled={currentPage === 1} className="h-8 px-2">
                        <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                      </Button>
                      <div className="flex items-center font-medium px-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                          if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                            return (
                              <button key={page} onClick={() => { setCurrentPage(page); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className={`w-8 h-8 rounded-md flex items-center justify-center transition-all ${currentPage === page ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-muted text-muted-foreground'}`}>
                                {page}
                              </button>
                            );
                          } else if (page === currentPage - 2 || page === currentPage + 2) {
                            return <span key={page} className="w-8 h-8 flex items-center justify-center text-muted-foreground/50">...</span>;
                          }
                          return null;
                        })}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => { setCurrentPage(prev => Math.min(totalPages, prev + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }} disabled={currentPage === totalPages} className="h-8 px-2">
                        Next <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : emptyState()
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 border-4 border-theme-200 border-t-theme-600 rounded-full animate-spin mb-6" />
              <h2 className="text-xl font-headline font-semibold text-muted-foreground animate-pulse">Loading opportunities...</h2>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
