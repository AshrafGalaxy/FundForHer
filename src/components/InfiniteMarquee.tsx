import React from 'react';
import { Building2, GraduationCap, Library, Landmark, Building, School } from 'lucide-react';

export const InfiniteMarquee = () => {
    // A blend of high-trust sounding generic institutions/corporations using Lucide icons
    const partners = [
        { name: "Global Tech Foundation", icon: <Building2 className="w-8 h-8 text-slate-400 dark:text-slate-600" /> },
        { name: "National Institute of Science", icon: <GraduationCap className="w-8 h-8 text-slate-400 dark:text-slate-600" /> },
        { name: "Oxford Trust", icon: <Library className="w-8 h-8 text-slate-400 dark:text-slate-600" /> },
        { name: "Women's Education Board", icon: <Landmark className="w-8 h-8 text-slate-400 dark:text-slate-600" /> },
        { name: "Future Leaders Corp", icon: <Building className="w-8 h-8 text-slate-400 dark:text-slate-600" /> },
        { name: "State University System", icon: <School className="w-8 h-8 text-slate-400 dark:text-slate-600" /> },
    ];

    // Duplicate the array multiple times to ensure it covers very wide screens and works with a -50% CSS translation loop
    const scrollItems = [...partners, ...partners, ...partners, ...partners];

    return (
        <div className="w-full bg-slate-50/50 dark:bg-[#1D1414]/90 py-10 border-y border-rose-100/60 dark:border-white/5 overflow-hidden">
            <div className="container mx-auto px-4 mb-6">
                <p className="text-center text-sm font-semibold tracking-widest text-slate-500 dark:text-slate-400 uppercase">
                    Trusted by top institutions & organizations
                </p>
            </div>

            <div className="relative flex overflow-x-hidden group w-full">
                {/* We render exactly one track, wide enough to scroll by 50% seamlessly */}
                <div className="animate-marquee flex w-max whitespace-nowrap group-hover:[animation-play-state:paused]">
                    {scrollItems.map((partner, index) => (
                        <div key={index} className="flex items-center justify-center gap-3 mx-8 md:mx-16 mix-blend-luminosity opacity-60 hover:opacity-100 transition-opacity duration-300">
                            {partner.icon}
                            <span className="text-xl font-headline font-bold text-slate-400 dark:text-slate-500">
                                {partner.name}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
