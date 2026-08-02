'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  ThumbsUp, ThumbsDown, Star, Loader2, ArrowRight, FileText,
  User, GraduationCap, MapPin, DollarSign, Wrench, Trophy,
  FileCheck, MessageSquare, ChevronDown, ChevronUp,
} from 'lucide-react';
import type { Application, ApplicationStatus, StatusHistoryEntry } from '@/lib/types';
import { useState } from 'react';
import { updateDoc, doc, arrayUnion, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface Props {
  application: Application | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (id: string, newStatus: ApplicationStatus) => void;
}

const STATUS_ACTIONS: {
  status: ApplicationStatus;
  label: string;
  color: string;
  description: string;
}[] = [
  { status: 'reviewing',   label: 'Mark Under Review', color: 'bg-blue-600 hover:bg-blue-700 text-white',            description: 'Begin reviewing this application' },
  { status: 'shortlisted', label: 'Shortlist',          color: 'bg-purple-600 hover:bg-purple-700 text-white',        description: 'Move to shortlist for final decision' },
  { status: 'accepted',    label: 'Accept & Award',     color: 'bg-emerald-600 hover:bg-emerald-700 text-white',      description: 'Award the scholarship to this student' },
  { status: 'rejected',    label: 'Reject',             color: 'bg-destructive hover:bg-destructive/90 text-white',   description: 'Decline this application' },
];

const STATUS_DISPLAY: Record<ApplicationStatus, string> = {
  new:         'New',
  reviewing:   'Under Review',
  shortlisted: 'Shortlisted',
  accepted:    'Awarded',
  rejected:    'Rejected',
};

function InfoRow({ label, value }: { label: string; value?: string | number | boolean | null }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="grid grid-cols-5 gap-2 py-1.5 border-b border-border/40 last:border-0">
      <span className="col-span-2 text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</span>
      <span className="col-span-3 text-sm font-medium">{String(value)}</span>
    </div>
  );
}

function SectionHeader({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3 mt-5 first:mt-0">
      <div className="p-1.5 bg-primary/10 rounded-md"><Icon className="w-4 h-4 text-primary" /></div>
      <h4 className="font-semibold text-sm text-foreground">{label}</h4>
    </div>
  );
}

function safeToDate(ts: any): Date | null {
  if (!ts) return null;
  if (ts instanceof Date) return ts;
  if (typeof ts?.toDate === 'function') return ts.toDate();
  return null;
}

