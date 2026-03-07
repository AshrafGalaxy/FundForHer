'use client';

import React, { useEffect, useState, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { Scholarship } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ArrowRight, Trophy, MapPin, CalendarClock } from 'lucide-react';
import Link from 'next/link';

interface FeaturedScholarshipCarouselProps {
    scholarships: Scholarship[];
}

export const FeaturedScholarshipCarousel = ({ scholarships }: FeaturedScholarshipCarouselProps) => {
    const featured = scholarships.slice(0, 3);

    const [emblaRef, emblaApi] = useEmblaCarousel(
        { loop: true, align: 'center', skipSnaps: false },
        [Autoplay({ delay: 5000, stopOnInteraction: true })]
    );

    const [selectedIndex, setSelectedIndex] = useState(0);

    const onSelect = useCallback(() => {
        if (!emblaApi) return;
        setSelectedIndex(emblaApi.selectedScrollSnap());
    }, [emblaApi]);

    useEffect(() => {
        if (!emblaApi) return;
        emblaApi.on('select', onSelect);
        onSelect();
    }, [emblaApi, onSelect]);

    if (featured.length === 0) return null;

    return (
        <div className="w-full bg-background py-12 border-b border-border">
            <div className="container mx-auto px-4 mb-8">
                <div className="flex items-center gap-3">
                    <div className="h-1 w-8 rounded-full bg-theme-600" />
                    <p className="text-sm font-bold tracking-widest text-theme-700 dark:text-theme-400 uppercase">
                        Featured Opportunities
                    </p>
                </div>
            </div>

            <div className="overflow-hidden" ref={emblaRef}>
                <div className="flex touch-pan-y gap-4 px-4">
                    {featured.map((scholarship, index) => {
                        const isActive = index === selectedIndex;
                        return (
                            <div
                                key={scholarship.id}
                                className="flex-[0_0_92%] sm:flex-[0_0_80%] md:flex-[0_0_65%] lg:flex-[0_0_55%] min-w-0"
                            >
                                <div
                                    className={`relative overflow-hidden h-[280px] md:h-[340px] rounded-3xl transition-all duration-700 ease-in-out
                                        ${isActive
                                            ? 'opacity-100 scale-100 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] dark:shadow-none z-10'
                                            : 'opacity-60 scale-[0.96] hover:opacity-80 z-0'
                                        }
                                        bg-white dark:bg-slate-900
                                        border border-slate-200 dark:border-slate-800
                                    `}
                                >
                                    {/* Decorative warm glow top-right */}
                                    <div className="absolute -top-16 -right-16 w-48 h-48 bg-theme-100/60 dark:bg-theme-900/20 rounded-full blur-3xl pointer-events-none" />
                                    {/* Bottom-left accent */}
                                    <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-theme-50/80 dark:bg-theme-900/10 rounded-full blur-2xl pointer-events-none" />

                                    <div className="p-7 md:p-10 h-full flex flex-col justify-between relative z-10">
                                        {/* Top: Badge + Title + Provider */}
                                        <div className="space-y-3">
                                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-theme-100 dark:bg-theme-900/50 text-theme-800 dark:text-theme-300 text-xs font-bold tracking-widest uppercase shadow-sm border border-theme-200/50 dark:border-theme-800">
                                                <Trophy className="w-3 h-3" />
                                                Featured
                                            </div>

                                            <h3 className="text-xl md:text-3xl font-headline font-extrabold text-foreground leading-tight line-clamp-2">
                                                {scholarship.title}
                                            </h3>

                                            <p className="text-muted-foreground font-medium flex items-center gap-2 line-clamp-1 text-sm">
                                                <MapPin className="w-4 h-4 flex-shrink-0 text-theme-600 dark:text-theme-400" />
                                                {scholarship.provider}
                                            </p>
                                        </div>

                                        {/* Bottom: Meta + CTA */}
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-5 border-t border-slate-100 dark:border-theme-900/50">
                                            <div className="flex items-center gap-6">
                                                {scholarship.amount && (
                                                    <div>
                                                        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">Funding</p>
                                                        <p className="text-lg md:text-xl font-bold text-green-600 dark:text-green-400">
                                                            <span style={{ fontFamily: 'sans-serif' }}>₹</span>
                                                            {scholarship.amount.toLocaleString('en-IN')}
                                                        </p>
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">Deadline</p>
                                                    <p className="text-sm font-medium flex items-center gap-1.5 text-foreground">
                                                        <CalendarClock className="w-4 h-4 flex-shrink-0 text-theme-600 dark:text-theme-400" />
                                                        {scholarship.deadline
                                                            ? (scholarship.deadline instanceof Date ? scholarship.deadline : new Date(scholarship.deadline)).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                                                            : 'Varies'}
                                                    </p>
                                                </div>
                                            </div>

                                            <Button
                                                asChild
                                                size="sm"
                                                className="rounded-full bg-theme-600 hover:bg-theme-700 text-white dark:bg-theme-500 dark:hover:bg-theme-600 border-none font-bold px-6 shadow-md shadow-theme-200/50 dark:shadow-none group flex-shrink-0"
                                            >
                                                <Link href="/register">
                                                    Apply Now
                                                    <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-0.5 transition-transform" />
                                                </Link>
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Pagination Dots */}
            <div className="flex justify-center gap-2 mt-6">
                {featured.map((_, i) => (
                    <button
                        key={i}
                        className={`h-2 rounded-full transition-all duration-300 ${i === selectedIndex
                            ? 'bg-theme-700 dark:bg-theme-400 w-8'
                            : 'bg-theme-300/60 dark:bg-theme-700/60 w-2 hover:bg-theme-400/80'
                            }`}
                        onClick={() => emblaApi?.scrollTo(i)}
                        aria-label={`Go to slide ${i + 1}`}
                    />
                ))}
            </div>
        </div>
    );
};
