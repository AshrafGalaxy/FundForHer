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

    // Duplicate the array to create the seamless infinite scroll illusion
    const scrollItems = [...partners, ...partners];

    return (
        <div className="w-full bg-white dark:bg-[#1A0E0C] py-10 border-b border-theme-100 dark:border-white/5 overflow-hidden">
            <div className="container mx-auto px-4 mb-6">
                <p className="text-center text-sm font-semibold tracking-widest text-slate-400 uppercase">
                    Trusted by top institutions & organizations
                </p>
            </div>

            <div className="relative flex overflow-x-hidden group">
                <div className="animate-marquee flex whitespace-nowrap group-hover:[animation-play-state:paused]">
                    {scrollItems.map((partner, index) => (
                        <div key={index} className="flex items-center justify-center gap-3 mx-8 md:mx-16 min-w-max mix-blend-luminosity opacity-60 hover:opacity-100 transition-opacity duration-300">
                            {partner.icon}
                            <span className="text-xl font-headline font-bold text-slate-400 dark:text-slate-500">
                                {partner.name}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Second duplicated container for the infinite loop gap fix */}
                <div className="animate-marquee flex whitespace-nowrap absolute top-0 group-hover:[animation-play-state:paused]">
                    {scrollItems.map((partner, index) => (
                        <div key={`dup-${index}`} className="flex items-center justify-center gap-3 mx-8 md:mx-16 min-w-max mix-blend-luminosity opacity-60 hover:opacity-100 transition-opacity duration-300">
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
