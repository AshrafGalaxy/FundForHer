'use client';
import { format, formatDistanceToNow } from 'date-fns';
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
  matchScore?: number; // Optional prop for the AI match score
}

export const ScholarshipCard = ({
  scholarship,
  isBookmarked,
  onToggleBookmark,
  matchScore = 95, // Default to a high match for the demo
}: ScholarshipCardProps) => {
  const { id, title, provider, amount, deadline, fieldOfStudy, eligibility, isFeatured, lastUpdated, status, providerLogo } = scholarship;
  const [isClient, setIsClient] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const { appearance } = useCardAppearance();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const daysRemaining = isClient && deadline ? formatDistanceToNow(deadline, { addSuffix: true }) : '...';
  const lastUpdatedText = isClient && lastUpdated ? format(lastUpdated, 'dd-MM-yyyy') : '...';

  const getDeadlineColor = () => {
    if (!deadline) return 'bg-gray-500/80 text-white';
    const days = (deadline.getTime() - new Date().getTime()) / (1000 * 3600 * 24);
    if (days < 7) return 'bg-red-500/90 text-white shadow-red-500/20';
    if (days < 30) return 'bg-orange-500/90 text-white shadow-orange-500/20';
    return 'bg-emerald-500/90 text-white shadow-emerald-500/20';
  }

  if (appearance === 'classic') {
    return (
      <Card className="flex flex-col h-full hover:shadow-lg transition-shadow border-border relative overflow-hidden bg-card">
        <Link href={`/scholarship/${id}`} className="flex flex-col flex-grow p-5 pb-0 relative z-10 w-full h-full text-foreground hover:no-underline">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-3">
              {providerLogo ? (
                <div className="w-10 h-10 relative rounded border overflow-hidden bg-white shrink-0">
                  <Image src={providerLogo} alt={`${provider} logo`} layout="fill" objectFit="contain" className="p-1" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded bg-muted flex items-center justify-center text-muted-foreground font-bold border shrink-0">
                  {provider.charAt(0)}
                </div>
              )}
              <div className="flex items-center">
                <span className="text-sm font-semibold text-muted-foreground uppercase tracking-widest leading-none line-clamp-1">{provider}</span>
              </div>
            </div>
          </div>
          <CardTitle className="font-headline text-xl mb-3 line-clamp-2 leading-snug text-foreground font-bold h-14">
            {title}
          </CardTitle>
          <div className="flex flex-wrap gap-1.5 mb-4 items-center">
            {fieldOfStudy.slice(0, 3).map(field => (
              <span key={field} className="px-2 py-0.5 text-xs font-semibold bg-secondary/80 text-secondary-foreground rounded-md border shadow-sm">
                {field}
              </span>
            ))}
          </div>

          <div className="space-y-3 text-sm flex-grow mb-6 pt-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Amount</span>
              <p className="font-bold text-2xl text-emerald-600 dark:text-emerald-400 flex items-center">
                <span className="font-sans text-xl mr-0.5">₹</span>{new Intl.NumberFormat('en-IN').format(amount)}
              </p>
            </div>

            <div className="flex items-center gap-2 text-muted-foreground pt-2 border-t mt-3 flex-wrap">
              <Calendar className="w-4 h-4 shrink-0 text-foreground" />
              <span className="font-medium text-foreground text-xs uppercase tracking-widest">Deadline:</span>
              <span className="text-sm font-semibold text-foreground">{isClient && deadline ? format(deadline, 'dd MMM yyyy') : '...'}</span>
            </div>

            <div className="flex items-start gap-2 pt-2 text-muted-foreground">
              <Target className="w-4 h-4 mt-0.5 shrink-0 text-foreground" />
              <span className="text-sm line-clamp-2 leading-relaxed"><span className="font-medium text-foreground">{eligibility.title}:</span> {eligibility.details}</span>
            </div>
          </div>
        </Link>
        <div className="p-5 pt-0 mt-auto relative z-10 w-full">
          <Button className="w-full font-bold bg-theme-600 hover:bg-theme-700 text-white" asChild>
            <Link href={`/scholarship/${id}`}>View Details</Link>
          </Button>
        </div>

        <div className="absolute top-4 right-4 z-20">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full shadow-sm bg-background border h-8 w-8 hover:bg-muted focus:ring-2 focus:ring-primary/20"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleBookmark(scholarship); }}
            aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark scholarship'}
          >
            <Bookmark className={cn("h-4 w-4", isBookmarked ? "fill-orange-500 text-orange-500" : "text-muted-foreground")} />
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card
      className="flex flex-col h-full transition-all duration-500 hover:shadow-2xl hover:shadow-theme-300/40 dark:hover:shadow-theme-900/40 hover:-translate-y-2 relative group overflow-hidden border-border dark:border-border hover:border-theme-300/80 dark:hover:border-theme-700/80 bg-card/80 backdrop-blur-sm"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link href={`/scholarship/${id}`} className="flex flex-col flex-grow p-0 relative z-10 w-full h-full">
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

            <div className="flex flex-col items-end gap-1.5">
              {/* Premium Match Badge */}
              <Badge variant="secondary" className="bg-orange-100/80 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border-none px-2 py-0.5 shadow-sm text-[10px] font-bold tracking-wider">
                🔥 MATCH {matchScore}%
              </Badge>

              {status === 'Live' && deadline && (
                <Badge variant="outline" className={cn("border-none px-2 py-0.5 text-[10px] shadow-sm font-semibold tracking-wide", getDeadlineColor())}>
                  {daysRemaining.replace('about ', '')} left
                </Badge>
              )}
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
                    <span className="font-medium mr-1">{eligibility.title}:</span>{eligibility.details}
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
            View Details & Apply
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
