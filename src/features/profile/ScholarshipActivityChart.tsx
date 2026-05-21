'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useFirestore } from '@/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { TrendingUp, Bookmark, Trophy, Send } from 'lucide-react';
import type { UserProfile } from '@/server/db/user-data';

interface ScholarshipActivityChartProps {
    userId: string;
    userProfile: UserProfile;
}

interface StatItem {
    name: string;
    value: number;
    color: string;
    icon: React.ReactNode;
    label: string;
}

export function ScholarshipActivityChart({ userId, userProfile }: ScholarshipActivityChartProps) {
    const [stats, setStats] = useState<StatItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const db = useFirestore();

    useEffect(() => {
        if (!db) return;

        async function fetchStats() {
            try {
                // Correct collection name: bookmarkedScholarships
                const bookmarkSnap = await getDocs(
                    collection(db!, 'users', userId, 'bookmarkedScholarships')
                );
                const savedCount = bookmarkSnap.size;

                // Real application count from applications collection
                let appliedCount = 0;
                let wonCount = 0;
                try {
                    const appSnap = await getDocs(
                        query(collection(db!, 'applications'), where('userId', '==', userId))
                    );
                    appliedCount = appSnap.size;
                    wonCount = appSnap.docs.filter(d => d.data().status === 'Awarded').length;
                } catch {
                    // applications collection may not exist yet — silently ignore
                }

                setStats([
                    {
                        name: 'Saved',
                        value: savedCount,
                        color: '#f472b6',
                        icon: <Bookmark className="w-4 h-4" />,
                        label: savedCount === 1 ? 'scholarship' : 'scholarships',
                    },
                    {
                        name: 'Applied',
                        value: appliedCount,
                        color: '#facc15',
                        icon: <Send className="w-4 h-4" />,
                        label: appliedCount === 1 ? 'application' : 'applications',
                    },
                    {
                        name: 'Won',
                        value: wonCount,
                        color: '#4ade80',
                        icon: <Trophy className="w-4 h-4" />,
                        label: wonCount === 1 ? 'scholarship' : 'scholarships',
                    },
                ]);
            } catch (error) {
                console.error('Error fetching activity stats:', error);
                // Fallback to zero state — never crash
                setStats([
                    { name: 'Saved',   value: 0, color: '#f472b6', icon: <Bookmark className="w-4 h-4" />, label: 'scholarships' },
                    { name: 'Applied', value: 0, color: '#facc15', icon: <Send className="w-4 h-4" />,     label: 'applications' },
                    { name: 'Won',     value: 0, color: '#4ade80', icon: <Trophy className="w-4 h-4" />,   label: 'scholarships' },
                ]);
            } finally {
                setIsLoading(false);
            }
        }

        fetchStats();
    }, [db, userId]);

    return (
        <Card className="overflow-hidden bg-gradient-to-br from-card to-secondary/20">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 font-headline text-base">
                    <TrendingUp className="h-4 w-4 text-theme-600 dark:text-theme-400" />
                    Scholarship Activity
                </CardTitle>
                <CardDescription className="text-xs">Your progress at a glance</CardDescription>
            </CardHeader>

            <CardContent className="pb-5 space-y-3">
                {isLoading ? (
                    // Fixed-height skeleton — prevents layout stretching
                    <>
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />
                        ))}
                    </>
                ) : (
                    stats.map((stat) => {
                        const pct = stats[0].value > 0 && stat.name !== 'Saved'
                            ? Math.round((stat.value / Math.max(stats[0].value, 1)) * 100)
                            : 100;

                        return (
                            <div
                                key={stat.name}
                                className="flex items-center gap-3 p-3 rounded-xl bg-background border shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
                            >
                                {/* Colour dot */}
                                <div
                                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                                    style={{ backgroundColor: `${stat.color}25`, color: stat.color }}
                                >
                                    {stat.icon}
                                </div>

                                {/* Text */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline justify-between mb-1">
                                        <span className="text-xs font-medium text-muted-foreground">{stat.name}</span>
                                        <span className="text-lg font-bold font-headline tabular-nums leading-none">
                                            {stat.value}
                                        </span>
                                    </div>
                                    {/* Micro progress bar */}
                                    <div className="h-1 rounded-full bg-secondary overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-700"
                                            style={{
                                                width: `${stat.value === 0 ? 0 : Math.max(pct, 8)}%`,
                                                backgroundColor: stat.color,
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}

                {/* Profile completion hint */}
                {!isLoading && stats[0].value === 0 && (
                    <p className="text-xs text-center text-muted-foreground pt-1">
                        Bookmark scholarships to see your activity here.
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
