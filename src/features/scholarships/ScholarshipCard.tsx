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

interface ScholarshipCardProps {
  scholarship: Scholarship;
  isBookmarked: boolean;
  onToggleBookmark: (scholarship: Scholarship) => void;
}

export const ScholarshipCard = ({
  scholarship,
  isBookmarked,
  onToggleBookmark,
}: ScholarshipCardProps) => {
  const { id, title, provider, amount, deadline, fieldOfStudy, eligibility, isFeatured, lastUpdated, status, providerLogo } = scholarship;
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const daysRemaining = isClient && deadline ? formatDistanceToNow(deadline, { addSuffix: true }) : '...';
  const lastUpdatedText = isClient && lastUpdated ? format(lastUpdated, 'dd-MM-yyyy') : '...';

  const getDeadlineColor = () => {
    if (!deadline) return 'bg-gray-500';
    const days = (deadline.getTime() - new Date().getTime()) / (1000 * 3600 * 24);
    if (days < 7) return 'bg-red-500';
    if (days < 30) return 'bg-yellow-500';
    return 'bg-green-500';
  }

  return (
    <Card className="flex flex-col h-full transition-all duration-300 hover:shadow-2xl hover:shadow-theme-200/50 dark:hover:shadow-theme-900/30 hover:-translate-y-1 relative group overflow-hidden border-border dark:border-border hover:border-theme-300/50 dark:hover:border-theme-700/50">
      <Link href={`/scholarship/${id}`} className="flex flex-col flex-grow p-0 relative z-10">
        <CardHeader className="pt-6 pb-4 w-full relative">
          {/* Subtle Glassmorphism Header Gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-theme-50/80 to-transparent dark:from-theme-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none -z-10" />

          <div className="flex justify-between items-start mb-2">
            {providerLogo ? (
              <div className="w-16 h-8 relative mr-4">
                <Image src={providerLogo} alt={`${provider} logo`} layout="fill" objectFit="contain" />
              </div>
            ) : (
              isFeatured && <Badge variant="default" className="bg-green-600 hover:bg-green-700">Featured</Badge>
            )}

            {status === 'Live' && deadline && (
              <div className={`px-2 py-1 text-xs text-white rounded-md ${getDeadlineColor()}`}>
                {daysRemaining.replace('about ', '')} to go
              </div>
            )}
            {status === 'Upcoming' && <Badge variant="secondary">Upcoming</Badge>}
            {status === 'Always Open' && <Badge variant="outline">Always Open</Badge>}
          </div>
          <div className="flex justify-between items-start pt-2">
            <CardTitle className="font-headline text-base leading-snug mb-1 pr-8 group-hover:text-theme-900 dark:group-hover:text-theme-300 transition-colors">{title}</CardTitle>
          </div>
          <CardDescription className="flex items-center gap-2 text-sm">
            <School className="h-4 w-4" />
            {provider}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow space-y-3 text-sm w-full">
          <div className="flex items-center gap-2">
            <IndianRupee className="h-5 w-5 text-primary" />
            <div>
              <p className="font-semibold"><span style={{ fontFamily: 'sans-serif' }}>₹</span>{new Intl.NumberFormat('en-IN').format(amount)}</p>
              <p className="text-xs text-muted-foreground">Award</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Target className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold">{eligibility.title}</p>
              <p className="text-muted-foreground line-clamp-2">{eligibility.details}</p>
            </div>
          </div>
          {deadline && (
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold">{isClient ? format(deadline, 'd MMM yyyy') : '...'}</p>
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
        className="absolute top-4 right-2 flex-shrink-0 z-10"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleBookmark(scholarship); }}
        aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark scholarship'}
      >
        <Bookmark
          className={cn(
            'h-5 w-5 text-muted-foreground transition-colors group-hover:text-theme-900 dark:group-hover:text-theme-300/70',
            isBookmarked && 'fill-theme-600 dark:fill-theme-400 text-theme-600 dark:text-theme-400'
          )}
        />
      </Button>
    </Card>
  );
};
