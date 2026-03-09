'use client';

import { ArrowLeft, Settings2, ShieldCheck, UserCog, Palette, AlertTriangle, Trash2, LogOut, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { motion } from "framer-motion";
import { NotificationMatrix } from "@/components/settings/NotificationMatrix";
import { QuietHoursSettings } from "@/components/settings/QuietHoursSettings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCardAppearance } from "@/hooks/useCardAppearance";
import { useState } from "react";
import { useAuth as useFirebaseAuth, useFirestore } from '@/firebase';
import { useAuth } from '@/app/auth-provider';
import { deleteAccount, logout } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { linkWithPopup, GoogleAuthProvider } from 'firebase/auth';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function SettingsPage() {
    const { appearance, toggleAppearance } = useCardAppearance();
    const auth = useFirebaseAuth();
    const db = useFirestore();
    const authContext = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [isDeleting, setIsDeleting] = useState(false);

    const user = authContext?.user;
    const googleProvider = user?.providerData.find(p => p.providerId === 'google.com');
    const isGoogleLinked = !!googleProvider;
    const linkedGoogleEmail = googleProvider?.email || null;

    const handleLogout = async () => {
        if (!auth) return;
        await logout(auth);
        router.push('/login');
    };

    const handleDeleteAccount = async () => {
        if (!user || !auth || !db) return;
        setIsDeleting(true);
        try {
            await deleteAccount(auth, db, user.uid);
            toast({ title: "Account Deleted", description: "Your account and all associated data have been permanently removed." });
            router.push('/login');
        } catch (error: any) {
            toast({ variant: "destructive", title: "Deletion Failed", description: `An error occurred: ${error.message}. Please try logging out and back in again.` });
        } finally {
            setIsDeleting(false);
        }
    }

    const handleLinkGoogle = async () => {
        if (!auth || !auth.currentUser) return;
        try {
            const provider = new GoogleAuthProvider();
            await linkWithPopup(auth.currentUser, provider);
            toast({ title: "Account Linked!", description: "Your Google account has been successfully linked." });
            // Let the auth listener re-hydrate the user object
        } catch (error: any) {
            if (error.code === 'auth/credential-already-in-use') {
                toast({ variant: 'destructive', title: "Linking Failed", description: "This Google account is already linked to another user." });
            } else {
                toast({ variant: 'destructive', title: "Linking Failed", description: error.message });
            }
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 animate-in fade-in duration-500">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                <div>

                    <h1 className="text-3xl font-headline font-bold text-foreground tracking-tight flex items-center gap-3">
                        <Settings2 className="w-8 h-8 text-primary" />
                        Preferences
                    </h1>
                    <p className="text-muted-foreground mt-2 text-sm max-w-xl">
                        Manage your notification channels, establish quiet hours, and control account security.
                    </p>
                </div>
            </div>

            <Tabs defaultValue="notifications" className="w-full">
                <TabsList className="mb-6 bg-muted/50 p-1 w-full flex justify-start h-auto border flex-wrap gap-2">
                    <TabsTrigger value="notifications" className="text-sm py-2 px-6 rounded-md data-[state=active]:shadow-sm">
                        <BellIcon className="w-4 h-4 mr-2" /> Communications
                    </TabsTrigger>
                    <TabsTrigger value="appearance" className="text-sm py-2 px-6 rounded-md data-[state=active]:shadow-sm">
                        <Palette className="w-4 h-4 mr-2" /> Appearance
                    </TabsTrigger>
                    <TabsTrigger value="account" className="text-sm py-2 px-6 rounded-md data-[state=active]:shadow-sm">
                        <UserCog className="w-4 h-4 mr-2" /> Account
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="notifications" className="space-y-8">
                    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                        <Card className="border-border/50 shadow-sm overflow-hidden">
                            <CardContent className="p-6 sm:p-8">
                                <NotificationMatrix />
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4 }}>
                        <Card className="border-border/50 shadow-sm overflow-hidden">
                            <CardContent className="p-6 sm:p-8">
                                <QuietHoursSettings />
                            </CardContent>
                        </Card>
                    </motion.div>
                </TabsContent>

                <TabsContent value="appearance">
                    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                        <Card className="border-border/50 shadow-sm overflow-hidden">
                            <CardHeader className="bg-muted/30 border-b">
                                <CardTitle className="text-lg font-headline flex items-center gap-2">
                                    <Palette className="w-5 h-5 text-primary" /> Scholarship Card Style
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 sm:p-8">
                                <p className="text-sm text-muted-foreground mb-6">Choose how scholarship cards are displayed across your dashboard and profile. Classic is faster and simpler. Mega Plan uses immersive 3D tilting and hovering details.</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div
                                        className={`p-4 border rounded-xl cursor-pointer transition-all ${appearance === 'mega_plan' ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'hover:border-primary/50'}`}
                                        onClick={() => toggleAppearance('mega_plan')}
                                    >
                                        <h3 className="font-semibold mb-1">Mega Plan (Current)</h3>
                                        <p className="text-xs text-muted-foreground">3D tilt effects, expansive details on hover, and custom match score badges.</p>
                                    </div>
                                    <div
                                        className={`p-4 border rounded-xl cursor-pointer transition-all ${appearance === 'classic' ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'hover:border-primary/50'}`}
                                        onClick={() => toggleAppearance('classic')}
                                    >
                                        <h3 className="font-semibold mb-1">Classic (Previous)</h3>
                                        <p className="text-xs text-muted-foreground">Clean, straightforward, high-density standard card layout without motion.</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </TabsContent>

                <TabsContent value="account">
                    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                        <Card className="border-border/50 shadow-sm">
                            <CardHeader className="bg-muted/30 border-b">
                                <CardTitle className="text-lg font-headline flex items-center gap-2">
                                    <ShieldCheck className="w-5 h-5 text-primary" /> Secure Core Actions
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 sm:p-8 flex flex-col gap-4 max-w-2xl">
                                {isGoogleLinked ? (
                                    <div className="flex items-center gap-3 p-4 border rounded-lg bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-900/50">
                                        <svg className="h-6 w-6 shrink-0" viewBox="0 0 24 24">
                                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                        </svg>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-green-800 dark:text-green-300">Linked to Google</p>
                                            <p className="text-xs text-green-600 dark:text-green-400 truncate mt-0.5">{linkedGoogleEmail || 'Connected securely via SSO'}</p>
                                        </div>
                                        <BadgeCheck className="h-6 w-6 text-green-600 dark:text-green-500" />
                                    </div>
                                ) : (
                                    <Button onClick={handleLinkGoogle} variant="outline" className="w-full justify-start text-blue-600 dark:text-blue-400 hover:text-blue-700 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-900 border-blue-200 dark:border-blue-800 h-14">
                                        <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                        </svg>
                                        Connect Google Account for easier login
                                    </Button>
                                )}

                                <Button onClick={handleLogout} variant="outline" className="w-full justify-start h-12 mt-2">
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Sign Out Everywhere
                                </Button>

                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" className="w-full justify-start h-12 mt-4 bg-red-600 hover:bg-red-700">
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Permanently Delete Account
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle className="flex items-center gap-2">
                                                <AlertTriangle className="text-destructive h-5 w-5" />Are you absolutely sure?
                                            </AlertDialogTitle>
                                            <AlertDialogDescription className="text-sm font-medium leading-relaxed mt-2">
                                                This action is <span className="text-destructive font-bold">permanent and irreversible.</span> This will instantly destroy your user profile, saved scholarships, documents, and all active tracking data from our databases.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter className="mt-6">
                                            <AlertDialogCancel>Go Back</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleDeleteAccount} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                                {isDeleting ? 'Deleting Forever...' : 'Yes, Delete My Data'}
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </CardContent>
                        </Card>
                    </motion.div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

// Inline Bell Icon for Tabs to avoid importing Bell from lucide repeatedly if imported in children
function BellIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
    );
}
