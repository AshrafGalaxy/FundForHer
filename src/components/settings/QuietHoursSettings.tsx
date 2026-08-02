import { useState, useEffect } from "react";
import { useAuth, useFirestore } from "@/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Moon, ShieldAlert, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type QuietHoursState = {
    enabled: boolean;
    start: string; // "22:00"
    end: string;   // "08:00"
    emergencyOverride: boolean;
};

const DEFAULT_STATE: QuietHoursState = {
    enabled: false,
    start: "22:00",
    end: "08:00",
    emergencyOverride: true,
};

// Generate time slots (e.g., 22:00, 22:30, 23:00...)
const TIME_OPTIONS = Array.from({ length: 48 }).map((_, i) => {
    const hour = Math.floor(i / 2).toString().padStart(2, '0');
    const minute = i % 2 === 0 ? '00' : '30';
    return `${hour}:${minute}`;
});

export function QuietHoursSettings() {
    const [prefs, setPrefs] = useState<QuietHoursState>(DEFAULT_STATE);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const auth = useAuth();
    const db = useFirestore();
    const { toast } = useToast();

    useEffect(() => {
        if (!auth?.currentUser || !db) return;

        const fetchPrefs = async () => {
            try {
                const userRef = doc(db, 'users', auth.currentUser!.uid);
                const userSnap = await getDoc(userRef);

                if (userSnap.exists() && userSnap.data().quietHours) {
                    setPrefs(userSnap.data().quietHours);
                }
            } catch (error) {
                console.error("Failed to fetch quiet hours", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPrefs();
    }, [auth?.currentUser, db]);

    const handleUpdate = async (updates: Partial<QuietHoursState>) => {
        if (!auth?.currentUser || !db) return;

        setSaving(true);
        const updatedPrefs = { ...prefs, ...updates };

        try {
            setPrefs(updatedPrefs);
            const userRef = doc(db, 'users', auth.currentUser.uid);
            await updateDoc(userRef, { quietHours: updatedPrefs });
        } catch (error) {
            console.error("Failed to update quiet hours", error);
            toast({ title: "Error", description: "Could not save preference.", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-primary w-6 h-6" /></div>;

    return (
        <div className="space-y-6">
            <div className="mb-6 border-b pb-4">
                <h3 className="font-headline font-bold text-lg text-foreground flex items-center gap-2">
                    <Moon className="w-5 h-5 text-indigo-500" /> Quiet Hours
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                    Set a "Do Not Disturb" window to silence all non-critical notifications.
                </p>
            </div>

            <div className="bg-card border rounded-xl p-6 shadow-sm space-y-6 relative overflow-hidden">
                {/* Main Toggle */}
                <div className="flex items-center justify-between z-10 relative">
                    <div className="space-y-0.5">
                        <Label className="text-base font-semibold">Enable Quiet Hours</Label>
                        <p className="text-xs text-muted-foreground">Notifications will be queued and delivered silently after the window ends.</p>
                    </div>
                    <Switch
                        checked={prefs.enabled}
                        onCheckedChange={(v) => handleUpdate({ enabled: v })}
                        disabled={saving}
                        className="data-[state=checked]:bg-indigo-500"
                    />
                </div>

                {/* Time Sliders (Conditional Render) */}
                {prefs.enabled && (
                    <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-dashed animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="space-y-2 flex-1">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Start Time</Label>
                            <Select value={prefs.start} onValueChange={(v) => handleUpdate({ start: v })} disabled={saving}>
                                <SelectTrigger className="bg-background">
                                    <SelectValue placeholder="Select Time" />
                                </SelectTrigger>
                                <SelectContent>
                                    {TIME_OPTIONS.map(time => <SelectItem key={time} value={time}>{time}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2 flex-1">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">End Time</Label>
                            <Select value={prefs.end} onValueChange={(v) => handleUpdate({ end: v })} disabled={saving}>
                                <SelectTrigger className="bg-background">
                                    <SelectValue placeholder="Select Time" />
                                </SelectTrigger>
                                <SelectContent>
                                    {TIME_OPTIONS.map(time => <SelectItem key={time} value={time}>{time}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                )}
            </div>

            {/* Emergency Override */}
            <div className="bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-xl p-6 relative overflow-hidden">
                <div className="absolute -right-4 top-1/2 -translate-y-1/2 opacity-5 pointer-events-none">
                    <ShieldAlert className="w-48 h-48 text-red-600" />
                </div>

                <div className="flex items-start justify-between z-10 relative gap-4">
                    <div className="space-y-1">
                        <Label className="text-base font-semibold text-red-900 dark:text-red-400">Emergency Override</Label>
                        <p className="text-sm text-red-800/80 dark:text-red-400/80 max-w-xl">
                            Intelligently bypasses Quiet Hours <strong>only</strong> for active scholarships exploding within 24 hours. We strongly recommend keeping this enabled so you don&apos;t miss out on free funds while sleeping.
                        </p>
                    </div>
                    <Switch
                        checked={prefs.emergencyOverride}
                        onCheckedChange={(v) => handleUpdate({ emergencyOverride: v })}
                        disabled={saving}
                        className="data-[state=checked]:bg-red-600 mt-1 shrink-0"
                    />
                </div>
            </div>
        </div>
    );
}
