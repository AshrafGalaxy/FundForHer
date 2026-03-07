'use client';

import React, { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const BackToTop = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            // Show button when user scrolls down 400px
            if (window.scrollY > 400) {
                setIsVisible(true);
            } else {
                setIsVisible(false);
            }
        };

        window.addEventListener('scroll', handleScroll);

        // Check initial scroll position
        handleScroll();

        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    return (
        <Button
            variant="default"
            size="icon"
            onClick={scrollToTop}
            aria-label="Back to top"
            className={cn(
                "fixed bottom-6 right-6 z-50 rounded-full w-12 h-12 shadow-xl shadow-theme-400/20 dark:shadow-theme-900/40 bg-theme-600 hover:bg-theme-700 text-white transition-all duration-300 transform",
                isVisible ? "translate-y-0 opacity-100 scale-100" : "translate-y-10 opacity-0 scale-50 pointer-events-none"
            )}
        >
            <ArrowUp className="w-6 h-6" />
        </Button>
    );
};

export default BackToTop;