export function CandidateReviewModal({ application, open, onOpenChange, onStatusChange }: Props) {
  const db = useFirestore();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [comment, setComment] = useState('');
  const [pendingStatus, setPendingStatus] = useState<ApplicationStatus | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  if (!application) return null;

  // Safe field resolution — supports both new flat shape and legacy resumeSnapshot
  const name         = application.fullName || application.resumeSnapshot?.fullName || 'Unknown';
  const email        = application.email || application.resumeSnapshot?.email || '';
  const phone        = application.phone || application.resumeSnapshot?.phone;
  const qualification = application.currentEducationLevel || application.resumeSnapshot?.qualification;
  const institution  = application.institution || application.resumeSnapshot?.college;
  const appliedDate  = safeToDate(application.appliedAt);
  const statusHistory: StatusHistoryEntry[] = application.statusHistory ?? [];

  const initiateAction = (status: ApplicationStatus) => {
    setPendingStatus(status);
    setComment('');
    setShowConfirm(true);
  };

  const cancelConfirm = () => {
    setShowConfirm(false);
    setPendingStatus(null);
    setComment('');
  };

  const confirmAction = async () => {
    if (!db || !pendingStatus) return;
    setIsUpdating(true);

    const historyEntry: StatusHistoryEntry = {
      status: pendingStatus,
      timestamp: Timestamp.now(),
      updatedBy: 'provider',
      ...(comment.trim() ? { comment: comment.trim() } : {}),
    };

    try {
      await updateDoc(doc(db, 'applications', application.id), {
        status: pendingStatus,
        lastStatusUpdate: serverTimestamp(),
        providerComment: comment.trim() || null,
        statusHistory: arrayUnion(historyEntry),
      });
      onStatusChange(application.id, pendingStatus);
      setShowConfirm(false);
      setPendingStatus(null);
      setComment('');
      toast({
        title: 'Status Updated',
        description: `${name} has been moved to "${STATUS_DISPLAY[pendingStatus]}".`,
      });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Update Failed', description: err.message });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { onOpenChange(v); if (!v) cancelConfirm(); }}>
      <DialogContent className="max-w-5xl h-[88vh] flex flex-col p-0 overflow-hidden bg-background">

        {/* ── Header ───────────────────────────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-4 border-b flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-xl shrink-0">
              {name.charAt(0).toUpperCase()}
            </div>
            <div>
              <DialogTitle className="text-xl font-headline font-bold">{name}</DialogTitle>
              <DialogDescription className="flex items-center gap-3 mt-0.5">
                <span className="text-xs">{email}</span>
                {phone && <span className="text-xs">· {phone}</span>}
                <Badge variant={application.matchScore >= 75 ? 'default' : 'secondary'}
                  className={cn('text-[10px]',
                    application.matchScore >= 75 ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                    application.matchScore >= 50 ? 'bg-amber-100 text-amber-800 border-amber-200' : '')}>
                  <Star className="w-2.5 h-2.5 mr-1 fill-current" /> {application.matchScore}% Match
                </Badge>
              </DialogDescription>
            </div>
          </div>
          <Badge variant="outline" className="uppercase tracking-widest text-xs shrink-0">
            {STATUS_DISPLAY[application.status] ?? application.status}
          </Badge>
        </div>

        <div className="flex flex-1 overflow-hidden">

          {/* ── Left: Full Candidate Profile ─────────────────────────────────── */}
          <ScrollArea className="flex-1 border-r">
            <div className="p-6 space-y-1">

              <SectionHeader icon={User} label="Personal Information" />
              <InfoRow label="Gender"       value={application.gender} />
              <InfoRow label="Date of Birth" value={application.dateOfBirth} />
              <InfoRow label="Category"     value={application.category} />
              <InfoRow label="Religion"     value={application.religion} />
              <InfoRow label="Has Disability" value={application.hasDisability ? 'Yes' : undefined} />

              <SectionHeader icon={MapPin} label="Location" />
              <InfoRow label="City"  value={application.city} />
              <InfoRow label="State" value={application.state} />

              <SectionHeader icon={GraduationCap} label="Academic Background" />
              <InfoRow label="Education Level" value={application.currentEducationLevel || qualification} />
              <InfoRow label="Institution"     value={application.institution || institution} />
              <InfoRow label="Degree"          value={application.degree} />
              <InfoRow label="Field of Study"  value={application.fieldOfStudy} />
              <InfoRow label="Score / CGPA"    value={application.currentScore} />
              <InfoRow label="Graduation Year" value={application.graduationYear} />

              <SectionHeader icon={DollarSign} label="Financial Background" />
              <InfoRow label="Annual Family Income" value={application.annualFamilyIncome ? `₹${application.annualFamilyIncome}` : undefined} />
              <InfoRow label="Ration Card"          value={application.rationCard} />

              <SectionHeader icon={Wrench} label="Skills & Achievements" />
              {application.skills && (
                <div className="py-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Skills</p>
                  <p className="text-sm leading-relaxed">{application.skills}</p>
                </div>
              )}
              {application.achievements && (
                <div className="py-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Achievements</p>
                  <p className="text-sm leading-relaxed">{application.achievements}</p>
                </div>
              )}

              {application.personalStatement && (
                <>
                  <SectionHeader icon={FileText} label="Personal Statement / Essay" />
                  <div className="bg-muted/40 rounded-xl p-4 border border-border/50">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{application.personalStatement}</p>
                  </div>
                </>
              )}

              {application.vaultDocIds && application.vaultDocIds.length > 0 && (
                <>
                  <SectionHeader icon={FileCheck} label="Submitted Documents" />
                  <div className="flex flex-wrap gap-2">
                    {application.vaultDocIds.map((docId, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        <FileText className="w-3 h-3 mr-1" /> {docId}
                      </Badge>
                    ))}
                  </div>
                </>
              )}

              {application.matchScore > 0 && (
                <>
                  <SectionHeader icon={Star} label="AI Match Analysis" />
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                    <p className="text-sm leading-relaxed">
                      This candidate achieves a{' '}
                      <strong className={cn(application.matchScore >= 75 ? 'text-emerald-600' : 'text-amber-600')}>
                        {application.matchScore}% match
                      </strong>{' '}
                      against your scholarship criteria.{' '}
                      {application.matchScore >= 75 ? 'Highly recommended for shortlisting.' :
                       application.matchScore >= 50 ? 'Meets partial criteria — review carefully.' :
                       'Low match — consider criteria alignment.'}
                    </p>
                  </div>
                </>
              )}

              {/* Status History (expandable) */}
              {statusHistory.length > 0 && (
                <>
                  <Separator className="mt-5" />
                  <button
                    className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground mt-4 transition-colors"
                    onClick={() => setHistoryExpanded(e => !e)}
                  >
                    {historyExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    Status History ({statusHistory.length} events)
                  </button>
                  {historyExpanded && (
                    <div className="mt-3 space-y-3 pb-2">
                      {statusHistory.map((entry, i) => {
                        const entryDate = safeToDate(entry.timestamp);
                        return (
                          <div key={i} className="flex gap-3 text-xs">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                            <div>
                              <p className="font-semibold">{STATUS_DISPLAY[entry.status] ?? entry.status}</p>
                              {entryDate && <p className="text-muted-foreground">{format(entryDate, 'dd MMM yyyy, h:mm a')}</p>}
                              {entry.comment && (
                                <p className="mt-1 text-foreground/70 bg-muted/30 px-2 py-1 rounded border">"{entry.comment}"</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>

          {/* ── Right: Action Panel ───────────────────────────────────────────── */}
          <div className="w-80 bg-secondary/10 p-5 flex flex-col gap-4 shrink-0 overflow-y-auto">

            {!showConfirm ? (
              <>
                <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Move Candidate</h3>
                <div className="flex flex-col gap-2">
                  {STATUS_ACTIONS.map(({ status, label, color, description }) => (
                    <Button
                      key={status}
                      className={cn('w-full justify-start gap-2', color)}
                      onClick={() => initiateAction(status)}
                      disabled={isUpdating || application.status === status}
                    >
                      <ArrowRight className="w-4 h-4 shrink-0" />
                      <span className="text-left">
                        <span className="block text-sm font-semibold">{label}</span>
                        <span className="block text-[10px] opacity-80">{description}</span>
                      </span>
                    </Button>
                  ))}
                </div>
              </>
            ) : (
              /* Confirm + optional comment panel */
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-sm">Confirm Status Change</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Moving <strong>{name}</strong> to{' '}
                    <strong className="text-foreground">{STATUS_DISPLAY[pendingStatus!]}</strong>.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="feedback-comment" className="flex items-center gap-1.5 text-xs font-medium">
                    <MessageSquare className="w-3.5 h-3.5 text-primary" />
                    Feedback for Student{' '}
                    <span className="text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <Textarea
                    id="feedback-comment"
                    placeholder={
                      pendingStatus === 'rejected'
                        ? 'e.g. Your CGPA does not meet the minimum requirement of 7.5...'
                        : pendingStatus === 'accepted'
                        ? 'e.g. Congratulations! Your application stood out for...'
                        : 'Add any notes or feedback for the student...'
                    }
                    value={comment}
                    onChange={e => setComment(e.target.value.slice(0, 500))}
                    className="min-h-[100px] resize-none text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground text-right">
                    {comment.length}/500 · Visible only to this student
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    onClick={confirmAction}
                    disabled={isUpdating}
                    className={cn('w-full gap-2',
                      pendingStatus === 'accepted' ? 'bg-emerald-600 hover:bg-emerald-700' :
                      pendingStatus === 'rejected' ? 'bg-destructive hover:bg-destructive/90' :
                      pendingStatus === 'shortlisted' ? 'bg-purple-600 hover:bg-purple-700' :
                      'bg-blue-600 hover:bg-blue-700',
                      'text-white',
                    )}
                  >
                    {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                    Confirm — {STATUS_DISPLAY[pendingStatus!]}
                  </Button>
                  <Button variant="outline" className="w-full" onClick={cancelConfirm} disabled={isUpdating}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            <Separator />

            {/* Application summary */}
            <div className="space-y-2 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground text-sm">Application Summary</p>
              <div className="flex justify-between"><span>Match Score</span><strong className="text-foreground">{application.matchScore}%</strong></div>
              <div className="flex justify-between"><span>Current Status</span><strong className="text-foreground capitalize">{STATUS_DISPLAY[application.status]}</strong></div>
              <div className="flex justify-between"><span>Applied</span><strong className="text-foreground">{appliedDate ? format(appliedDate, 'dd MMM yyyy') : '—'}</strong></div>
              {application.lastStatusUpdate && (
                <div className="flex justify-between">
                  <span>Last Updated</span>
                  <strong className="text-foreground">
                    {safeToDate(application.lastStatusUpdate) ? format(safeToDate(application.lastStatusUpdate)!, 'dd MMM yyyy') : '—'}
                  </strong>
                </div>
              )}
            </div>

            {/* Previous provider comment */}
            {application.providerComment && (
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 rounded-lg p-3 text-xs">
                <p className="font-semibold text-amber-800 dark:text-amber-300 mb-1 flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" /> Last Feedback
                </p>
                <p className="text-amber-700/80 dark:text-amber-400/80 leading-relaxed">{application.providerComment}</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
