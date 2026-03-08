'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/app/auth-provider';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldCheck, XCircle, ExternalLink, ShieldAlert } from 'lucide-react';
import type { ProviderProfile } from '@/server/db/user-data';
import Link from 'next/link';

const SUPERADMIN_EMAIL = 'karanbainade02@gmail.com';

export default function SuperAdminDashboard() {
    const authContext = useAuth();
    const db = useFirestore();
    const { toast } = useToast();

    const [providers, setProviders] = useState<ProviderProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const user = authContext?.user;
    const isAuthLoading = authContext?.loading;

    useEffect(() => {
        const fetchPendingProviders = async () => {
            if (!db || !user) return;

            if (user.email !== SUPERADMIN_EMAIL) {
                setLoading(false);
                return;
            }

            try {
                const q = query(
                    collection(db, 'providers'),
                    where('kycStatus', '==', 'pending')
                );
                const snapshot = await getDocs(q);
                const fetched: ProviderProfile[] = [];
                snapshot.forEach(doc => {
                    fetched.push({ uid: doc.id, ...doc.data() } as ProviderProfile);
                });
                setProviders(fetched);
            } catch (error) {
                console.error("Failed to fetch providers", error);
            } finally {
                setLoading(false);
            }
        };

        if (!isAuthLoading) {
            fetchPendingProviders();
        }
    }, [db, user, isAuthLoading]);

    const handleVerification = async (uid: string, action: 'verified' | 'rejected') => {
        if (!db) return;
        setProcessingId(uid);
        try {
            await updateDoc(doc(db, 'providers', uid), {
                kycStatus: action,
                updatedAt: serverTimestamp()
            });

            // Remove from list visually
            setProviders(prev => prev.filter(p => p.uid !== uid));

            toast({
                title: action === 'verified' ? 'Provider Approved' : 'Provider Rejected',
                description: `The provider has been successfully ${action}.`,
                variant: action === 'verified' ? 'default' : 'destructive'
            });
        } catch (error: any) {
            toast({
                title: 'Action Failed',
                description: error.message,
                variant: 'destructive'
            });
        } finally {
            setProcessingId(null);
        }
    };

    if (isAuthLoading || loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    // Security block
    if (!user || user.email !== SUPERADMIN_EMAIL) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-secondary/30 p-4 text-center">
                <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
                <h1 className="text-3xl font-headline font-bold mb-2">Access Denied</h1>
                <p className="text-muted-foreground mb-6">You do not have SuperAdmin clearance to view this sector.</p>
                <Button asChild><Link href="/">Return to Registry</Link></Button>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-12 max-w-6xl">
            <header className="mb-10 text-center">
                <h1 className="text-4xl font-headline font-black tracking-tight flex items-center justify-center gap-3">
                    <ShieldCheck className="w-10 h-10 text-primary" />
                    Global Command Center
                </h1>
                <p className="text-lg text-muted-foreground mt-2">
                    Review and verify pending provider organizations to issue Blue Ticks.
                </p>
            </header>

            {providers.length === 0 ? (
                <Card className="text-center py-16 border-dashed border-2 bg-secondary/10">
                    <CardHeader>
                        <CardTitle className="text-2xl text-muted-foreground">Zero Pending Requests</CardTitle>
                        <CardDescription>
                            All provider KYC applications have been cleared. Platform is secure.
                        </CardDescription>
                    </CardHeader>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {providers.map((provider) => (
                        <Card key={provider.uid} className="shadow-lg border-primary/20 flex flex-col">
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-xl">{provider.companyName}</CardTitle>
                                        <CardDescription className="mt-1 flex flex-col gap-1">
                                            <span>Email: {provider.email}</span>
                                            <span>Reg: {provider.registrationNumber} | GST: {provider.gstNumber}</span>
                                        </CardDescription>
                                    </div>
                                    <span className="bg-orange-100 text-orange-800 text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase border border-orange-200">
                                        Pending Review
                                    </span>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-grow flex flex-col justify-center">
                                {provider.kycDocumentUrl ? (
                                    <Button asChild variant="outline" className="w-full mb-4">
                                        <a href={provider.kycDocumentUrl} target="_blank" rel="noopener noreferrer">
                                            <ExternalLink className="w-4 h-4 mr-2" /> View Encrypted KYC Document
                                        </a>
                                    </Button>
                                ) : (
                                    <p className="text-sm text-destructive font-medium border border-destructive/20 bg-destructive/5 p-3 rounded-md mb-4 text-center">
                                        No Document Uploaded. Requires investigation.
                                    </p>
                                )}
                            </CardContent>
                            <CardFooter className="flex gap-3 pt-4 border-t bg-secondary/5">
                                <Button
                                    className="flex-1 bg-green-600 hover:bg-green-700"
                                    disabled={processingId === provider.uid}
                                    onClick={() => handleVerification(provider.uid, 'verified')}
                                >
                                    {processingId === provider.uid ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                                    Approve Blue Tick
                                </Button>
                                <Button
                                    variant="destructive"
                                    className="flex-1"
                                    disabled={processingId === provider.uid}
                                    onClick={() => handleVerification(provider.uid, 'rejected')}
                                >
                                    {processingId === provider.uid ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                                    Reject & Ban
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
