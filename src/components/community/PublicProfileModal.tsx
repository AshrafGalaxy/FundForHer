'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ShieldCheck, GraduationCap, MapPin, Link as LinkIcon, Loader2, LockKeyhole, Trophy, Star } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import type { UserProfile } from '@/server/db/user-data';

interface Props {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function InfoPill({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="bg-muted/40 border border-border/50 rounded-lg px-3 py-2">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

export function PublicProfileModal({ userId, open, onOpenChange }: Props) {
  const db = useFirestore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPrivate, setIsPrivate] = useState(false);

  useEffect(() => {
    if (!db || !userId || !open) return;
    // D4 FIX: Reset before each fetch so a different userId never shows stale data
    setProfile(null);
    setIsPrivate(false);
    setLoading(true);
    getDoc(doc(db, 'users', userId))
      .then(snap => {
        if (!snap.exists()) { setIsPrivate(true); return; }
        const data = snap.data() as UserProfile;
        if (data.isProfilePublic === false) { setIsPrivate(true); return; }
        setProfile(data);
      })
      .catch(() => setIsPrivate(true))
      .finally(() => setLoading(false));
  }, [db, userId, open]);


  const latestEdu = profile?.educationEntries?.[profile.educationEntries.length - 1];
  const hasScholarships = (profile?.scholarshipsWon?.length ?? 0) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-background">
        {loading ? (
          <div className="flex justify-center items-center h-52">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : isPrivate ? (
          <div className="flex flex-col items-center justify-center h-52 gap-4 text-center p-6">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <LockKeyhole className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold">This profile is private</p>
              <p className="text-sm text-muted-foreground mt-1">This user has chosen to keep their profile private.</p>
            </div>
          </div>
        ) : profile ? (
          <>
            {/* Banner + Avatar */}
            <div className="h-20 bg-gradient-to-r from-primary/30 via-primary/20 to-secondary/30 relative">
              <div className="absolute -bottom-8 left-5">
                <Avatar className="w-16 h-16 border-4 border-background shadow-lg">
                  <AvatarImage src={profile.photoURL || ''} />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">
                    {(profile.fullName || 'U').charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>

            <ScrollArea className="max-h-[70vh]">
              <div className="pt-10 px-5 pb-5 space-y-4">
                {/* Name + badges */}
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-headline text-xl font-bold">{profile.fullName}</h2>
                    {hasScholarships && (
                      <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-300">
                        <ShieldCheck className="w-3 h-3 mr-1" /> Verified Scholar
                      </Badge>
                    )}
                  </div>
                  {profile.username && (
                    <p className="text-sm text-muted-foreground mt-0.5">@{profile.username}</p>
                  )}
                  {profile.tagline && (
                    <p className="text-sm italic text-muted-foreground mt-1">{profile.tagline}</p>
                  )}
                </div>

                {/* Location */}
                {(profile.city || profile.stateOfDomicile) && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    {[profile.city, profile.stateOfDomicile].filter(Boolean).join(', ')}
                  </p>
                )}


                {/* Bio */}
                {profile.bio && (
                  <p className="text-sm leading-relaxed text-foreground/80">{profile.bio}</p>
                )}

                <Separator />

                {/* Latest Education */}
                {latestEdu && (
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 bg-blue-50 dark:bg-blue-950/30 rounded-md shrink-0 mt-0.5">
                      <GraduationCap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{latestEdu.degreeName || latestEdu.degreeLevel}</p>
                      <p className="text-xs text-muted-foreground">{latestEdu.institution}</p>
                      {latestEdu.specialisation && <p className="text-xs text-muted-foreground">{latestEdu.specialisation}</p>}
                    </div>
                  </div>

                )}

                {/* Scholarships Won */}
                {hasScholarships && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5 text-amber-500" /> Scholarships Won
                    </p>
                    <div className="space-y-1.5">
                      {profile.scholarshipsWon!.map((s: any, i: number) => (
                        <div key={i} className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 rounded-lg px-3 py-2 flex items-center gap-2">
                          <Star className="w-3 h-3 text-amber-500 fill-amber-400 shrink-0" />
                          <p className="text-xs font-medium">{typeof s === 'string' ? s : s.title || 'Scholarship'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}


              </div>
            </ScrollArea>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
