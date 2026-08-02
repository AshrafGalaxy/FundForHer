'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle2, Clock, Star, XCircle, MessageSquare,
  Building2, Calendar, IndianRupee, GraduationCap, PieChart,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import type { ApplicationStatus, StatusHistoryEntry } from '@/lib/types';
import { STATUS_LABELS } from '@/app/authenticated/applications/page';

interface Props {
  application: {
    id: string;
    scholarshipTitle: string;
    provider: string;
    providerLogo?: string;
    amount: number;
    status: ApplicationStatus;
    appliedAt: Date | null;
    lastStatusUpdate: Date | null;
    matchScore: number;
    fieldOfStudy?: string;
    providerComment?: string | null;
    statusHistory?: StatusHistoryEntry[];
    essay?: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_ICON = {
  new:         <Clock className="w-4 h-4 text-primary" />,
  reviewing:   <Clock className="w-4 h-4 text-amber-500" />,
  shortlisted: <Star className="w-4 h-4 text-indigo-500" />,
  accepted:    <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
  rejected:    <XCircle className="w-4 h-4 text-destructive" />,
};

const STATUS_DOT = {
  new:         'bg-primary',
  reviewing:   'bg-amber-400',
  shortlisted: 'bg-indigo-500',
  accepted:    'bg-emerald-500',
  rejected:    'bg-destructive',
};

function toDate(ts: any): Date | null {
  if (!ts) return null;
  if (ts instanceof Date) return ts;
  if (typeof ts?.toDate === 'function') return ts.toDate();
  return null;
}

export function ApplicationDetailModal({ application, open, onOpenChange }: Props) {
  const {
    scholarshipTitle, provider, providerLogo, amount, status,
    appliedAt, lastStatusUpdate, matchScore, fieldOfStudy,
    providerComment, statusHistory, essay,
  } = application;

  const displayStatus = STATUS_LABELS[status] ?? status;
  const dotColor = STATUS_DOT[status] ?? 'bg-primary';

  // Build timeline — always include the initial "Submitted" entry
  const initialEntry: StatusHistoryEntry = {
    status: 'new',
    timestamp: appliedAt,
    updatedBy: 'student',
  };
  const history: StatusHistoryEntry[] = statusHistory && statusHistory.length > 0
    ? statusHistory
    : [initialEntry];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline text-xl pr-8">Application Details</DialogTitle>
        </DialogHeader>

        {/* Scholarship header */}
        <div className="flex items-start gap-4 mt-2">
          <Avatar className="w-12 h-12 rounded-xl border shrink-0">
            {providerLogo && <AvatarImage src={providerLogo} alt={provider} className="object-contain p-1" />}
            <AvatarFallback className="bg-primary/10 text-primary font-bold rounded-xl text-lg">
              {provider.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">{provider}</p>
            <h2 className="font-headline font-bold text-lg leading-tight">{scholarshipTitle}</h2>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {amount > 0 && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <IndianRupee className="w-3 h-3 text-emerald-600" />
                  ₹{amount.toLocaleString('en-IN')}
                </Badge>
              )}
              {fieldOfStudy && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <GraduationCap className="w-3 h-3" /> {fieldOfStudy}
                </Badge>
              )}
              {matchScore > 0 && (
                <Badge variant="secondary" className="text-xs gap-1 bg-indigo-500/10 text-indigo-600 border-indigo-500/20">
                  <PieChart className="w-3 h-3" /> {matchScore}% Match
                </Badge>
              )}
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-1.5">
            <span className={cn('w-2 h-2 rounded-full', dotColor)} />
            <span className="text-sm font-semibold">{displayStatus}</span>
          </div>
        </div>

        <Separator className="my-4" />

        {/* Key dates row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted/30 rounded-xl p-3 border">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Applied On</p>
            <p className="text-sm font-semibold">
              {appliedAt ? format(appliedAt, 'dd MMM yyyy, h:mm a') : '—'}
            </p>
            {appliedAt && <p className="text-xs text-muted-foreground mt-0.5">{formatDistanceToNow(appliedAt, { addSuffix: true })}</p>}
          </div>
          <div className="bg-muted/30 rounded-xl p-3 border">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Last Updated</p>
            <p className="text-sm font-semibold">
              {lastStatusUpdate ? format(lastStatusUpdate, 'dd MMM yyyy, h:mm a') : 'No update yet'}
            </p>
            {lastStatusUpdate && <p className="text-xs text-muted-foreground mt-0.5">{formatDistanceToNow(lastStatusUpdate, { addSuffix: true })}</p>}
          </div>
        </div>

        {/* Provider feedback callout */}
        {providerComment && (
          <div className="mt-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4 text-amber-600 shrink-0" />
              <p className="font-semibold text-sm text-amber-800 dark:text-amber-300">Provider Feedback</p>
            </div>
            <p className="text-sm text-amber-700/80 dark:text-amber-400/80 leading-relaxed whitespace-pre-line">{providerComment}</p>
          </div>
        )}

        {/* Status history timeline */}
        <div className="mt-4">
          <p className="font-semibold text-sm flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-primary" /> Application Timeline
          </p>
          <div className="relative space-y-0">
            {history.map((entry, idx) => {
              const entryDate = toDate(entry.timestamp);
              const entryStatus = entry.status as ApplicationStatus;
              const isLast = idx === history.length - 1;
              return (
                <div key={idx} className="relative flex gap-4 pb-6 last:pb-0">
                  {/* Connector line */}
                  {!isLast && (
                    <div className="absolute left-[14px] top-7 bottom-0 w-0.5 bg-border" />
                  )}
                  {/* Icon */}
                  <div className={cn(
                    'w-7 h-7 rounded-full border-2 border-background shadow flex items-center justify-center shrink-0 mt-0.5',
                    entryStatus === 'accepted' ? 'bg-emerald-100 dark:bg-emerald-900/40' :
                    entryStatus === 'rejected' ? 'bg-red-100 dark:bg-red-900/40' :
                    entryStatus === 'shortlisted' ? 'bg-indigo-100 dark:bg-indigo-900/40' :
                    'bg-primary/10',
                  )}>
                    {STATUS_ICON[entryStatus] ?? <Clock className="w-3.5 h-3.5 text-muted-foreground" />}
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-sm">{STATUS_LABELS[entryStatus] ?? entryStatus}</p>
                      {entryDate && (
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {format(entryDate, 'dd MMM yyyy, h:mm a')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      by {entry.updatedBy === 'provider' ? provider : entry.updatedBy === 'student' ? 'You' : 'System'}
                      {entryDate && ` · ${formatDistanceToNow(entryDate, { addSuffix: true })}`}
                    </p>
                    {entry.comment && (
                      <div className="mt-2 bg-muted/40 border rounded-lg px-3 py-2">
                        <p className="text-xs text-foreground/80 leading-relaxed">{entry.comment}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Personal statement preview */}
        {essay && (
          <>
            <Separator className="my-4" />
            <div>
              <p className="font-semibold text-sm mb-2">Your Personal Statement</p>
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4 bg-muted/30 p-3 rounded-lg border">{essay}</p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
