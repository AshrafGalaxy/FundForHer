'use client';
import { format } from 'date-fns';
import { Bookmark, Calendar, IndianRupee, School, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Scholarship } from '@/lib/types';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useCardAppearance } from '@/hooks/useCardAppearance';

import { motion, AnimatePresence } from 'framer-motion';

interface ScholarshipCardProps {
  scholarship: Scholarship;
  isBookmarked: boolean;
  onToggleBookmark: (scholarship: Scholarship) => void;
  matchScore?: number;
  isExpired?: boolean; // True when deadline has passed (computed client-side in real time)
}

export const ScholarshipCard = ({
  scholarship,
  isBookmarked,
  onToggleBookmark,
  matchScore,
  isExpired = false,
}: ScholarshipCardProps) => {
  const { id, title, provider, amount, deadline, fieldOfStudy, eligibility, isFeatured, lastUpdated, status, providerLogo } = scholarship;
  const [isClient, setIsClient] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const { appearance } = useCardAppearance();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const lastUpdatedText = isClient && lastUpdated ? format(lastUpdated, 'dd-MM-yyyy') : '...';

  /**
   * Returns a precise human-readable deadline label + CSS classes based on days remaining.
   * Labels are specific for nearby deadlines and broader for far-future ones.
   */
  const getDeadlineInfo = (): { label: string; className: string; pulse: boolean } => {
    if (!deadline || !isClient) return { label: '...', className: 'bg-gray-400/80 text-white', pulse: false };
    const diffMs = deadline.getTime() - new Date().getTime();
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (days <= 0)  return { label: '🔒 Deadline Passed', className: 'bg-red-600 text-white', pulse: false };
    if (days === 1) return { label: '⚠️ 1 day to go!',   className: 'bg-red-600 text-white shadow-red-600/40', pulse: true };
    if (days === 2) return { label: '⚠️ 2 days to go',   className: 'bg-red-500 text-white shadow-red-500/40', pulse: true };
    if (days === 3) return { label: '🔴 3 days to go',   className: 'bg-red-500 text-white shadow-red-500/40', pulse: false };
    if (days <= 6)  return { label: `🔴 ${days} days to go`,  className: 'bg-red-400/90 text-white shadow-red-400/30', pulse: false };
    if (days === 7) return { label: '🟠 7 days to go',   className: 'bg-orange-500/90 text-white shadow-orange-500/30', pulse: false };
    if (days <= 13) return { label: `${days} days to go`, className: 'bg-orange-400/90 text-white shadow-orange-400/30', pulse: false };
    if (days === 14) return { label: '14 days to go',    className: 'bg-orange-400/90 text-white', pulse: false };
    if (days === 15) return { label: '15 days to go',    className: 'bg-amber-500/90 text-white', pulse: false };
    if (days <= 24) return { label: `${days} days to go`, className: 'bg-amber-500/90 text-white', pulse: false };
    if (days === 25) return { label: '25 days to go',    className: 'bg-amber-400/90 text-white', pulse: false };
    if (days <= 30) return { label: `${days} days to go`, className: 'bg-amber-400/90 text-white', pulse: false };
    if (days <= 44) return { label: '~1 month to go',    className: 'bg-emerald-500/90 text-white', pulse: false };
    if (days <= 59) return { label: '~2 months to go',   className: 'bg-emerald-500/90 text-white', pulse: false };
    if (days <= 89) return { label: '~3 months to go',   className: 'bg-emerald-500/90 text-white', pulse: false };
    if (days <= 119) return { label: '~4 months to go',  className: 'bg-emerald-600/90 text-white', pulse: false };
    return { label: '4+ months to go', className: 'bg-emerald-600/90 text-white', pulse: false };
  };

  const deadlineInfo = getDeadlineInfo();

  if (appearance === 'classic') {
    const classicDeadlineClass = (): string => {
      if (!deadline) return 'bg-gray-500';
      const days = Math.ceil((deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      if (days <= 3)  return 'bg-red-600';
      if (days <= 7)  return 'bg-red-500';
      if (days <= 15) return 'bg-orange-500';
      if (days <= 30) return 'bg-amber-500';
      return 'bg-green-500';
    };

    return (
      <Card className={cn("flex flex-col h-full transition-all duration-300 hover:shadow-2xl hover:shadow-theme-200/50 dark:hover:shadow-theme-900/30 hover:-translate-y-1 relative group overflow-hidden border-border dark:border-border hover:border-theme-300/50 dark:hover:border-theme-700/50", isExpired && "opacity-60 grayscale-[40%] hover:opacity-80")}>
        <Link href={`/authenticated/scholarship/${id}`} className="flex flex-col flex-grow p-0 relative z-10">
          <CardHeader className="pt-6 pb-4 w-full relative">
            {/* Subtle Glassmorphism Header Gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-theme-50/80 to-transparent dark:from-theme-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none -z-10" />

            <div className="flex justify-between items-start mb-2">
              {providerLogo ? (
                <div className="w-16 h-8 relative mr-4">
                  <Image src={providerLogo} alt={`${provider} logo`} layout="fill" objectFit="contain" />
                </div>
              ) : (
                isFeatured && <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-white border-0">Featured</Badge>
              )}

              {/* Deadline countdown — positioned with mr-10 to avoid bookmark button overlap */}
              {!isExpired && status !== 'Upcoming' && status !== 'Always Open' && deadline && (
                <div
                  className={cn(
                    'px-2 py-1 text-xs text-white rounded-md font-semibold mr-10',
                    classicDeadlineClass(),
                    deadlineInfo.pulse && 'animate-pulse',
                  )}
                >
                  {deadlineInfo.label}
                </div>
              )}
              {isExpired && (
                <div className="px-2 py-1 text-xs text-white rounded-md bg-red-600 font-semibold mr-10">
                  🔒 Deadline Passed
                </div>
              )}
              {status === 'Upcoming' && <Badge variant="secondary" className="border-0 mr-10">Upcoming</Badge>}
              {status === 'Always Open' && <Badge variant="outline" className="mr-10">Always Open</Badge>}
            </div>
            <div className="flex justify-between items-start pt-2">
              <CardTitle className="font-headline text-base leading-snug mb-1 pr-8 group-hover:text-theme-900 dark:group-hover:text-theme-300 transition-colors">{title}</CardTitle>
            </div>
            <CardDescription className="flex items-center gap-2 text-sm text-muted-foreground">
              <School className="h-4 w-4" />
              {provider}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow space-y-3 text-sm w-full">
            <div className="flex items-center gap-2">
              <IndianRupee className="h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold text-foreground"><span style={{ fontFamily: 'sans-serif' }}>₹</span>{new Intl.NumberFormat('en-IN').format(amount)}</p>
                <p className="text-xs text-muted-foreground">Award</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Target className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-foreground">{eligibility?.title}</p>
                <p className="text-muted-foreground line-clamp-2">{eligibility?.details}</p>

              </div>
            </div>
            {deadline && (
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-semibold text-foreground">{isClient ? format(deadline, 'd MMM yyyy') : '...'}</p>
                  <p className="text-xs text-muted-foreground">Deadline</p>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex-col items-start gap-3 pt-2 mt-auto w-full">
            <div className="flex flex-wrap gap-2">
              {fieldOfStudy.slice(0, 3).map(field => (
                <span key={field} className="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded-full">
                  {field}
                </span>
              ))}
            </div>
            <Separator />
            <div className="w-full flex justify-between items-center text-xs text-muted-foreground">
              {lastUpdated && <span>Last Updated: {lastUpdatedText}</span>}
            </div>
          </CardFooter>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-2 flex-shrink-0 z-20"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleBookmark(scholarship); }}
          aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark scholarship'}
        >
          <Bookmark
            className={cn(
              'h-5 w-5 text-muted-foreground transition-colors group-hover:text-theme-900 dark:group-hover:text-theme-300/70',
              isBookmarked && 'fill-theme-600 dark:fill-theme-500 text-theme-600 dark:text-theme-500'
            )}
          />
        </Button>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "flex flex-col h-full transition-all duration-500 hover:shadow-2xl hover:shadow-theme-300/40 dark:hover:shadow-theme-900/40 hover:-translate-y-2 relative group overflow-hidden border-border dark:border-border hover:border-theme-300/80 dark:hover:border-theme-700/80 bg-card/80 backdrop-blur-sm",
        isExpired && "opacity-65 grayscale-[35%] hover:opacity-85 hover:grayscale-[20%] transition-all"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link href={`/authenticated/scholarship/${id}`} className="flex flex-col flex-grow p-0 relative z-10 w-full h-full">
        <CardHeader className="pt-6 pb-4 w-full relative">
          {/* Subtle Glassmorphism Header Gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-theme-100/50 to-transparent dark:from-theme-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none -z-10" />

          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2">
              {providerLogo ? (
                <div className="w-12 h-12 relative rounded-lg bg-white overflow-hidden border shadow-sm">
                  <Image src={providerLogo} alt={`${provider} logo`} layout="fill" objectFit="contain" className="p-1" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-lg bg-theme-100 dark:bg-theme-900 flex items-center justify-center text-theme-600 dark:text-theme-400 font-bold border shadow-sm">
                  {provider.charAt(0)}
                </div>
              )}

              <div className="flex flex-col">
                <span className="text-xs font-semibold text-muted-foreground tabular-nums tracking-wide uppercase">{provider.slice(0, 18)}{provider.length > 18 ? '...' : ''}</span>
              </div>
            </div>

            {/* Right badges — mr-11 creates a 44px gap so absolute bookmark button (top-4 right-4, 36px) never overlaps */}
            <div className="flex flex-col items-end gap-1.5 mr-11 shrink-0">
              {/* Match badge — shown only when real score computed, hidden when expired */}
              {!isExpired && matchScore !== undefined && (
                <Badge
                  variant="secondary"
                  className={cn(
                    'border-none px-2 py-0.5 shadow-sm text-[10px] font-bold tracking-wider',
                    matchScore >= 75
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                      : matchScore >= 50
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
                  )}
                >
                  {matchScore >= 75 ? '✓' : matchScore >= 50 ? '~' : '!'} MATCH {matchScore}%
                </Badge>
              )}

              {/* Deadline countdown badge */}
              {isExpired ? (
                <Badge variant="outline" className="border-none px-2 py-0.5 text-[10px] shadow-sm font-semibold tracking-wide bg-red-600 text-white">
                  🔒 Deadline Passed
                </Badge>
              ) : deadline && status !== 'Always Open' ? (
                <Badge
                  variant="outline"
                  className={cn(
                    'border-none px-2 py-0.5 text-[10px] shadow-lg font-semibold tracking-wide',
                    deadlineInfo.className,
                    deadlineInfo.pulse && 'animate-pulse',
                  )}
                >
                  {deadlineInfo.label}
                </Badge>
              ) : status === 'Always Open' ? (
                <Badge variant="outline" className="border-none px-2 py-0.5 text-[10px] shadow-sm font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                  Always Open
                </Badge>
              ) : null}
            </div>
          </div>

          <div className="pt-1">
            <CardTitle className="font-headline text-lg leading-tight mb-2 group-hover:text-theme-700 dark:group-hover:text-theme-300 transition-colors line-clamp-2">
              {title}
            </CardTitle>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-2">
            {fieldOfStudy.slice(0, 2).map(field => (
              <span key={field} className="px-2 py-0.5 text-[10px] bg-secondary/80 text-secondary-foreground rounded-full border shadow-sm">
                {field}
              </span>
            ))}
            {fieldOfStudy.length > 2 && (
              <span className="px-2 py-0.5 text-[10px] bg-secondary/50 text-secondary-foreground rounded-full border shadow-sm">
                +{fieldOfStudy.length - 2}
              </span>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex-grow space-y-4 text-sm w-full relative pb-16">
          <div className="flex items-baseline gap-2">
            <div>
              <p className="font-semibold text-2xl tracking-tight text-emerald-600 dark:text-emerald-400">
                <span className="font-sans text-xl mr-0.5">₹</span>{new Intl.NumberFormat('en-IN').format(amount)}
              </p>
              <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-semibold mt-0.5">Potential Award</p>
            </div>
          </div>

          {/* Sliding Details Pane */}
          <div className="relative overflow-hidden w-full">
            <motion.div
              initial={{ height: 40, opacity: 1 }}
              animate={{ height: isHovered ? 'auto' : 40, opacity: 1 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="flex flex-col gap-3"
            >
              <div className="flex items-start gap-2 text-muted-foreground group-hover:text-foreground transition-colors">
                <Target className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary/70" />
                <div className="flex-1">
                  <p className="text-xs line-clamp-2 group-hover:line-clamp-4 transition-all duration-300">
                    <span className="font-medium mr-1">{eligibility?.title}:</span>{eligibility?.details}

                  </p>
                </div>
              </div>
            </motion.div>

            {/* Fade Out Gradient for bottom of text when collapsed */}
            <div className={cn("absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-card/80 to-transparent transition-opacity duration-300", isHovered ? "opacity-0" : "opacity-100")} />
          </div>
        </CardContent>

        {/* Hover Action Area */}
        <div className={cn("absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-card via-card to-transparent border-t transform transition-all duration-300 ease-out z-20", isHovered ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 pointer-events-none")}>
          <Button className="w-full shadow-lg shadow-primary/20 bg-theme-600 hover:bg-theme-700 text-white rounded-xl">
            {isExpired ? 'View Details' : 'View Details & Apply'}
          </Button>
        </div>
      </Link>

      <motion.div
        className="absolute top-4 right-4 z-20"
        whileTap={{ scale: 0.8 }}
      >
        <Button
          variant="secondary"
          size="icon"
          className="rounded-full shadow-md bg-white/90 hover:bg-white dark:bg-black/50 dark:hover:bg-black/80 backdrop-blur-sm border border-border/50 h-9 w-9"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleBookmark(scholarship); }}
          aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark scholarship'}
        >
          <AnimatePresence mode="wait">
            {isBookmarked ? (
              <motion.div
                key="bookmarked"
                initial={{ scale: 0, opacity: 0, rotate: -45 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                exit={{ scale: 0, opacity: 0, rotate: 45 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <Bookmark className="h-4 w-4 fill-orange-500 text-orange-500" />
              </motion.div>
            ) : (
              <motion.div
                key="unbookmarked"
                initial={{ scale: 0, opacity: 0, rotate: 45 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                exit={{ scale: 0, opacity: 0, rotate: -45 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <Bookmark className="h-4 w-4 text-muted-foreground/70" />
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </motion.div>
    </Card>
  );
};
