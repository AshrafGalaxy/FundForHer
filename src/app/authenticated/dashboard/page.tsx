
// src/app/authenticated/dashboard/page.tsx
'use client';

import { useState, useMemo, useEffect } from 'react';
import { ScholarshipCard } from '@/features/scholarships/ScholarshipCard';
import { FilterSidebar } from '@/features/scholarships/FilterSidebar';
import type { Scholarship } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, Loader2, Bookmark, Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';
import Logo from '@/components/ui/Logo';
import { SidebarProvider, Sidebar, SidebarTrigger } from '@/components/ui/sidebar';
import { useUser } from '@/firebase/auth/use-user';
import { collection, doc, onSnapshot, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { logout } from '@/lib/auth';
import { useAuth } from '@/firebase';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Settings, LogOut, User as UserIcon } from 'lucide-react';

type Filters = {
  search: string;
  fieldOfStudy: string[];
  eligibilityLevel: string[];
  scholarshipType: string[];
  gender: string;
  religion: string;
  location: string;
};

type ScholarshipStatus = 'All' | 'Live' | 'Upcoming' | 'Always Open';
type ActiveTab = 'all' | 'saved';

// We now use hardcoded categories in FilterSidebar
// but we keep getAllScholarshipTypes to dynamically pull scholarship types.

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

