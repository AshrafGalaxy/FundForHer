'use client';

import { useEffect, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { Sparkles, TrendingUp } from 'lucide-react';

interface MatchCounterProps {
    educationLevel: string | null;
    fieldOfStudy: string | null;
}

export function MatchCounter({ educationLevel, fieldOfStudy }: MatchCounterProps) {
    const [count, setCount] = useState(0);
    const [label, setLabel] = useState('Scholarships Available');
    const controls = useAnimation();

    useEffect(() => {
        // Mocking the "Query" delay and dynamic numbers
        let targetCount = 12450; // Base total
        let currentLabel = 'Total Active Funds';

        if (educationLevel) {
            targetCount = Math.floor(targetCount * 0.4); // Filter down
            currentLabel = `${educationLevel} Grants Found!`;
        }

        if (fieldOfStudy) {
            targetCount = Math.floor(targetCount * 0.15); // Filter down further
            currentLabel = `High-Match ${fieldOfStudy} Funds!`;
        }

        // Animation sequence
        controls.start({ scale: 1.1, color: '#fba69b' }).then(() => {
            controls.start({ scale: 1, color: 'inherit' });
        });

        // Number counter animation (simplified JS interval for rapid counting effect)
        let currentIter = count;
        const step = Math.max(1, Math.floor(Math.abs(targetCount - count) / 20));

        const timer = setInterval(() => {
            currentIter += (targetCount > currentIter) ? step : -step;

            // Reached target
            if ((targetCount > count && currentIter >= targetCount) ||
                (targetCount < count && currentIter <= targetCount)) {
                setCount(targetCount);
                setLabel(currentLabel);
                clearInterval(timer);
            } else {
                setCount(currentIter);
            }
        }, 30);

        return () => clearInterval(timer);
    }, [educationLevel, fieldOfStudy, controls]);

    return (
        <motion.div
            className="fixed top-6 right-6 md:top-12 md:right-12 z-50 bg-background/80 backdrop-blur-xl border shadow-2xl rounded-2xl p-4 flex items-center gap-4 overflow-hidden"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, type: 'spring' }}
        >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent pointer-events-none" />

            <div className="bg-primary/20 p-3 rounded-xl">
                {fieldOfStudy ? <Sparkles className="w-6 h-6 text-primary" /> : <TrendingUp className="w-6 h-6 text-primary" />}
            </div>

            <div className="flex flex-col pr-4">
                <motion.span
                    animate={controls}
                    className="text-3xl font-headline font-black text-foreground tabular-nums tracking-tight"
                >
                    {count.toLocaleString()}
                </motion.span>
                <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground whitespace-nowrap">
                    {label}
                </span>
            </div>
        </motion.div>
    );
}
