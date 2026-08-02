import { CheckCircle2, Circle, Clock, Landmark, IndianRupee, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export type DisbursementStatus = 'Awaiting Details' | 'Processing' | 'Bank Clearing' | 'Settled';

const STEPS = [
    { id: 'Awaiting Details', label: 'Action Needed', icon: Clock },
    { id: 'Processing', label: 'Processing', icon: RotateCw },
    { id: 'Bank Clearing', label: 'Bank Clearing', icon: Landmark },
    { id: 'Settled', label: 'Settled', icon: IndianRupee }
];

export function DisbursementTracker({ currentStatus, amount }: { currentStatus: DisbursementStatus, amount: number }) {

    const currentStepIndex = STEPS.findIndex(s => s.id === currentStatus);
    const activeIndex = currentStepIndex >= 0 ? currentStepIndex : 0;
    const isComplete = currentStatus === 'Settled';

    return (
        <div className="mt-6 bg-slate-50 dark:bg-slate-900 p-4 sm:p-6 rounded-xl border border-slate-200 dark:border-slate-800 relative overflow-hidden">

            {/* Decorative Overlay */}
            <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl rounded-full opacity-20 pointer-events-none ${isComplete ? 'bg-emerald-500' : 'bg-primary'}`} />

            <div className="flex justify-between items-center mb-6 relative z-10 border-b pb-4">
                <div>
                    <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Landmark className="w-4 h-4 text-primary" /> Track My Money
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {isComplete ? "Funds successfully transferred to your account." : "Estimated standard clearance: 5-7 business days."}
                    </p>
                </div>
                <div className="text-right">
                    <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Disbursing</span>
                    <p className="text-lg font-headline font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{amount.toLocaleString('en-IN')}
                    </p>
                </div>
            </div>

            <div className="relative w-full py-2">
                <div className="flex items-center justify-between relative z-10">
                    {STEPS.map((step, idx) => {
                        const isCompleted = idx < activeIndex || isComplete;
                        const isActive = idx === activeIndex && !isComplete;
                        const isPending = idx > activeIndex;
                        const Icon = step.icon;

                        return (
                            <div key={step.id} className="flex flex-col items-center gap-2 relative z-10 w-20 sm:w-24">
                                <div className="relative flex items-center justify-center h-8">
                                    {isCompleted && (
                                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute z-20 top-0 right-0 -mr-1 -mt-1 w-3 h-3 bg-white rounded-full flex items-center justify-center">
                                            <CheckCircle2 className="w-3 h-3 text-emerald-500 fill-white" />
                                        </motion.div>
                                    )}

                                    <div className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center transition-all z-10",
                                        isCompleted ? "bg-emerald-500 text-white shadow-sm" :
                                            isActive ? "bg-primary text-primary-foreground shadow-md" :
                                                "bg-secondary border-2 border-muted-foreground/20 text-muted-foreground"
                                    )}>
                                        <Icon className={cn("w-4 h-4", isActive && step.id === 'Processing' && "animate-spin-slow")} />
                                    </div>

                                    {isActive && (
                                        <motion.div
                                            className="absolute inset-0 bg-primary/20 rounded-full -z-0 pointer-events-none"
                                            animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.8, 0.3] }}
                                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                        />
                                    )}
                                </div>
                                <p className={cn(
                                    "text-[10px] sm:text-xs font-semibold text-center mt-1 uppercase tracking-wide",
                                    isCompleted ? "text-emerald-600 dark:text-emerald-400" :
                                        isActive ? "text-primary" : "text-muted-foreground/60"
                                )}>
                                    {step.label}
                                </p>
                            </div>
                        );
                    })}
                </div>

                {/* Gray Background Track */}
                <div className="absolute top-6 left-[12%] right-[12%] h-1 bg-secondary rounded-full -z-0" />

                {/* Active Progress Track */}
                <motion.div
                    className={cn("absolute top-6 left-[12%] h-1 rounded-full origin-left -z-0", isComplete ? "bg-emerald-500" : "bg-primary")}
                    initial={{ width: '0%' }}
                    animate={{ width: `${isComplete ? 100 : (activeIndex / (STEPS.length - 1)) * 80}%` }}
                    transition={{ duration: 1, ease: "easeInOut" }}
                />
            </div>
        </div>
    );
}
