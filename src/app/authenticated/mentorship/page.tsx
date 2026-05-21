'use client';

import { useState, useEffect } from 'react';
import { useAuth, useFirestore } from '@/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Loader2, Search, GraduationCap, MapPin, ShieldCheck, Lock, Trophy, MessageCircle, Star } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { MentorshipRequestModal } from '@/components/mentorship/MentorshipRequestModal';
import { MentorDashboard } from '@/components/mentorship/MentorDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type MentorProfile = {
  uid: string;
  fullName: string;
  photoURL?: string;
  educationEntries?: Array<{ level?: string; degree?: string; institution?: string; fieldOfStudy?: string; specialisation?: string }>;
  stateOfDomicile?: string;
  bio?: string;
  karmaPoints?: number;
  scholarshipsWon?: Array<string | { title: string }>;
  skills?: string;
};

type WonApplication = {
  id: string;
  scholarshipId: string;
  scholarshipTitle?: string;
};

export default function MentorshipHubPage() {
  const [mentors, setMentors] = useState<MentorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCurrentUserMentor, setIsCurrentUserMentor] = useState(false);
  const [isEligible, setIsEligible] = useState(false);
  const [wonApplications, setWonApplications] = useState<WonApplication[]>([]);
  const [selectedMentor, setSelectedMentor] = useState<MentorProfile | null>(null);

  const auth = useAuth();
  const db = useFirestore();

  useEffect(() => {
    if (!auth?.currentUser || !db) return;
    const uid = auth.currentUser.uid;

    const init = async () => {
      try {
        // Check if current user is a mentor
        const mySnap = await getDoc(doc(db, 'users', uid));
        if (mySnap.exists() && mySnap.data().isMentor) setIsCurrentUserMentor(true);

        // Check eligibility: does user have any accepted application?
        const appSnap = await getDocs(
          query(collection(db, 'applications'), where('studentId', '==', uid), where('status', '==', 'accepted'))
        );
        if (!appSnap.empty) {
          setIsEligible(true);
          setWonApplications(appSnap.docs.map(d => ({
            id: d.id,
            scholarshipId: d.data().scholarshipId,
            scholarshipTitle: d.data().scholarshipTitle || d.data().resumeSnapshot?.scholarshipTitle,
          })));
        }

        // Load mentors
        const mentorSnap = await getDocs(query(collection(db, 'users'), where('isMentor', '==', true)));
        const loaded: MentorProfile[] = mentorSnap.docs
          .filter(d => d.id !== uid)
          .map(d => ({ uid: d.id, ...d.data() } as MentorProfile));
        setMentors(loaded);

      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };

    init();
  }, [auth?.currentUser, db]);

  const filtered = mentors.filter(m => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const latestEdu = m.educationEntries?.[m.educationEntries.length - 1];
    return m.fullName?.toLowerCase().includes(q)
      || latestEdu?.fieldOfStudy?.toLowerCase().includes(q)
      || latestEdu?.specialisation?.toLowerCase().includes(q)
      || m.stateOfDomicile?.toLowerCase().includes(q);
  });

  return (
    <div className="container max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-headline font-bold">Mentorship Hub</h1>
        <p className="text-muted-foreground mt-1">Connect with verified scholars who've walked your path.</p>
      </div>

      {/* Eligibility Banner */}
      {isEligible ? (
        <div className="bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 border border-emerald-400/30 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center shrink-0">
            <Trophy className="w-6 h-6 text-emerald-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-emerald-800 dark:text-emerald-300">You're a Verified Scholar! 🎉</p>
            <p className="text-sm text-emerald-700/70 dark:text-emerald-400/70 mt-0.5">
              You've won a scholarship — you can now request mentorship from any mentor below.
            </p>
          </div>
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 shrink-0">Eligible</Badge>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-amber-500/10 to-amber-500/5 border border-amber-400/30 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/40 rounded-full flex items-center justify-center shrink-0">
            <Lock className="w-6 h-6 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-amber-800 dark:text-amber-300">Mentorship is unlocked when you win a scholarship</p>
            <p className="text-sm text-amber-700/70 dark:text-amber-400/70 mt-0.5">
              Apply to scholarships on your dashboard. Once accepted, this hub fully unlocks.
            </p>
            <div className="mt-3 w-full bg-amber-200/50 rounded-full h-1.5">
              <div className="h-1.5 bg-amber-400 rounded-full w-1/4" />
            </div>
            <p className="text-[10px] text-amber-600 mt-1">0 scholarships won · Win 1 to unlock</p>
          </div>
        </div>
      )}

      <Tabs defaultValue="discover">
        <TabsList className="mb-2">
          <TabsTrigger value="discover">Discover Mentors</TabsTrigger>
          {isCurrentUserMentor && <TabsTrigger value="dashboard">My Mentor Dashboard</TabsTrigger>}
        </TabsList>

        <TabsContent value="discover">
          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by name, field of study, or state..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed rounded-xl">
              <p className="text-muted-foreground">No mentors found matching your search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((mentor, i) => {
                const latestEdu = mentor.educationEntries?.[mentor.educationEntries.length - 1];
                const wonCount = mentor.scholarshipsWon?.length ?? 0;
                return (
                  <motion.div key={mentor.uid} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <Card className="hover:shadow-lg hover:border-primary/30 transition-all h-full flex flex-col">
                      <CardContent className="pt-6 flex-1 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="relative">
                            <Avatar className="w-12 h-12 border-2 border-primary/20">
                              <AvatarImage src={mentor.photoURL} />
                              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                {mentor.fullName?.charAt(0) ?? '?'}
                              </AvatarFallback>
                            </Avatar>
                            {wonCount > 0 && (
                              <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 border-2 border-background">
                                <ShieldCheck className="w-2.5 h-2.5" />
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{mentor.fullName}</p>
                            {latestEdu?.fieldOfStudy && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <GraduationCap className="w-3 h-3 shrink-0" /> {latestEdu.fieldOfStudy}
                              </p>
                            )}
                            {mentor.stateOfDomicile && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <MapPin className="w-3 h-3 shrink-0" /> {mentor.stateOfDomicile}
                              </p>
                            )}
                          </div>
                        </div>

                        {mentor.bio && <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{mentor.bio}</p>}

                        {wonCount > 0 && (
                          <div className="flex items-center gap-1.5">
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                              {wonCount} scholarship{wonCount !== 1 ? 's' : ''} won
                            </span>
                          </div>
                        )}

                        {mentor.karmaPoints !== undefined && (
                          <Badge variant="secondary" className="text-[10px]">⚡ {mentor.karmaPoints} Karma</Badge>
                        )}
                      </CardContent>

                      <CardFooter className="pt-0 pb-4">
                        <Button
                          className="w-full gap-2"
                          variant={isEligible ? 'default' : 'secondary'}
                          disabled={!isEligible}
                          onClick={() => isEligible && setSelectedMentor(mentor)}
                        >
                          <MessageCircle className="w-4 h-4" />
                          {isEligible ? 'Request Mentorship' : 'Win a Scholarship to Unlock'}
                        </Button>
                      </CardFooter>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {isCurrentUserMentor && (
          <TabsContent value="dashboard">
            <MentorDashboard />
          </TabsContent>
        )}
      </Tabs>

      {selectedMentor && (
        <MentorshipRequestModal
          mentor={selectedMentor}
          wonApplications={wonApplications}
          open={!!selectedMentor}
          onOpenChange={(o) => !o && setSelectedMentor(null)}
        />
      )}
    </div>
  );
}
