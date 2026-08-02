import { useState, useEffect } from "react";
import { useAuth, useFirestore } from "@/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { BellRing, Mail, MessageSquare, Smartphone, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type ChannelState = {
    email: boolean;
    sms: boolean;
    whatsapp: boolean;
};

type MatrixState = {
    applicationUpdates: ChannelState;
    newMatches: ChannelState;
    mentorship: ChannelState;
    community: ChannelState;
};

const DEFAULT_MATRIX: MatrixState = {
    applicationUpdates: { email: true, sms: false, whatsapp: true },
    newMatches: { email: true, sms: false, whatsapp: false },
    mentorship: { email: true, sms: false, whatsapp: true },
    community: { email: true, sms: false, whatsapp: false },
};

export function NotificationMatrix() {
    const [matrix, setMatrix] = useState<MatrixState>(DEFAULT_MATRIX);
    const [loading, setLoading] = useState(true);
    const [savingField, setSavingField] = useState<string | null>(null);

    const auth = useAuth();
    const db = useFirestore();
    const { toast } = useToast();

    useEffect(() => {
        if (!auth?.currentUser || !db) return;

        const fetchPreferences = async () => {
            try {
                const userRef = doc(db, 'users', auth.currentUser!.uid);
                const userSnap = await getDoc(userRef);

                if (userSnap.exists() && userSnap.data().notificationMatrix) {
                    setMatrix(userSnap.data().notificationMatrix);
                }
            } catch (error) {
                console.error("Failed to fetch notification preferences", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPreferences();
    }, [auth?.currentUser, db]);

    const handleToggle = async (category: keyof MatrixState, channel: keyof ChannelState) => {
        if (!auth?.currentUser || !db) return;

        const fieldId = `${category}-${channel}`;
        setSavingField(fieldId);

        const updatedMatrix = {
            ...matrix,
            [category]: {
                ...matrix[category],
                [channel]: !matrix[category][channel]
            }
        };

        try {
            // Optimistic update
            setMatrix(updatedMatrix);

            const userRef = doc(db, 'users', auth.currentUser.uid);
            await updateDoc(userRef, { notificationMatrix: updatedMatrix });

        } catch (error) {
            console.error("Failed to update preferences", error);
            // Revert on failure
            setMatrix(matrix);
            toast({ title: "Error", description: "Could not save preference.", variant: "destructive" });
        } finally {
            setSavingField(null);
        }
    };

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-primary w-6 h-6" /></div>;

    const categories = [
        { id: 'applicationUpdates' as const, label: 'Application Status Updates', desc: 'When your application moves to Under Review, Shortlisted, or Awarded.' },
        { id: 'newMatches' as const, label: 'New High-Match Scholarships', desc: 'When the AI finds a new 80%+ match for your profile.' },
        { id: 'mentorship' as const, label: 'Mentorship Hub', desc: 'Coffee chat requests, acceptances, and reminders.' },
        { id: 'community' as const, label: 'Peer Community', desc: 'When someone replies to your post or pins your solution.' },
    ];

    return (
        <div className="space-y-6">
            <div className="mb-6 border-b pb-4">
                <h3 className="font-headline font-bold text-lg text-foreground flex items-center gap-2">
                    <BellRing className="w-5 h-5 text-primary" /> The "Tri-Channel" Matrix
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                    Granularly control exactly <strong>how</strong> you want to be notified for specific events to avoid clutter.
                </p>
            </div>

            <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-muted/50 border-b">
                            <th className="p-4 font-semibold text-sm text-muted-foreground w-1/2">Event Category</th>
                            <th className="p-4 text-center">
                                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                                    <Mail className="w-4 h-4" /> <span className="text-xs font-semibold uppercase tracking-wider">Email</span>
                                </div>
                            </th>
                            <th className="p-4 text-center">
                                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                                    <MessageSquare className="w-4 h-4" /> <span className="text-xs font-semibold uppercase tracking-wider">SMS</span>
                                </div>
                            </th>
                            <th className="p-4 text-center">
                                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                                    <Smartphone className="w-4 h-4" /> <span className="text-xs font-semibold uppercase tracking-wider">WhatsApp</span>
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {categories.map((cat) => (
                            <tr key={cat.id} className="hover:bg-muted/20 transition-colors">
                                <td className="p-4">
                                    <p className="font-semibold text-foreground text-sm">{cat.label}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5 max-w-sm">{cat.desc}</p>
                                </td>
                                <td className="p-4 text-center">
                                    <div className="flex justify-center relative">
                                        <Switch
                                            checked={matrix[cat.id].email}
                                            onCheckedChange={() => handleToggle(cat.id, 'email')}
                                            disabled={savingField === `${cat.id}-email`}
                                            className="data-[state=checked]:bg-primary"
                                        />
                                    </div>
                                </td>
                                <td className="p-4 text-center">
                                    <div className="flex justify-center">
                                        <Switch
                                            checked={matrix[cat.id].sms}
                                            onCheckedChange={() => handleToggle(cat.id, 'sms')}
                                            disabled={savingField === `${cat.id}-sms`}
                                            className="data-[state=checked]:bg-primary"
                                        />
                                    </div>
                                </td>
                                <td className="p-4 text-center">
                                    <div className="flex justify-center">
                                        <Switch
                                            checked={matrix[cat.id].whatsapp}
                                            onCheckedChange={() => handleToggle(cat.id, 'whatsapp')}
                                            disabled={savingField === `${cat.id}-whatsapp`}
                                            className="data-[state=checked]:bg-emerald-500" // Special color for WhatsApp
                                        />
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
