
// src/components/Header.tsx
'use client';

import Link from 'next/link';
import { Menu, User, X, LogOut, LogIn, Sparkles, Sun, Moon, Monitor, BookOpen, FilePenLine, UserPlus, Briefcase, LayoutDashboard } from 'lucide-react';
import Logo from '@/components/ui/Logo';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "next-themes"
import { logout } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth as useFirebaseAuth, useFirestore } from '@/firebase';
import { useAuth } from './auth-provider';
import { getProviderProfile } from '@/server/db/user-data';

export const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProvider, setIsProvider] = useState(false);
  const [isProviderLoading, setIsProviderLoading] = useState(true);

  const auth = useFirebaseAuth();
  const db = useFirestore();
  const authContext = useAuth();
  const { setTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();

  const user = authContext?.user;
  const authLoaded = authContext ? !authContext.loading : false;

  useEffect(() => {
    // This is a separate, streamlined check just for the header's display logic.
    const checkProviderStatus = async () => {
      setIsProviderLoading(true);
      if (user && db) {
        try {
          const provider = await getProviderProfile(db, user.uid);
          setIsProvider(!!provider);
        } catch (e) {
          console.error("Failed to check provider status:", e);
          setIsProvider(false);
        }
      } else {
        setIsProvider(false);
      }
      setIsProviderLoading(false);
    };
    if (authLoaded) {
      checkProviderStatus();
    }
  }, [user, db, authLoaded]);


  const handleLogout = async () => {
    if (!auth) return;
    const targetUrl = isProvider ? '/provider/login' : '/login';
    await logout(auth);
    router.push(targetUrl);
  };

  const studentNavLinks = [
    { href: '/authenticated/dashboard', label: 'Scholarships', icon: BookOpen },
    { href: '/authenticated/apply', label: 'Apply Now', icon: FilePenLine },
    { href: '/authenticated/feedback', label: 'Feedback', icon: Sparkles },
  ];

  const providerNavLinks = [
    { href: '/provider/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    // Add other provider links here, e.g., for creating scholarships
  ];

  const navLinks = isProvider ? providerNavLinks : studentNavLinks;

  const authRoutes = [
    '/login',
    '/register',
    '/provider/login',
    '/provider/register'
  ];

  if (authRoutes.includes(pathname)) {
    return null;
  }


  const NavLink = ({ href, children, className }: { href: string, children: React.ReactNode, className?: string }) => {
    const isActive = pathname === href;
    return (
      <Link
        href={href}
        className={cn(
          'text-muted-foreground transition-colors hover:text-theme-900 dark:hover:text-theme-300',
          isActive && 'text-sidebar-primary font-semibold',
          className
        )}
      >
        {children}
      </Link>
    );
  };

  const MobileNavLink = ({ href, children, onClick }: { href: string, children: React.ReactNode, onClick: () => void }) => {
    const isActive = pathname === href;
    return (
      <Link
        href={href}
        onClick={onClick}
        className={cn(
          'text-muted-foreground transition-colors hover:text-theme-900 dark:hover:text-theme-300 flex items-center gap-2',
          isActive && 'text-sidebar-primary font-semibold'
        )}
      >
        {children}
      </Link>
    )
  }

  const renderUserMenu = () => {
    if (!authLoaded || (user && isProviderLoading)) {
      return <Skeleton className="h-10 w-28" />; // Placeholder to prevent layout shift
    }

    if (!user) {
      return (
        <div className="flex items-center gap-1">
          <Button asChild>
            <Link href="/login">
              <LogIn className="h-4 w-4 mr-2" />
              Login
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/register">
              Register
            </Link>
          </Button>
        </div>
      )
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <User className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => router.push(isProvider ? '/provider/dashboard' : '/authenticated/profile')}>
            <User className="mr-2 h-4 w-4" /> {isProvider ? 'Dashboard' : 'Profile'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  const renderNavLinks = () => {
    if (!user) {
      // No nav links for unauthenticated users on the landing page,
      // just the Login/Register buttons.
      return null;
    }
    return (
      navLinks.map(link => (
        <Button key={link.href} variant="ghost" asChild>
          <NavLink href={link.href}>
            <span className="flex items-center gap-1.5">
              <link.icon className="h-4 w-4" />
              {link.label}
            </span>
          </NavLink>
        </Button>
      ))
    )
  }


  return (
    <header className="bg-card shadow-sm sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <Logo className="w-8 h-8 text-primary" />
            <span className="text-xl font-headline font-bold text-card-foreground">
              FUND HER FUTURE
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-2 text-sm font-medium">
            {renderNavLinks()}
            <div className="flex items-center gap-2">
              {renderUserMenu()}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="sr-only">Toggle theme</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setTheme("light")}>
                    <Sun className="mr-2 h-4 w-4" /> Light
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("dark")}>
                    <Moon className="mr-2 h-4 w-4" /> Dark
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("system")}>
                    <Monitor className="mr-2 h-4 w-4" /> System
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </nav>

          {/* Mobile Nav */}
          <div className="md:hidden flex items-center">
            {authLoaded && (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                      <span className="sr-only">Toggle theme</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setTheme("light")}>
                      <Sun className="mr-2 h-4 w-4" /> Light
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme("dark")}>
                      <Moon className="mr-2 h-4 w-4" /> Dark
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme("system")}>
                      <Monitor className="mr-2 h-4 w-4" /> System
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Menu className="h-6 w-6" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-[240px] bg-card [&>button]:hidden">
                    <div className="flex justify-between items-center mb-8">
                      <Link href="/" className="flex items-center gap-2" onClick={() => setIsMenuOpen(false)}>
                        <Logo className="w-8 h-8 text-primary" />
                        <span className="text-lg font-headline font-bold text-card-foreground">
                          FUND HER FUTURE
                        </span>
                      </Link>
                      <SheetClose asChild>
                        <Button variant="ghost" size="icon">
                          <X className="h-6 w-6" />
                        </Button>
                      </SheetClose>
                    </div>
                    <nav className="flex flex-col gap-6 text-lg">
                      {user ? (
                        <>
                          {navLinks.map(link => (
                            <MobileNavLink
                              key={link.href}
                              href={link.href}
                              onClick={() => setIsMenuOpen(false)}
                            >
                              <link.icon className="h-5 w-5" />
                              {link.label}
                            </MobileNavLink>
                          ))}
                          <MobileNavLink
                            href={isProvider ? '/provider/dashboard' : '/authenticated/profile'}
                            onClick={() => setIsMenuOpen(false)}
                          >
                            <User className="h-5 w-5" /> {isProvider ? 'Dashboard' : 'Profile'}
                          </MobileNavLink>
                          <Button variant="ghost" onClick={() => { handleLogout(); setIsMenuOpen(false); }} className="flex items-center justify-start gap-2 text-lg text-muted-foreground hover:text-theme-900 dark:hover:text-theme-300 p-0 h-auto">
                            <LogOut className="h-5 w-5" /> Logout
                          </Button>
                        </>
                      ) : (
                        <>
                          <MobileNavLink href="/login" onClick={() => setIsMenuOpen(false)}>
                            <LogIn className="h-5 w-5" /> Login
                          </MobileNavLink>
                          <MobileNavLink href="/register" onClick={() => setIsMenuOpen(false)}>
                            <UserPlus className="h-5 w-5" /> Register
                          </MobileNavLink>
                          <MobileNavLink href="/provider/login" onClick={() => setIsMenuOpen(false)}>
                            <Briefcase className="h-5 w-5" /> For Providers
                          </MobileNavLink>
                        </>
                      )}
                    </nav>
                  </SheetContent>
                </Sheet>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
