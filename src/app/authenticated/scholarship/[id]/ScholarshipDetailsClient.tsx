'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format, isValid } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  ArrowLeft, Award, BookOpen, Calendar, IndianRupee, MapPin, Target, UserCheck, Loader2, ExternalLink, Clock,
} from 'lucide-react';
import type { Scholarship } from '@/lib/types';
import { useFirestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function ScholarshipDetailsClient({ id }: { id: string }) {
  const router = useRouter();
  const db = useFirestore();
  const [scholarship, setScholarship] = useState<Scholarship | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    const fetchScholarship = async () => {
      try {
        const docRef = doc(db, 'scholarships', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setScholarship({
            id: docSnap.id,
            ...data,
            deadline: data.deadline?.toDate ? data.deadline.toDate() : new Date(data.deadline),
            lastUpdated: data.lastUpdated?.toDate ? data.lastUpdated.toDate() : new Date(data.lastUpdated),
          } as Scholarship);
        } else {
          router.replace('/authenticated/dashboard');
        }
      } catch (error) {
        console.error('Error fetching scholarship:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchScholarship();
  }, [db, id, router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-12 w-12 animate-spin text-theme-600 dark:text-theme-400" />
      </div>
    );
  }

  if (!scholarship) return null;

  // Real-time client-side expiry check
  const isExpired = scholarship.deadline && new Date(scholarship.deadline) < new Date();

  const deadlineDateStr = scholarship.deadline && isValid(new Date(scholarship.deadline))
    ? format(new Date(scholarship.deadline), 'MMMM d, yyyy')
    : 'N/A';

  const awardAmount = (
    <>
      <span style={{ fontFamily: 'sans-serif' }}>₹</span>
      {new Intl.NumberFormat('en-IN').format(scholarship.amount)}
    </>
  );

  return (
    <div className="container mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="max-w-4xl mx-auto">

        {/* Back nav */}
        <Button asChild variant="ghost" className="mb-6 -ml-4 hover:bg-theme-100 dark:hover:bg-theme-900">
          <Link href="/authenticated/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Scholarships
          </Link>
        </Button>

        <Card className="shadow-lg overflow-hidden">
          {/* Top colour bar */}
          <div className={`h-1.5 w-full ${isExpired ? 'bg-red-400' : 'bg-gradient-to-r from-theme-400 via-primary to-theme-600'}`} />

          <CardHeader className="bg-gradient-to-b from-theme-50/50 to-transparent dark:from-theme-900/20 border-b pb-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {scholarship.isFeatured && (
                    <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-0 text-xs">⭐ Featured</Badge>
                  )}
                  {isExpired ? (
                    <Badge variant="outline" className="border-red-400 text-red-600 dark:text-red-400 text-xs gap-1">
                      <Clock className="h-3 w-3" /> Deadline Passed
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-emerald-400 text-emerald-600 dark:text-emerald-400 text-xs">
                      {scholarship.status}
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-2xl md:text-3xl font-headline font-bold text-foreground leading-tight">
                  {scholarship.title}
                </CardTitle>
                <CardDescription className="text-base text-muted-foreground mt-2">{scholarship.provider}</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-8 pt-8 pb-10">
            {/* Description */}
            {scholarship.description && (
              <p className="text-base leading-relaxed text-muted-foreground border-l-4 border-primary/30 pl-4">
                {scholarship.description}
              </p>
            )}

            {/* Key Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <InfoItem icon={<IndianRupee />} label="Award Amount" value={awardAmount} />
              <InfoItem
                icon={<Calendar />}
                label="Application Deadline"
                value={
                  <span className={isExpired ? 'text-red-600 dark:text-red-400 font-semibold' : ''}>
                    {deadlineDateStr}{isExpired ? ' (Passed)' : ''}
                  </span>
                }
              />
              <InfoItem
                icon={<Target />}
                label="Eligibility Level"
                value={Array.isArray(scholarship.eligibilityLevel) ? scholarship.eligibilityLevel.join(', ') : scholarship.eligibilityLevel}
              />
              <InfoItem
                icon={<BookOpen />}
                label="Field of Study"
                value={Array.isArray(scholarship.fieldOfStudy) ? scholarship.fieldOfStudy.join(', ') : scholarship.fieldOfStudy}
              />
              <InfoItem
                icon={<MapPin />}
                label="Location"
                value={scholarship.location.charAt(0).toUpperCase() + scholarship.location.slice(1)}
              />
              <InfoItem icon={<Award />} label="Scholarship Type" value={scholarship.scholarshipType} />
            </div>

            {/* Eligibility Details */}
            <div>
              <h3 className="text-xl font-headline font-semibold mb-3 flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-theme-600 dark:text-theme-400" />
                Eligibility Details
              </h3>
              <div className="p-5 bg-secondary/70 rounded-xl border">
                <p className="font-semibold text-foreground mb-1">
                  {scholarship.eligibility?.title || 'General Eligibility'}
                </p>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  {scholarship.eligibility?.details || 'No specific eligibility details provided.'}
                </p>
              </div>
            </div>

            {/* Expired warning */}
            {isExpired && (
              <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                <Clock className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-700 dark:text-red-400">Application Period Closed</p>
                  <p className="text-sm text-red-600/80 dark:text-red-400/80 mt-0.5">
                    The deadline for this scholarship has passed. You can still view the details for reference, but applications are no longer accepted.
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 border-t">
              {!isExpired ? (
                <>
                  {/* Primary: Apply Now → Apply Page */}
                  <Button
                    asChild
                    size="lg"
                    className="w-full sm:w-auto bg-theme-600 hover:bg-theme-700 text-white shadow-lg shadow-primary/20 rounded-xl px-10 h-12 font-semibold"
                  >
                    <Link href={`/authenticated/apply?scholarshipId=${scholarship.id}`}>
                      Apply Now
                    </Link>
                  </Button>

                  {/* Secondary: Visit official website in new tab (no iframe on this page) */}
                  {scholarship.officialLink && (
                    <Button asChild variant="outline" size="lg" className="w-full sm:w-auto rounded-xl px-8 h-12 gap-2">
                      <a href={scholarship.officialLink} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                        Official Website
                      </a>
                    </Button>
                  )}
                </>
              ) : (
                <Button asChild variant="outline" size="lg" className="w-full sm:w-auto rounded-xl px-8 h-12">
                  <Link href="/authenticated/dashboard">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Find Open Scholarships
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const InfoItem = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | React.ReactNode;
}) => (
  <div className="flex items-start gap-4">
    <div className="text-theme-600 dark:text-theme-400 mt-0.5 flex-shrink-0">{icon}</div>
    <div>
      <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-0.5">{label}</p>
      <p className="font-semibold text-foreground">{value}</p>
    </div>
  </div>
);
