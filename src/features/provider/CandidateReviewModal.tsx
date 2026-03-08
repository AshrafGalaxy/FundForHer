'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ThumbsUp, ThumbsDown, UserCheck, UserX, Star, Loader2, ArrowRight } from 'lucide-react';
import type { Application, ApplicationStatus } from '@/lib/types';
import { useState } from 'react';
import { updateDoc, doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

interface CandidateReviewModalProps {
    application: Application | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onStatusChange: (id: string, newStatus: ApplicationStatus) => void;
}

export function CandidateReviewModal({ application, open, onOpenChange, onStatusChange }: CandidateReviewModalProps) {
    const db = useFirestore();
    const { toast } = useToast();
    const [isUpdating, setIsUpdating] = useState(false);

    if (!application) return null;

    const resume = application.resumeSnapshot;

    const handleAction = async (newStatus: ApplicationStatus) => {
        if (!db) return;
        setIsUpdating(true);
        try {
            const appRef = doc(db, 'applications', application.id);
            await updateDoc(appRef, { status: newStatus });
            onStatusChange(application.id, newStatus);
            onOpenChange(false);
            toast({ title: 'Status Updated', description: `Candidate moved to ${newStatus}` });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 overflow-hidden bg-background">
                {/* Header Strip */}
                <div className="bg-secondary/30 p-4 border-b flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-xl">
                            {resume.fullName.charAt(0)}
                        </div>
                        <div>
                            <DialogTitle className="text-2xl font-headline font-bold">{resume.fullName}</DialogTitle>
                            <DialogDescription className="text-muted-foreground flex items-center gap-2">
                                <span>AI Match Score:</span>
                                <Badge variant={application.matchScore >= 80 ? 'default' : 'secondary'} className={application.matchScore >= 80 ? 'bg-green-100 text-green-800 hover:bg-green-100' : ''}>
                                    {application.matchScore}%
                                </Badge>
                            </DialogDescription>
                        </div>
                    </div>
                    <Badge variant="outline" className="uppercase tracking-widest">{application.status}</Badge>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Left: Document View / Resume */}
                    <div className="flex-1 border-r p-6 overflow-y-auto bg-card">
                        <h3 className="font-semibold text-lg border-b pb-2 mb-4">Applicant Profile Snapshot</h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-muted-foreground block text-xs uppercase tracking-wider">Email Contact</span>
                                    <p className="font-medium">{resume.email}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block text-xs uppercase tracking-wider">Phone</span>
                                    <p className="font-medium">{resume.phone || 'N/A'}</p>
                                </div>
                                <div className="col-span-2">
                                    <span className="text-muted-foreground block text-xs uppercase tracking-wider">Current Qualification</span>
                                    <p className="font-medium">{resume.qualification}</p>
                                </div>
                                <div className="col-span-2">
                                    <span className="text-muted-foreground block text-xs uppercase tracking-wider">Institution / College</span>
                                    <p className="font-medium">{resume.college || 'Not specified'}</p>
                                </div>
                            </div>

                            <div className="mt-6 pt-6 border-t border-dashed">
                                <h4 className="font-medium mb-3 text-sm text-muted-foreground flex items-center gap-2"><Star className="w-4 h-4" /> AI Generated Summary</h4>
                                <p className="text-sm leading-relaxed text-card-foreground">
                                    Based on the applicant's profile and your strict scholarship criteria, this candidate achieves an <strong>{application.matchScore}% match</strong>. They meet your core requirements for {resume.qualification} eligibility perfectly. We recommend sending them to the Shortlist.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Right: Actions & Rubric */}
                    <div className="w-80 bg-secondary/10 p-6 flex flex-col justify-between">
                        <div>
                            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">Quick Decisions</h3>
                            <div className="flex flex-col gap-3">
                                <Button
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                                    onClick={() => handleAction('reviewing')}
                                    disabled={isUpdating || application.status === 'reviewing'}
                                >
                                    {isUpdating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                                    Mark as Reviewing
                                </Button>

                                <Button
                                    className="w-full bg-purple-600 hover:bg-purple-700 text-white shadow-sm border border-purple-800/20"
                                    onClick={() => handleAction('shortlisted')}
                                    disabled={isUpdating || application.status === 'shortlisted'}
                                >
                                    {isUpdating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Star className="w-4 h-4 mr-2" />}
                                    Send to Shortlist
                                </Button>

                                <div className="border-t border-border my-2"></div>

                                <Button
                                    className="w-full bg-green-600 hover:bg-green-700 text-white shadow-sm"
                                    onClick={() => handleAction('accepted')}
                                    disabled={isUpdating || application.status === 'accepted'}
                                >
                                    {isUpdating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ThumbsUp className="w-4 h-4 mr-2" />}
                                    Final Accept / Award
                                </Button>

                                <Button
                                    className="w-full"
                                    variant="destructive"
                                    onClick={() => handleAction('rejected')}
                                    disabled={isUpdating || application.status === 'rejected'}
                                >
                                    {isUpdating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ThumbsDown className="w-4 h-4 mr-2" />}
                                    Reject Application
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
