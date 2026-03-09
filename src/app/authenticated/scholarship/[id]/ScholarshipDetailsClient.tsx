'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { format, isValid } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Award, BookOpen, Calendar, IndianRupee, MapPin, Target, UserCheck, Loader2 } from 'lucide-react';
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
                console.error("Error fetching scholarship:", error);
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


    const awardAmount = (
        <>
            <span style={{ fontFamily: 'sans-serif' }}>₹</span>{new Intl.NumberFormat('en-IN').format(scholarship.amount)}
        </>
    );

    const ApplyButton = () => {
        if (scholarship.officialLink) {
            return (
                <Button asChild size="lg">
                    <a href={scholarship.officialLink} target="_blank" rel="noopener noreferrer">Apply Now</a>
                </Button>
            );
        }
        return (
            <Button asChild size="lg">
                <Link href={`/authenticated/apply?scholarshipId=${scholarship.id}`}>Apply Now</Link>
            </Button>
        );
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto">
                <Button asChild variant="ghost" className="mb-4 -ml-4">
                    <Link href="/authenticated/dashboard">
                        <ArrowLeft className="mr-2" />
                        Back to Scholarships
                    </Link>
                </Button>
                <Card className="shadow-lg">
                    <CardHeader>
                        <div className="flex justify-between items-start gap-4">
                            <CardTitle className="text-3xl font-headline font-bold text-foreground pr-4">{scholarship.title}</CardTitle>
                            {scholarship.isFeatured && <Badge>Featured</Badge>}
                        </div>
                        <CardDescription className="text-lg text-muted-foreground pt-1">{scholarship.provider}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8 pt-2">
                        <p className="text-base leading-relaxed">{scholarship.description}</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
                            <InfoItem icon={<IndianRupee />} label="Award Amount" value={awardAmount} />
                            <InfoItem icon={<Calendar />} label="Application Deadline" value={(scholarship.deadline && isValid(new Date(scholarship.deadline))) ? format(new Date(scholarship.deadline), 'MMMM d, yyyy') : 'N/A'} />
                            <InfoItem icon={<Target />} label="Eligibility Level" value={Array.isArray(scholarship.eligibilityLevel) ? scholarship.eligibilityLevel.join(', ') : scholarship.eligibilityLevel} />
                            <InfoItem icon={<BookOpen />} label="Field of Study" value={Array.isArray(scholarship.fieldOfStudy) ? scholarship.fieldOfStudy.join(', ') : scholarship.fieldOfStudy} />
                            <InfoItem icon={<MapPin />} label="Location" value={scholarship.location.charAt(0).toUpperCase() + scholarship.location.slice(1)} />
                            <InfoItem icon={<Award />} label="Scholarship Type" value={scholarship.scholarshipType} />
                        </div>

                        <div>
                            <h3 className="text-xl font-headline font-semibold mb-3 flex items-center gap-2"><UserCheck className="h-5 w-5 text-theme-600 dark:text-theme-400" />Eligibility Details</h3>
                            <div className="p-4 bg-secondary/70 rounded-lg border">
                                <p className="font-semibold">{scholarship.eligibility?.title || 'General Eligibility'}</p>
                                <p className="text-muted-foreground mt-1">{scholarship.eligibility?.details || 'No specific eligibility details provided.'}</p>
                            </div>
                        </div>

                        <div className="flex justify-center pt-4">
                            <ApplyButton />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

const InfoItem = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | React.ReactNode }) => (
    <div className="flex items-start gap-4">
        <div className="text-theme-600 dark:text-theme-400 mt-1 flex-shrink-0">{icon}</div>
        <div>
            <p className="text-sm text-muted-foreground font-medium">{label}</p>
            <p className="font-semibold text-foreground">{value}</p>
        </div>
    </div>
);
