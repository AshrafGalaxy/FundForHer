'use client';

import React, { useEffect, useState, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { Scholarship } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ArrowRight, Trophy, MapPin, CalendarClock, IndianRupee } from 'lucide-react';
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
        <div className="w-full bg-background dark:bg-[#301A18] py-12 border-b border-primary/20 dark:border-[#47221E] relative overflow-hidden transition-colors">
            {/* Ethereal background aura */}
            <div className="absolute top-0 right-0 -mr-32 -mt-32 w-96 h-96 bg-primary/20 dark:bg-[#FBA69B]/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-32 -mb-32 w-96 h-96 bg-primary/10 dark:bg-[#FBA69B]/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="container mx-auto px-4 mb-8 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="h-1 w-8 rounded-full bg-primary" />
                    <p className="text-sm font-bold tracking-widest text-muted-foreground dark:text-[#FBA69B]/70 uppercase">
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
                                            ? 'opacity-100 scale-100 shadow-xl shadow-primary/20 dark:shadow-black/40 z-10'
                                            : 'opacity-50 scale-[0.92] hover:opacity-80 hover:scale-[0.94] z-0'
                                        }
                                        bg-card/80 dark:bg-[#47221E]/40 backdrop-blur-xl border border-primary/30 dark:border-[#672B25]
                                    `}
                                >
                                    {/* Glass reflection highlight */}
                                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 dark:via-white/10 to-transparent opacity-80 pointer-events-none" />

                                    {/* Premium soft primary ambient glows */}
                                    <div className={`absolute -top-16 -right-16 w-64 h-64 bg-primary/20 dark:bg-[#FBA69B]/10 rounded-full blur-[60px] pointer-events-none transition-opacity duration-700 ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                                    <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-primary/20 dark:bg-[#FBA69B]/10 rounded-full blur-[80px] pointer-events-none" />

                                    <div className="p-7 md:p-10 h-full flex flex-col justify-between relative z-10">
                                        {/* Top: Badge + Title + Provider */}
                                        <div className="space-y-4">
                                            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary/10 dark:bg-[#301A18] text-primary dark:text-[#FBA69B] text-xs font-bold tracking-widest uppercase shadow-sm border border-primary/20 dark:border-[#47221E]">
                                                <Trophy className="w-3.5 h-3.5" />
                                                Featured
                                            </div>

                                            <h3 className="text-2xl md:text-3xl font-headline font-extrabold text-foreground dark:text-[#FFF5F4] leading-tight line-clamp-2">
                                                {scholarship.title}
                                            </h3>

                                            <p className="text-muted-foreground dark:text-[#FFEBE8]/80 font-medium flex items-center gap-2 line-clamp-1 text-sm">
                                                <MapPin className="w-4 h-4 flex-shrink-0 text-primary dark:text-[#FBA69B]" />
                                                {scholarship.provider}
                                            </p>
                                        </div>

                                        {/* Bottom: Meta + CTA */}
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-5 border-t border-primary/10 dark:border-[#47221E]/50">
                                            <div className="flex items-center gap-6">
                                                {scholarship.amount && (
                                                    <div>
                                                        <p className="text-xs text-muted-foreground dark:text-[#FFEBE8]/60 font-semibold uppercase tracking-wider mb-0.5">Funding</p>
                                                        <p className="text-lg md:text-xl font-bold flex items-center text-foreground dark:text-[#FFF5F4]">
                                                            <IndianRupee className="w-4 h-4 text-primary dark:text-[#FBA69B] mr-0.5" />
                                                            {scholarship.amount.toLocaleString('en-IN')}
                                                        </p>
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="text-xs text-muted-foreground dark:text-[#FFEBE8]/60 font-semibold uppercase tracking-wider mb-0.5">Deadline</p>
                                                    <p className="text-sm font-medium flex items-center gap-1.5 text-foreground dark:text-[#FFF5F4]">
                                                        <CalendarClock className="w-4 h-4 flex-shrink-0 text-primary dark:text-[#FBA69B]" />
                                                        {scholarship.deadline
                                                            ? (scholarship.deadline instanceof Date ? scholarship.deadline : new Date(scholarship.deadline)).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                                                            : 'Varies'}
                                                    </p>
                                                </div>
                                            </div>

                                            <Button
                                                asChild
                                                size="sm"
                                                className="rounded-full font-bold px-7 h-11 shadow-lg shadow-primary/25 dark:shadow-[#FBA69B]/10 group flex-shrink-0 transition-all hover:scale-105 bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-[#FBA69B] dark:text-[#301A18] dark:hover:bg-[#FFF5F4]"
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
                            ? 'bg-primary dark:bg-[#FBA69B] w-10 shadow-sm shadow-primary/50 dark:shadow-[#FBA69B]/30'
                            : 'bg-primary/30 hover:bg-primary/60 dark:bg-[#47221E] dark:hover:bg-[#672B25] w-2'
                            }`}
                        onClick={() => emblaApi?.scrollTo(i)}
                        aria-label={`Go to slide ${i + 1}`}
                    />
                ))}
            </div>
        </div>
    );
};
