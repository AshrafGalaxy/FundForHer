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
                                    className={`group relative overflow-hidden h-[280px] md:h-[340px] rounded-[2rem] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]
                                        ${isActive
                                            ? 'opacity-100 scale-100 shadow-[0_30px_60px_-15px_rgba(234,88,12,0.15)] dark:shadow-[0_20px_50px_-15px_rgba(0,0,0,0.5)] z-10'
                                            : 'opacity-50 scale-[0.92] hover:opacity-80 hover:scale-[0.94] z-0'
                                        }
                                        bg-white dark:bg-[#1D1412]
                                        border border-orange-100/50 dark:border-white/5
                                    `}
                                >
                                    {/* Glass reflection highlight */}
                                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-50 dark:opacity-10 pointer-events-none" />

                                    {/* Decorative vibrant glow top-right */}
                                    <div className={`absolute -top-16 -right-16 w-56 h-56 bg-orange-400/20 dark:bg-orange-500/10 rounded-full blur-[50px] pointer-events-none transition-opacity duration-700 ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                                    {/* Bottom-left indigo/brown accent */}
                                    <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-theme-100/50 dark:bg-indigo-900/10 rounded-full blur-3xl pointer-events-none" />

                                    <div className="p-7 md:p-10 h-full flex flex-col justify-between relative z-10">
                                        {/* Top: Badge + Title + Provider */}
                                        <div className="space-y-4">
                                            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs font-bold tracking-widest uppercase shadow-sm border border-orange-200/50 dark:border-orange-500/20">
                                                <Trophy className="w-3.5 h-3.5" />
                                                Featured
                                            </div>

                                            <h3 className="text-2xl md:text-3xl font-headline font-extrabold text-slate-900 dark:text-slate-50 leading-tight line-clamp-2">
                                                {scholarship.title}
                                            </h3>

                                            <p className="text-slate-600 dark:text-slate-400 font-medium flex items-center gap-2 line-clamp-1 text-sm">
                                                <MapPin className="w-4 h-4 flex-shrink-0 text-orange-500" />
                                                {scholarship.provider}
                                            </p>
                                        </div>

                                        {/* Bottom: Meta + CTA */}
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-5 border-t border-slate-100 dark:border-white/5">
                                            <div className="flex items-center gap-6">
                                                {scholarship.amount && (
                                                    <div>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider mb-0.5">Funding</p>
                                                        <p className="text-lg md:text-xl font-bold text-slate-900 dark:text-slate-50">
                                                            <span className="text-orange-500 mr-0.5">₹</span>
                                                            {scholarship.amount.toLocaleString('en-IN')}
                                                        </p>
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider mb-0.5">Deadline</p>
                                                    <p className="text-sm font-medium flex items-center gap-1.5 text-slate-900 dark:text-slate-50">
                                                        <CalendarClock className="w-4 h-4 flex-shrink-0 text-orange-500" />
                                                        {scholarship.deadline
                                                            ? (scholarship.deadline instanceof Date ? scholarship.deadline : new Date(scholarship.deadline)).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                                                            : 'Varies'}
                                                    </p>
                                                </div>
                                            </div>

                                            <Button
                                                asChild
                                                size="sm"
                                                className="rounded-full bg-orange-500 hover:bg-orange-600 text-white dark:bg-orange-600 dark:hover:bg-orange-500 border-none font-bold px-7 h-11 shadow-lg shadow-orange-500/25 dark:shadow-orange-900/20 group flex-shrink-0 transition-all hover:scale-105"
                                            >
                                                <Link href="/register">
                                                    Apply Now
                                                    <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-1 transition-transform" />
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
            <div className="flex justify-center gap-2 mt-8">
                {featured.map((_, i) => (
                    <button
                        key={i}
                        className={`h-2 rounded-full transition-all duration-500 ${i === selectedIndex
                            ? 'bg-orange-500 w-10 shadow-[0_0_10px_rgba(249,115,22,0.5)]'
                            : 'bg-slate-200 dark:bg-white/10 w-2 hover:bg-orange-300 dark:hover:bg-white/20'
                            }`}
                        onClick={() => emblaApi?.scrollTo(i)}
                        aria-label={`Go to slide ${i + 1}`}
                    />
                ))}
            </div>
        </div>
    );
};
