'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Loader2, TrendingUp, Bookmark, Trophy } from 'lucide-react';
import type { UserProfile } from '@/server/db/user-data';

interface ScholarshipActivityChartProps {
    userId: string;
    userProfile: UserProfile;
}

export function ScholarshipActivityChart({ userId, userProfile }: ScholarshipActivityChartProps) {
    const [data, setData] = useState<{ name: string; value: number; color: string }[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const db = useFirestore();

    useEffect(() => {
        async function fetchStats() {
            if (!db) return;
            try {
                // Fetch saved scholarships to display real data
                const savedQuery = query(collection(db, 'users', userId, 'savedScholarships'));
                const savedSnapshot = await getDocs(savedQuery);
                const savedCount = savedSnapshot.size;

                // For demo/gamification purposes, we provide some mocked "applied/won" numbers 
                // until a formal application tracking schema exists.
                const mockApplied = Math.floor(savedCount * 0.4) || 2;
                const mockWon = Math.floor(mockApplied * 0.2) || 0;

                setData([
                    { name: 'Saved', value: savedCount || 5, color: '#fba69b' }, // Theme Pink
                    { name: 'Applied', value: mockApplied, color: '#fde047' }, // Yellow
                    { name: 'Won', value: mockWon, color: '#4ade80' }, // Green
                ]);
            } catch (error) {
                console.error('Error fetching activity stats:', error);
            } finally {
                setIsLoading(false);
            }
        }

        fetchStats();
    }, [db, userId]);

    if (isLoading) {
        return (
            <Card className="flex flex-col items-center justify-center p-8 h-[350px]">
                <Loader2 className="w-8 h-8 animate-spin text-theme-500 mb-4" />
                <p className="text-sm text-muted-foreground animate-pulse">Loading activity dashboard...</p>
            </Card>
        );
    }

    const totalInteractions = data.reduce((acc, curr) => acc + curr.value, 0);

    return (
        <Card className="h-full overflow-hidden bg-gradient-to-br from-card to-secondary/20">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 font-headline text-xl">
                    <TrendingUp className="text-theme-600 dark:text-theme-400" />
                    Scholarship Activity
                </CardTitle>
                <CardDescription>
                    Track your progress and match history
                </CardDescription>
            </CardHeader>

            <CardContent className="flex flex-col md:flex-row items-center gap-6">

                {/* Animated Recharts Core */}
                <div className="h-[250px] w-full md:w-1/2 min-w-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                                animationBegin={200}
                                animationDuration={1500}
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                itemStyle={{ fontWeight: 600 }}
                            />
                            <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Dashboard Stats Panel */}
                <div className="w-full md:w-1/2 flex flex-col justify-center gap-4">
                    {data.map((stat) => (
                        <div key={stat.name} className="flex items-center justify-between p-3 rounded-lg bg-background border shadow-sm transition-all hover:scale-105 hover:shadow-md cursor-default group">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center`} style={{ backgroundColor: `${stat.color}20`, color: stat.color }}>
                                    {stat.name === 'Saved' && <Bookmark className="w-5 h-5" />}
                                    {stat.name === 'Applied' && <TrendingUp className="w-5 h-5" />}
                                    {stat.name === 'Won' && <Trophy className="w-5 h-5" />}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-muted-foreground">{stat.name}</span>
                                    <span className="text-xl font-bold font-headline">{stat.value}</span>
                                </div>
                            </div>

                            {
                                stat.name === 'Saved' && stat.value > 0 && (
                                    <span className="text-xs bg-theme-100 text-theme-800 dark:bg-theme-900/30 dark:text-theme-400 px-2 py-1 rounded-full animate-in fade-in zoom-in group-hover:bg-theme-200">
                                        Active
                                    </span>
                                )
                            }
                        </div>
                    ))}
                </div>

            </CardContent>
        </Card >
    );
}
