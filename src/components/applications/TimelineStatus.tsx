import { CheckCircle2, Circle, Loader2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export type ApplicationStatus = 'Submitted' | 'Under Review' | 'Shortlisted' | 'Awarded' | 'Rejected';

const STEPS = [
    { id: 'Submitted', label: 'Submitted' },
    { id: 'Under Review', label: 'Under Review' },
    { id: 'Shortlisted', label: 'Shortlisted' },
    { id: 'Awarded', label: 'Awarded' } // We handle Rejected uniquely
];

export function TimelineStatus({ currentStatus }: { currentStatus: ApplicationStatus }) {

    if (currentStatus === 'Rejected') {
        return (
            <div className="flex items-center gap-3 text-destructive p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                <div className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-destructive" />
                </div>
                <div>
                    <p className="font-semibold text-sm">Application Unsuccessful</p>
                    <p className="text-xs text-destructive/80 mt-0.5">Please review the Pivot Recommendations below for similar opportunities.</p>
                </div>
            </div>
        );
    }

    const currentStepIndex = STEPS.findIndex(s => s.id === currentStatus);
    // Default to Submitted if not found or malformed
    const activeIndex = currentStepIndex >= 0 ? currentStepIndex : 0;

    return (
        <div className="relative w-full max-w-3xl mx-auto py-4">
            <div className="flex items-center justify-between relative z-10">
                {STEPS.map((step, idx) => {
                    const isCompleted = idx < activeIndex;
                    const isActive = idx === activeIndex;
                    const isPending = idx > activeIndex;

                    return (
                        <div key={step.id} className="flex flex-col items-center gap-2 relative z-10 w-24">
                            <div className="relative flex items-center justify-center">
                                {isCompleted && (
                                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-sm z-10">
                                        <CheckCircle2 className="w-5 h-5" />
                                    </motion.div>
                                )}

                                {isActive && (
                                    <div className="relative flex items-center justify-center z-10">
                                        <motion.div
                                            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                            className="absolute inset-0 bg-primary/30 rounded-full"
                                        />
                                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-md relative z-10">
                                            <div className="w-2.5 h-2.5 bg-white rounded-full" />
                                        </div>
                                    </div>
                                )}

                                {isPending && (
                                    <div className="w-8 h-8 rounded-full bg-secondary border-2 border-muted-foreground/30 flex items-center justify-center text-muted-foreground z-10">
                                        <Circle className="w-4 h-4 opacity-50" />
                                    </div>
                                )}
                            </div>
                            <p className={cn(
                                "text-xs font-semibold text-center mt-1 transition-colors",
                                isCompleted ? "text-emerald-600 dark:text-emerald-400" :
                                    isActive ? "text-primary" : "text-muted-foreground"
                            )}>
                                {step.label}
                            </p>
                        </div>
                    );
                })}
            </div>

            {/* The Connecting Line Background */}
            <div className="absolute top-8 left-[10%] right-[10%] h-1 bg-secondary rounded-full -z-0" />

            {/* The Active Connecting Line */}
            <motion.div
                className="absolute top-8 left-[10%] h-1 bg-primary rounded-full origin-left -z-0"
                initial={{ width: '0%' }}
                animate={{ width: `${(activeIndex / (STEPS.length - 1)) * 80}%` }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
            />
        </div>
    );
}
