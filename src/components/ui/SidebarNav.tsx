'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    LogOut,
    BookOpen,
    FilePenLine,
    Sparkles,
    Users,
    GraduationCap,
    ClipboardList,
    Settings,
    User,
    LayoutDashboard,
    PanelLeftClose,
    PanelLeftOpen,
    PanelLeft
} from 'lucide-react';
import { useAuth as useFirebaseAuth } from '@/firebase';
import { useAuth } from '@/app/auth-provider';
import { logout } from '@/lib/auth';
import { useNavigationStore } from '@/hooks/useNavigationStore';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Logo from '@/components/ui/Logo';

interface SidebarNavProps {
    isProvider?: boolean;
}

export function SidebarNav({ isProvider = false }: SidebarNavProps) {
    const pathname = usePathname();
    const router = useRouter();
    const auth = useFirebaseAuth();
    const authContext = useAuth();
    const { sidebarState, cycleSidebarState } = useNavigationStore();

    const handleLogout = async () => {
        if (!auth) return;
        const targetUrl = isProvider ? '/provider/login' : '/login';
        await logout(auth);
        router.push(targetUrl);
    };

    const studentLinks = [
        { href: '/authenticated/dashboard', label: 'Scholarships', icon: BookOpen },
        { href: '/authenticated/applications', label: 'My Applications', icon: ClipboardList },
        { href: '/authenticated/community', label: 'Community', icon: Users },
        { href: '/authenticated/mentorship', label: 'Mentorship', icon: GraduationCap },
        { href: '/authenticated/apply', label: 'Apply Now', icon: FilePenLine },
        { href: '/authenticated/feedback', label: 'Feedback', icon: Sparkles },
        { href: '/authenticated/settings', label: 'Settings', icon: Settings },
    ];

    const providerLinks = [
        { href: '/provider/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ];

    const links = isProvider ? providerLinks : studentLinks;

    if (!authContext?.user) return null;

    if (sidebarState === 'hidden') {
        return (
            <div className="fixed top-20 left-0 z-50 animate-in slide-in-from-left-4 fade-in duration-300 hidden md:block">
                <TooltipProvider delayDuration={200}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={cycleSidebarState}
                                className="h-12 w-6 rounded-l-none border-l-0 bg-card shadow-lg flex items-center justify-center text-muted-foreground hover:text-primary"
                            >
                                <PanelLeft className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right">Show Navigation</TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        );
    }

    const isCollapsed = sidebarState === 'collapsed';

    return (
        <aside
            className={cn(
                "hidden md:flex flex-col h-[calc(100vh-4rem)] sticky top-16 border-r border-border bg-card transition-all duration-300 z-30 shrink-0",
                isCollapsed ? "w-[80px]" : "w-[240px]"
            )}
        >
            {/* 1. Toggle Header */}
            <div className={cn("p-4 border-b border-border flex items-center h-16 shrink-0", isCollapsed ? "justify-center" : "justify-end")}>
                {/* Toggle Button */}
                <TooltipProvider delayDuration={200}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={cycleSidebarState}
                                className={cn("h-8 w-8 text-muted-foreground hover:text-foreground shrink-0", isCollapsed && "mx-auto")}
                            >
                                {isCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right">Toggle Sidebar</TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>

            {/* 3. Navigation Links */}
            <div className="flex-1 py-4 px-3 overflow-y-auto space-y-1.5 no-scrollbar">
                <TooltipProvider delayDuration={0}>
                    {links.map((link) => {
                        const isActive = pathname.startsWith(link.href);
                        return (
                            <Tooltip key={link.href}>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant={isActive ? 'secondary' : 'ghost'}
                                        className={cn(
                                            'w-full h-11 relative overflow-hidden transition-all',
                                            isCollapsed ? 'justify-center px-0' : 'justify-start px-3 py-2',
                                            isActive ? 'bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary font-semibold' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                                        )}
                                        asChild
                                    >
                                        <Link href={link.href}>
                                            <link.icon className={cn("h-5 w-5 shrink-0 transition-colors", isActive ? "text-primary" : "text-muted-foreground", !isCollapsed && "mr-3")} />
                                            {!isCollapsed && <span className="truncate transition-opacity duration-300">{link.label}</span>}
                                            {/* Active indicator bar */}
                                            {isActive && isCollapsed && (
                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
                                            )}
                                        </Link>
                                    </Button>
                                </TooltipTrigger>
                                {isCollapsed && (
                                    <TooltipContent side="right" className="border-border/50 text-sm font-semibold bg-background/95 backdrop-blur-sm shadow-xl">
                                        {link.label}
                                    </TooltipContent>
                                )}
                            </Tooltip>
                        );
                    })}
                </TooltipProvider>
            </div>

            {/* 3. Footer Section (Profile + Logout) */}
            <div className="p-3 mt-auto border-t border-border bg-card flex flex-col gap-2 pb-6">
                {/* Profile Link Block */}
                <TooltipProvider delayDuration={0}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Link href="/authenticated/profile" className={cn("flex items-center gap-3 p-2 rounded-md hover:bg-muted transition-colors cursor-pointer group", isCollapsed && "justify-center")}>
                                <Avatar className={cn("border border-primary/20 shrink-0 group-hover:border-primary/50 transition-colors", isCollapsed ? "h-9 w-9" : "h-9 w-9")}>
                                    <AvatarImage src={authContext.user.photoURL || ''} alt={authContext.user.displayName || 'User'} />
                                    <AvatarFallback className="bg-primary/5 text-primary font-bold">{authContext.user.displayName?.charAt(0) || 'U'}</AvatarFallback>
                                </Avatar>
                                {!isCollapsed && (
                                    <div className="flex flex-col min-w-0">
                                        <span className="font-semibold text-sm truncate group-hover:text-primary transition-colors">{authContext.user.displayName || 'Student'}</span>
                                        <span className="text-xs text-muted-foreground truncate">{authContext.user.email}</span>
                                    </div>
                                )}
                            </Link>
                        </TooltipTrigger>
                        {isCollapsed && (
                            <TooltipContent side="right" className="border-border/50 text-sm font-semibold bg-background/95 backdrop-blur-sm shadow-xl">
                                My Profile
                            </TooltipContent>
                        )}
                    </Tooltip>
                </TooltipProvider>

                {/* Logout Button */}
                <TooltipProvider delayDuration={0}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                onClick={handleLogout}
                                className={cn(
                                    "w-full h-11 text-muted-foreground hover:bg-red-500/10 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 group transition-all",
                                    isCollapsed ? "justify-center px-0" : "justify-start px-3"
                                )}
                            >
                                <LogOut className={cn("h-5 w-5 shrink-0 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors", !isCollapsed && "mr-3")} />
                                {!isCollapsed && <span className="font-semibold">Logout</span>}
                            </Button>
                        </TooltipTrigger>
                        {isCollapsed && (
                            <TooltipContent side="right" className="border-border/50 text-red-600 dark:text-red-400 font-semibold bg-background/95 backdrop-blur-sm shadow-xl">
                                Logout
                            </TooltipContent>
                        )}
                    </Tooltip>
                </TooltipProvider>
            </div>
        </aside>
    );
}
