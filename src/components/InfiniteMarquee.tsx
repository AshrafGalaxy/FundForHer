import React from 'react';
import { Building2, GraduationCap, Library, Landmark, Building, School, Sparkles } from 'lucide-react';

export const InfiniteMarquee = () => {
    // A blend of high-trust sounding generic institutions/corporations using Lucide icons
    const partners = [
        { name: "Global Tech Foundation", icon: <Building2 className="w-8 h-8 text-pink-500 dark:text-[#FBA69B] group-hover/item:animate-pulse" /> },
        { name: "National Institute of Science", icon: <GraduationCap className="w-8 h-8 text-pink-500 dark:text-[#FBA69B] group-hover/item:animate-pulse" /> },
        { name: "Oxford Trust", icon: <Library className="w-8 h-8 text-pink-500 dark:text-[#FBA69B] group-hover/item:animate-pulse" /> },
        { name: "Women's Education Board", icon: <Landmark className="w-8 h-8 text-pink-500 dark:text-[#FBA69B] group-hover/item:animate-pulse" /> },
        { name: "Future Leaders Corp", icon: <Building className="w-8 h-8 text-pink-500 dark:text-[#FBA69B] group-hover/item:animate-pulse" /> },
        { name: "State University System", icon: <School className="w-8 h-8 text-pink-500 dark:text-[#FBA69B] group-hover/item:animate-pulse" /> },
    ];

    // Duplicate the array multiple times to ensure it covers very wide screens and works with a -50% CSS translation loop
    const scrollItems = [...partners, ...partners, ...partners, ...partners];

    return (
        <div className="relative w-full py-16 border-y border-[#FBA69B]/30 dark:border-white/10 overflow-hidden bg-white dark:bg-zinc-950">
            {/* Dreamy Background Gradients */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#FBA69B]/20 via-transparent to-[#FBA69B]/20 dark:from-[#FBA69B]/5 dark:via-transparent dark:to-[#FBA69B]/5 pointer-events-none" />
            <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[500px] h-[300px] bg-[#FBA69B]/30 dark:bg-[#FBA69B]/10 rounded-full blur-[100px] pointer-events-none animate-pulse duration-[7000ms]" />
            <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[500px] h-[300px] bg-pink-300/20 dark:bg-rose-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse duration-[5000ms]" />

            <div className="container mx-auto px-4 mb-10 relative z-10">
                <div className="flex items-center justify-center gap-3">
                    <Sparkles className="w-5 h-5 text-pink-500 dark:text-[#FBA69B] animate-pulse" />
                    <p className="text-center text-sm font-bold tracking-widest text-zinc-900 dark:text-zinc-50 uppercase">
                        Trusted by top institutions & organizations
                    </p>
                    <Sparkles className="w-5 h-5 text-pink-500 dark:text-[#FBA69B] animate-pulse" />
                </div>
            </div>

            <div className="relative flex overflow-x-hidden group w-full z-10">
                {/* We render exactly one track, wide enough to scroll by 50% seamlessly */}
                <div className="animate-marquee flex w-max whitespace-nowrap group-hover:[animation-play-state:paused]">
                    {scrollItems.map((partner, index) => (
                        <div key={index} className="flex items-center justify-center gap-4 mx-8 md:mx-16 opacity-80 hover:opacity-100 hover:scale-[1.03] transition-all duration-300 group/item cursor-default">
                            {/* Glassmorphic Icon Container */}
                            <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgba(251,166,155,0.05)] backdrop-blur-md border border-[#FBA69B]/20 dark:border-white/10 group-hover/item:border-[#FBA69B]/60 transition-colors">
                                {partner.icon}
                            </div>
                            <span className="text-2xl font-headline font-extrabold text-zinc-900 dark:text-white drop-shadow-sm tracking-tight">
                                {partner.name}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Fade edges to match the dreamy gradient and ensure smooth scroll entrance/exit */}
            <div className="absolute inset-y-0 left-0 w-24 md:w-48 bg-gradient-to-r from-white dark:from-zinc-950 to-transparent pointer-events-none z-20" />
            <div className="absolute inset-y-0 right-0 w-24 md:w-48 bg-gradient-to-l from-white dark:from-zinc-950 to-transparent pointer-events-none z-20" />
        </div>
    );
};