export default function DashboardPage() {
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [allScholarshipTypes, setAllScholarshipTypes] = useState<string[]>([]);
  const [allFieldsOfStudy, setAllFieldsOfStudy] = useState<string[]>([]);
  const [allEligibilityLevels, setAllEligibilityLevels] = useState<string[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [activeStatus, setActiveStatus] = useState<ScholarshipStatus>('All');
  const [sortBy, setSortBy] = useState<'posted' | 'deadline'>('posted');
  const [activeTab, setActiveTab] = useState<ActiveTab>('all');

  const authUser = useAuth();
  const user = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { setTheme } = useTheme();

  const [filters, setFilters] = useState<Filters>({
    search: '',
    fieldOfStudy: [],
    eligibilityLevel: [],
    scholarshipType: [],
    gender: 'female',
    religion: 'all',
    location: 'all',
  });


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
          deadline: d.deadline?.toDate ? d.deadline.toDate() : new Date(d.deadline),
          lastUpdated: d.lastUpdated?.toDate ? d.lastUpdated.toDate() : new Date(d.lastUpdated),
        } as Scholarship;
      });

      setScholarships(data);
      setAllScholarshipTypes(getAllScholarshipTypes(data));
      setAllFieldsOfStudy(getAllFieldsOfStudy(data));
      setAllEligibilityLevels(getAllEligibilityLevels(data));
      setLoading(false);
    }, (err) => {
      console.error("Firestore onSnapshot error:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [db]);

  useEffect(() => {
    if (!user || !db) return;

    const bookmarksCollection = collection(db, 'users', user.uid, 'bookmarkedScholarships');
    const unsubscribe = onSnapshot(bookmarksCollection, (snapshot) => {
      const ids = new Set(snapshot.docs.map(d => d.id));
      setBookmarkedIds(ids);
    });

    return () => unsubscribe();
  }, [user, db]);


  const handleToggleBookmark = async (scholarship: Scholarship) => {
    if (!user || !db) return;

    const bookmarkRef = doc(db, 'users', user.uid, 'bookmarkedScholarships', scholarship.id);

    if (bookmarkedIds.has(scholarship.id)) {
      await deleteDoc(bookmarkRef);
    } else {
      const scholarshipDataForFirestore = {
        ...scholarship,
        deadline: scholarship.deadline ? scholarship.deadline : null,
        lastUpdated: scholarship.lastUpdated ? scholarship.lastUpdated : null,
        bookmarkedAt: serverTimestamp(),
      };
      await setDoc(bookmarkRef, scholarshipDataForFirestore);
    }
  };

  const handleLogout = async () => {
    if (authUser) {
      await logout(authUser);
      router.push('/login');
    }
  };


  const filteredScholarships = useMemo(() => {
    if (scholarships.length === 0) return [];

    return scholarships.filter(s => {
      const lowerSearch = filters.search.toLowerCase();
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
      const locationMatch = filters.location === 'all' || s.location.toLowerCase() === 'all' || s.location.toLowerCase() === filters.location || (filters.location === 'india' && s.location.toLowerCase() !== 'abroad');

      return searchMatch && fieldMatch && eligibilityMatch && typeMatch && genderMatch && religionMatch && locationMatch;
    });
  }, [scholarships, filters]);

  const liveCount = useMemo(() => {
    return filteredScholarships.filter(s => s.status === 'Live').length;
  }, [filteredScholarships]);

  const upcomingCount = useMemo(() => {
    return filteredScholarships.filter(s => s.status === 'Upcoming').length;
  }, [filteredScholarships]);

  const alwaysOpenCount = useMemo(() => {
    return filteredScholarships.filter(s => s.status === 'Always Open').length;
  }, [filteredScholarships]);

  const displayedScholarships = useMemo(() => {
    let baseList = activeTab === 'saved'
      ? scholarships.filter(s => bookmarkedIds.has(s.id))
      : filteredScholarships;

    let results = activeStatus === 'All'
      ? [...baseList]
      : baseList.filter(s => s.status === activeStatus);

    if (sortBy === 'deadline') {
      results.sort((a, b) => {
        const dateA = a.deadline?.getTime() ?? 0;
        const dateB = b.deadline?.getTime() ?? 0;
        if (dateA === dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateA < dateB ? -1 : 1;
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
  }, [filteredScholarships, activeStatus, sortBy, activeTab, scholarships, bookmarkedIds]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-16 w-16 animate-spin text-theme-600 dark:text-theme-400" />
          <p className="text-muted-foreground">Loading scholarships...</p>
        </div>
      </div>
    )
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden w-full bg-background">
        <Sidebar>
          <FilterSidebar
            filters={filters}
            setFilters={setFilters}
            scholarshipTypes={allScholarshipTypes}
            fieldsOfStudy={allFieldsOfStudy}
            eligibilityLevels={allEligibilityLevels}
          />
        </Sidebar>

        <div className="flex-1 flex flex-col min-w-0">
          {/* Optimized Dashboard Header */}
          <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-4 border-b bg-card px-4 sm:px-6 shadow-sm">
            <SidebarTrigger />
            <div className="flex items-center gap-2 mr-4 shrink-0">
              <Logo className="w-7 h-7" />
              <span className="text-lg font-headline font-bold text-card-foreground hidden lg:inline-block">
                FUND HER FUTURE
              </span>
            </div>

            {/* Wide and Responsive Search Bar */}
            <div className="relative flex-1 max-w-3xl mx-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search scholarships by title or provider..."
                className="w-full rounded-full bg-secondary pl-10 h-10 border-none focus-visible:ring-2 focus-visible:ring-primary/50"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
            </div>

            <div className="flex items-center gap-4 ml-auto">
              {/* Theme Toggle */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 relative hover:bg-primary/10 transition-colors">
                    <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-theme-600 dark:text-theme-400" />
                    <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-theme-600 dark:text-theme-400" />
                    <span className="sr-only">Toggle theme</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setTheme("light")} className="cursor-pointer">
                    <Sun className="mr-2 h-4 w-4" /> Light
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("dark")} className="cursor-pointer">
                    <Moon className="mr-2 h-4 w-4" /> Dark
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("system")} className="cursor-pointer">
                    <Monitor className="mr-2 h-4 w-4" /> System
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Notifications / Bookmarks - Popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 relative hover:bg-primary/10 transition-colors">
                    <Bookmark className="h-4 w-4 text-theme-600 dark:text-theme-400" />
                    {bookmarkedIds.size > 0 && (
                      <span className="absolute top-2 right-2 flex h-2 w-2 rounded-full bg-primary" />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 p-0 overflow-hidden shadow-lg border-primary/20">
                  <div className="flex flex-col p-4 bg-primary/5 border-b">
                    <h4 className="font-semibold font-headline text-theme-600 dark:text-theme-400 flex items-center gap-2"><Bookmark className="h-4 w-4" /> Quick Saves</h4>
                    <p className="text-sm text-muted-foreground mt-1">You have {bookmarkedIds.size} saved scholarship{bookmarkedIds.size === 1 ? '' : 's'}.</p>
                  </div>
                  <div className="flex flex-col max-h-[300px] overflow-y-auto">
                    {bookmarkedIds.size === 0 ? (
                      <div className="p-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                        <Bookmark className="h-8 w-8 text-muted-foreground/30" />
                        <span>No saved scholarships yet.</span>
                      </div>
                    ) : (
                      scholarships.filter(s => bookmarkedIds.has(s.id)).slice(0, 4).map(s => (
                        <Link key={s.id} href={`/scholarship/${s.id}`} className="flex flex-col p-4 hover:bg-muted/60 transition-colors border-b last:border-0 group">
                          <span className="font-medium text-sm line-clamp-1 group-hover:text-theme-600 dark:text-theme-400 transition-colors">{s.title}</span>
                          <span className="text-xs text-muted-foreground line-clamp-1 mt-1">{s.provider}</span>
                        </Link>
                      ))
                    )}
                  </div>
                  <div className="p-2 border-t bg-muted/20">
                    <Button variant="ghost" className="w-full text-xs hover:bg-primary/10 hover:text-theme-600 dark:text-theme-400 transition-colors" asChild>
                      <Link href="/authenticated/profile">View All Saved In Profile &rarr;</Link>
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              {/* User Profile Dropdown */}
              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                      <Avatar className="h-9 w-9 border">
                        <AvatarImage src={user.photoURL || ''} alt={user.displayName || 'User'} />
                        <AvatarFallback>{user.displayName?.charAt(0) || 'U'}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user.displayName || 'Student'}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link href="/authenticated/profile">
                        <UserIcon className="mr-2 h-4 w-4" />
                        <span>Profile & Bookmarks</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="cursor-pointer text-muted-foreground">
                      <Link href="/authenticated/profile">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 focus:text-red-600">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </header>

          {/* Scrollable Grid Content */}
          <main className="flex-1 overflow-y-auto">
            <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl md:text-3xl font-headline font-bold">Find Your Scholarship</h1>
                  <p className="text-muted-foreground text-sm">Empowering girls across India through education</p>
                </div>
                <div className="flex justify-end gap-2 shrink-0">
                  <Button onClick={() => setSortBy('posted')} variant={sortBy === 'posted' ? 'secondary' : 'ghost'} size="sm">Recently Posted</Button>
                  <Button onClick={() => setSortBy('deadline')} variant={sortBy === 'deadline' ? 'secondary' : 'ghost'} size="sm">Deadline Date</Button>
                </div>
              </div>

              <div className="flex flex-col gap-6">
                <div className="border-b">
                  <div className="flex gap-4">
                    <button onClick={() => setActiveTab('all')} className={`py-2 px-4 text-sm font-medium transition-colors rounded-t-lg ${activeTab === 'all' ? 'bg-theme-100 dark:bg-theme-900/50 border-b-2 border-theme-600 dark:border-theme-400 text-theme-900 dark:text-theme-100 font-bold' : 'border-b-2 border-transparent text-muted-foreground hover:bg-theme-50 dark:hover:bg-theme-900/20 hover:text-theme-900 dark:hover:text-theme-200'}`}>All Scholarships</button>
                    <button onClick={() => setActiveTab('saved')} className={`flex items-center gap-2 py-2 px-4 text-sm font-medium transition-colors rounded-t-lg ${activeTab === 'saved' ? 'bg-theme-100 dark:bg-theme-900/50 border-b-2 border-theme-600 dark:border-theme-400 text-theme-900 dark:text-theme-100 font-bold' : 'border-b-2 border-transparent text-muted-foreground hover:bg-theme-50 dark:hover:bg-theme-900/20 hover:text-theme-900 dark:hover:text-theme-200'}`}>
                      <Bookmark className="h-4 w-4" /> Saved Scholarships
                    </button>
                  </div>
                </div>

                {activeTab === 'all' && (
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => setActiveStatus('All')} variant={activeStatus === 'All' ? 'default' : 'outline'} size="sm">
                      All <span className="ml-2 bg-theme-200 dark:bg-theme-800 text-theme-950 dark:text-theme-50 rounded-full px-2 py-0.5 text-[10px] font-bold">{filteredScholarships.length}</span>
                    </Button>
                    <Button onClick={() => setActiveStatus('Live')} variant={activeStatus === 'Live' ? 'default' : 'outline'} size="sm">
                      Live <span className="ml-2 bg-theme-200 dark:bg-theme-800 text-theme-950 dark:text-theme-50 rounded-full px-2 py-0.5 text-[10px] font-bold">{liveCount}</span>
                    </Button>
                    <Button onClick={() => setActiveStatus('Upcoming')} variant={activeStatus === 'Upcoming' ? 'default' : 'outline'} size="sm">
                      Upcoming <span className="ml-2 bg-theme-200 dark:bg-theme-800 text-theme-950 dark:text-theme-50 rounded-full px-2 py-0.5 text-[10px] font-bold">{upcomingCount}</span>
                    </Button>
                    <Button onClick={() => setActiveStatus('Always Open')} variant={activeStatus === 'Always Open' ? 'default' : 'outline'} size="sm">
                      Always Open <span className="ml-2 bg-theme-200 dark:bg-theme-800 text-theme-950 dark:text-theme-50 rounded-full px-2 py-0.5 text-[10px] font-bold">{alwaysOpenCount}</span>
                    </Button>
                  </div>
                )}
              </div>

              {scholarships.length > 0 ? (
                displayedScholarships.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                    {displayedScholarships.map(scholarship => (
                      <ScholarshipCard
                        key={scholarship.id}
                        scholarship={scholarship}
                        isBookmarked={bookmarkedIds.has(scholarship.id)}
                        onToggleBookmark={() => handleToggleBookmark(scholarship)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 bg-card rounded-xl shadow-sm border">
                    <h2 className="text-2xl font-headline font-semibold text-card-foreground">
                      {activeTab === 'saved' ? "No saved scholarships" : "No scholarships match your criteria"}
                    </h2>
                    <p className="text-muted-foreground mt-2">
                      {activeTab === 'saved' ? "Start exploring and save scholarships you're interested in!" : "Try clearing your filters or changing categories."}
                    </p>
                  </div>
                )
              ) : (
                <div className="text-center py-20">
                  <h2 className="text-2xl font-headline font-semibold text-card-foreground">No Scholarships Found</h2>
                  <p className="text-muted-foreground mt-2">Check back later for new opportunities!</p>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
