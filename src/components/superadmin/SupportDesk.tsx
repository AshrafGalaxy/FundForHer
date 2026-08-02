import { useState } from "react";
import { useFirestore } from "@/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, UserCog, AlertCircle, PieChart, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function SupportDesk() {
    const [emailQuery, setEmailQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [userSnapshot, setUserSnapshot] = useState<any | null>(null);
    const [error, setError] = useState<string | null>(null);
    const db = useFirestore();

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!emailQuery || !db) return;

        setLoading(true);
        setError(null);
        setUserSnapshot(null);

        try {
            const q = query(collection(db, "users"), where("email", "==", emailQuery.toLowerCase().trim()));
            const snap = await getDocs(q);

            if (snap.empty) {
                setError(`No user found matching exactly: ${emailQuery}`);
                return;
            }

            const rawUser = snap.docs[0].data();
            rawUser.id = snap.docs[0].id;

            // Let's also fetch their active application count to help debug pipelines
            const appsQ = query(collection(db, "applications"), where("userId", "==", rawUser.id));
            const appsSnap = await getDocs(appsQ);

            setUserSnapshot({ ...rawUser, totalApplicationsCount: appsSnap.size });
        } catch (err) {
            console.error("Support desk search failed", err);
            setError("An internal error occurred while querying the database.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-slate-50 dark:bg-slate-900 h-full min-h-[500px] border border-slate-200 dark:border-slate-800 rounded-xl p-6 relative overflow-hidden flex flex-col">

                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-3xl pointer-events-none rounded-full" />

                <div className="flex items-center gap-3 mb-6 relative z-10">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <UserCog className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-headline font-bold text-lg">Support Desk: Impersonation Snapshot</h3>
                        <p className="text-sm text-muted-foreground">Debug user profiles instantly to resolve support tickets.</p>
                    </div>
                </div>

                <form onSubmit={handleSearch} className="flex gap-2 relative z-10 mb-8">
                    <div className="relative w-full max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search user by exact email..."
                            className="pl-9 bg-card border-indigo-200 dark:border-indigo-800 focus-visible:ring-indigo-500"
                            value={emailQuery}
                            onChange={(e) => setEmailQuery(e.target.value)}
                            required
                        />
                    </div>
                    <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Query Snapshot"}
                    </Button>
                </form>

                {error && (
                    <div className="p-4 rounded-lg bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300 border border-red-200 dark:border-red-800/50 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" /> {error}
                    </div>
                )}

                {userSnapshot && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 flex-1">

                        {/* Identity Payload */}
                        <Card className="border-indigo-100 dark:border-indigo-900/40 shadow-sm bg-card/80 backdrop-blur-sm">
                            <CardContent className="p-6">
                                <h4 className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-4">Identity Envelope</h4>
                                <dl className="space-y-3">
                                    <div>
                                        <dt className="text-xs text-muted-foreground">UID</dt>
                                        <dd className="font-mono text-sm break-all">{userSnapshot.id}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-muted-foreground">Name</dt>
                                        <dd className="font-medium text-foreground">{userSnapshot.displayName || "Not Onboarded"}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-muted-foreground">Email</dt>
                                        <dd className="font-medium text-foreground">{userSnapshot.email}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-muted-foreground">Account Type</dt>
                                        <dd className="mt-1">
                                            {userSnapshot.provider ? <Badge variant="secondary" className="bg-amber-100 text-amber-800">Provider Data</Badge> : <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-100">Student Payload</Badge>}
                                        </dd>
                                    </div>
                                </dl>
                            </CardContent>
                        </Card>

                        {/* Match Engine Payload */}
                        <Card className="border-indigo-100 dark:border-indigo-900/40 shadow-sm bg-card/80 backdrop-blur-sm lg:col-span-2">
                            <CardContent className="p-6">
                                <h4 className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-4 flex items-center justify-between">
                                    Match Criteria State
                                    <div className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded text-[10px]">
                                        <PieChart className="w-3 h-3" /> {userSnapshot.isComplete ? "Profile 100% Locked" : "Incomplete Profile"}
                                    </div>
                                </h4>

                                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                                    <div>
                                        <dt className="text-xs text-muted-foreground">Gender Lock</dt>
                                        <dd className="font-medium text-foreground capitalize mt-0.5">{userSnapshot.gender || "Null"}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-muted-foreground">Education Tier</dt>
                                        <dd className="font-medium text-foreground capitalize mt-0.5">{userSnapshot.educationLevel || "Null"}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-muted-foreground">Declared Major / Stream</dt>
                                        <dd className="font-medium text-foreground capitalize mt-0.5">{userSnapshot.fieldOfStudy || userSnapshot.major || "Null"}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-muted-foreground">Geography Node</dt>
                                        <dd className="font-medium text-foreground capitalize mt-0.5">{userSnapshot.state || "Null"} / {userSnapshot.country || "Null"}</dd>
                                    </div>
                                    <div className="col-span-2 pt-2 mt-2 border-t border-dashed">
                                        <dt className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Info className="w-3.5 h-3.5" /> Pipeline Status
                                        </dt>
                                        <dd className="text-sm mt-1 text-foreground/80">
                                            This user currently has <strong>{userSnapshot.totalApplicationsCount}</strong> distinct documents in the `applications` sub-graph.
                                        </dd>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                    </div>
                )}
            </div>
        </div>
    );
}
