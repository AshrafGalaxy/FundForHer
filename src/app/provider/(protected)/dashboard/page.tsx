
'use client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Edit, Trash2 } from "lucide-react";
import type { Scholarship } from "@/lib/types";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/app/auth-provider";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProviderProfile } from "@/server/db/user-data";
import { useFirestore } from "@/firebase";
import { getProviderProfile } from "@/server/db/user-data";


function ProviderDashboard() {
    const authContext = useAuth();
    const db = useFirestore();

    const [providerProfile, setProviderProfile] = useState<ProviderProfile | null>(null);
    const [myScholarships, setMyScholarships] = useState<Scholarship[]>([]);
    const [profileLoading, setProfileLoading] = useState(true);
    const [scholarshipsLoading, setScholarshipsLoading] = useState(true);

    const authLoading = authContext ? authContext.loading : true;
    const user = authContext ? authContext.user : null;

    useEffect(() => {
        if (!authLoading && user && db) {
            setProfileLoading(true);
            getProviderProfile(db, user.uid)
                .then(profile => {
                    setProviderProfile(profile);
                    if (profile) {
                        fetch('/api/scholarships')
                            .then(res => res.json())
                            .then((data: Scholarship[]) => {
                                const providerScholarships = data.filter(s => s.provider === profile.companyName)
                                    .map(s => ({
                                        ...s,
                                        deadline: s.deadline ? new Date(s.deadline) : new Date(),
                                        lastUpdated: s.lastUpdated ? new Date(s.lastUpdated) : new Date(),
                                    }));
                                setMyScholarships(providerScholarships);
                            })
                            .catch(console.error);
                    }
                })
                .catch(console.error)
                .finally(() => {
                    setProfileLoading(false);
                    setScholarshipsLoading(false);
                });
        } else if (!authLoading && !user) {
            setProfileLoading(false);
            setScholarshipsLoading(false);
        }
    }, [authLoading, user, db]);

    const isLoading = authLoading || profileLoading || (providerProfile && scholarshipsLoading);

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <header className="mb-8">
                    <Skeleton className="h-10 w-1/2 mb-2" />
                    <Skeleton className="h-6 w-3/4" />
                </header>
                <div className="flex justify-between items-center mb-6">
                    <Skeleton className="h-8 w-1/3" />
                    <Skeleton className="h-10 w-48" />
                </div>
                <div className="space-y-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                </div>
            </div>
        );
    }

    if (!providerProfile) {
        return (
            <div className="container mx-auto px-4 py-8 text-center">
                <h1 className="text-2xl font-bold text-destructive">Profile not found</h1>
                <p className="text-muted-foreground">Could not load provider profile. You may not be registered as a provider.</p>
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <header className="mb-8">
                <h1 className="text-4xl font-headline font-bold">Welcome, {providerProfile.companyName}</h1>
                <p className="text-lg text-muted-foreground">Manage your scholarships and applications from here.</p>
            </header>

            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-headline font-semibold">Your Scholarship Listings</h2>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add New Scholarship
                </Button>
            </div>

            {myScholarships.length > 0 ? (
                <div className="space-y-4">
                    {myScholarships.map(scholarship => (
                        <Card key={scholarship.id} className="flex flex-col md:flex-row items-start justify-between p-4">
                            <div className="mb-4 md:mb-0">
                                <CardTitle className="text-xl">{scholarship.title}</CardTitle>
                                <CardDescription>Amount: <span style={{ fontFamily: 'sans-serif' }}>₹</span>{new Intl.NumberFormat('en-IN').format(scholarship.amount)} | Deadline: {scholarship.deadline ? scholarship.deadline.toLocaleDateString() : '...'}</CardDescription>
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                                <Button variant="outline" size="sm"><Edit className="mr-2 h-4 w-4" />Edit</Button>
                                <Button variant="destructive" size="sm"><Trash2 className="mr-2 h-4 w-4" />Delete</Button>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card>
                    <CardContent className="text-center py-16">
                        <h3 className="text-xl font-semibold">No scholarships posted yet</h3>
                        <p className="text-muted-foreground mt-2">Click the button above to add your first scholarship.</p>
                    </CardContent>
                </Card>
            )}

        </div>
    );
}

export default ProviderDashboard;
