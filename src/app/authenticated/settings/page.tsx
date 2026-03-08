'use client';

import { ArrowLeft, Settings2, ShieldCheck, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { motion } from "framer-motion";
import { NotificationMatrix } from "@/components/settings/NotificationMatrix";
import { QuietHoursSettings } from "@/components/settings/QuietHoursSettings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";

export default function SettingsPage() {
    return (
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 animate-in fade-in duration-500">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                <div>
                    <Button variant="ghost" className="-ml-4 mb-2 text-muted-foreground hover:text-foreground" asChild>
                        <Link href="/authenticated/dashboard"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard</Link>
                    </Button>
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
                <TabsList className="mb-6 bg-muted/50 p-1 w-full flex justify-start h-auto border">
                    <TabsTrigger value="notifications" className="text-sm py-2 px-6 rounded-md data-[state=active]:shadow-sm">
                        <BellIcon className="w-4 h-4 mr-2" /> Communications
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

                <TabsContent value="account">
                    <Card className="border-border/50 shadow-sm">
                        <CardContent className="p-12 text-center text-muted-foreground flex flex-col items-center">
                            <ShieldCheck className="w-12 h-12 text-primary/30 mb-4" />
                            <h3 className="text-lg font-headline font-semibold text-foreground">Secure Core</h3>
                            <p className="max-w-md mt-2 text-sm">Account deletion and raw data exports are handled directly through via Firebase Auth. Additional identity controls will appear here.</p>
                        </CardContent>
                    </Card>
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
