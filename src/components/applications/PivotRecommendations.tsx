import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Scholarship } from "@/lib/types";

export function PivotRecommendations({ originalFieldOfStudy }: { originalFieldOfStudy: string }) {
    // In a real app, this would fetch 3 random active scholarships matching the domain
    // For the sake of this demo UI, we render some placeholder/mock recommendations.

    return (
        <Card className="mt-6 border-amber-200 bg-amber-50/30 dark:border-amber-900 dark:bg-amber-900/10 shadow-sm relative overflow-hidden">
            <div className="absolute right-0 top-0 w-32 h-32 bg-amber-400/10 rounded-bl-full pointer-events-none" />
            <CardHeader className="pb-3 border-b border-amber-200/50 dark:border-amber-800/50">
                <CardTitle className="text-sm font-headline flex items-center gap-2 text-amber-800 dark:text-amber-300">
                    <Sparkles className="w-4 h-4" />
                    AI Pivot Recommendations
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
                <p className="text-xs text-amber-700 dark:text-amber-400/80 leading-relaxed max-w-[90%]">
                    Don&apos;t be discouraged. Getting rejected is part of the journey. Based on your profile and intended major ({originalFieldOfStudy || 'General'}), here are 3 similar scholarships you have a high chance of winning.
                </p>

                <div className="flex flex-col gap-2 relative z-10">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-card rounded-lg border shadow-sm group">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
                                    <TrendingUp className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold group-hover:text-primary transition-colors">Women in Tech Access Fund {i}</p>
                                    <p className="text-xs text-muted-foreground">Deadline in {i * 5 + 3} days • ₹{i * 15},000</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="sm" className="hidden sm:flex group-hover:bg-primary group-hover:text-primary-foreground transition-all" asChild>
                                <Link href="/authenticated/dashboard">Quick Apply <ArrowRight className="w-3 h-3 ml-1" /></Link>
                            </Button>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
