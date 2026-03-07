'use client';

import React, { useEffect, useState, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { Scholarship } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Trophy, Sparkles, MapPin, CalendarClock } from 'lucide-react';
import Link from 'next/link';

interface SubtitleCarouselProps {
    scholarships: Scholarship[];
}

export const FeaturedScholarshipCarousel = ({ scholarships }: SubtitleCarouselProps) => {
    // Show only the 3 most premium/featured ones for the slider
    const featured = scholarships.slice(0, 3);

    const [emblaRef, emblaApi] = useEmblaCarousel(
        { loop: true, align: 'center', skipSnaps: false },
        [Autoplay({ delay: 5000, stopOnInteraction: true })]
    );

    const [selectedIndex, setSelectedIndex] = useState(0);

    const onSelect = useCallback(() => {
        if (!emblaApi) return;
        setSelectedIndex(emblaApi.selectedScrollSnap());
    }, [emblaApi, setSelectedIndex]);

    useEffect(() => {
        if (!emblaApi) return;
        emblaApi.on('select', onSelect);
        onSelect();
    }, [emblaApi, onSelect]);

    if (featured.length === 0) return null;

    return (
        <div className="w-full max-w-7xl mx-auto px-4 -mt-16 sm:-mt-24 relative z-20 mb-16">
            <div className="overflow-hidden rounded-3xl shadow-2xl bg-background/50 backdrop-blur-3xl border border-white/20 dark:border-white/5" ref={emblaRef}>
                <div className="flex touch-pan-y">
                    {featured.map((scholarship, index) => (
                        <div key={scholarship.id} className="flex-[0_0_100%] min-w-0 md:flex-[0_0_85%] lg:flex-[0_0_70%] pl-4 pr-4 py-8">
                            <Card className={`relative overflow-hidden h-[320px] md:h-[380px] rounded-[2rem] border-none transition-all duration-700 ease-out transform ${index === selectedIndex ? 'scale-100 opacity-100 shadow-2xl shadow-theme-900/40 dark:shadow-none bg-gradient-to-br from-theme-50 to-theme-100 dark:from-[#301A18] dark:to-[#47221E]' : 'scale-90 opacity-40 grayscale-[50%] bg-muted/50'}`}>

                                {/* Decorative elements */}
                                <div className="absolute top-0 right-0 w-64 h-64 bg-theme-200/50 dark:bg-theme-900/30 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none transition-all duration-1000 group-hover:bg-theme-300/50" />
                                <div className="absolute bottom-0 left-0 w-48 h-48 bg-theme-300/30 dark:bg-rose-900/20 rounded-full blur-[60px] -ml-24 -mb-24 pointer-events-none" />

                                <CardContent className="p-8 md:p-12 h-full flex flex-col justify-between relative z-10">
                                    <div className="space-y-4">
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-theme-900 text-theme-50 dark:bg-theme-200 dark:text-theme-950 text-xs font-bold tracking-wide uppercase shadow-sm">
                                            <Trophy className="w-3.5 h-3.5" />
                                            Featured Opportunity
                                        </div>

                                        <h3 className="text-2xl md:text-4xl font-headline font-extrabold text-foreground leading-tight line-clamp-2">
                                            {scholarship.title}
                                        </h3>

                                        <p className="text-muted-foreground font-medium flex items-center gap-2 line-clamp-1 text-sm md:text-base">
                                            <MapPin className="w-4 h-4 text-theme-600 dark:text-theme-400" />
                                            {scholarship.provider}
                                        </p>
                                    </div>

                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pt-6 border-t border-theme-200/50 dark:border-theme-800/50 mt-auto">
                                        <div className="flex items-center gap-6">
                                            {scholarship.amount && (
                                                <div>
                                                    <p className="text-xs text-muted-foreground font-semibold mb-1 uppercase tracking-wider">Funding</p>
                                                    <p className="text-xl md:text-2xl font-bold text-green-600 dark:text-green-400">
                                                        <span style={{ fontFamily: 'sans-serif' }}>₹</span>{scholarship.amount.toLocaleString('en-IN')}
                                                    </p>
                                                </div>
                                            )}
                                            <div>
                                                <p className="text-xs text-muted-foreground font-semibold mb-1 uppercase tracking-wider">Deadline</p>
                                                <p className="text-sm md:text-base font-medium flex items-center gap-1.5 text-foreground">
                                                    <CalendarClock className="w-4 h-4 text-theme-600 dark:text-theme-400" />
                                                    {scholarship.deadline
                                                        ? (scholarship.deadline instanceof Date ? scholarship.deadline : new Date(scholarship.deadline)).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                                                        : 'Varies by applicant'}
                                                </p>
                                            </div>
                                        </div>

                                        <Button asChild size="lg" className="rounded-full shadow-lg bg-foreground text-background hover:bg-theme-600 hover:text-white dark:bg-theme-100 dark:text-theme-900 border-none transition-all duration-300 hover:scale-105 group font-bold px-8">
                                            <Link href="/register">
                                                Apply Now
                                                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                            </Link>
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    ))}
                </div>
            </div>

            {/* Pagination Dots */}
            <div className="flex justify-center gap-2 mt-6">
                {featured.map((_, i) => (
                    <button
                        key={i}
                        className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${i === selectedIndex ? 'bg-theme-600 dark:bg-theme-400 w-8' : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'}`}
                        onClick={() => emblaApi?.scrollTo(i)}
                        aria-label={`Go to slide ${i + 1}`}
                    />
                ))}
            </div>
        </div>
    );
};
