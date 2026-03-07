'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X, Share, MoreVertical, Smartphone, Check, Clock, BellOff } from 'lucide-react';
import Image from 'next/image';

type OS = 'windows' | 'android' | 'ios' | 'macos' | 'unknown';
type PWAStatus = 'checking' | 'unprompted' | 'feedback' | 'snoozed' | 'dismissed' | 'manual_instructions';

export const InstallAppWidget = () => {
    const [os, setOs] = useState<OS>('unknown');
    const [isInstalled, setIsInstalled] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [status, setStatus] = useState<PWAStatus>('checking');

    useEffect(() => {
        // 1. Check if already installed natively
        if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
            setIsInstalled(true);
            return;
        }

        // 2. Identify OS to tailor instructions
        let currentOs: OS = 'unknown';
        const userAgent = window.navigator.userAgent.toLowerCase();
        if (/windows/.test(userAgent)) {
            currentOs = 'windows';
        } else if (/android/.test(userAgent)) {
            currentOs = 'android';
        } else if (/iphone|ipad|ipod/.test(userAgent)) {
            currentOs = 'ios';
        } else if (/macintosh|mac os x/.test(userAgent)) {
            currentOs = 'macos';
        }
        setOs(currentOs);

        // 3. Check persistent user preferences
        const savedStatus = localStorage.getItem('fundherfuture_pwa_status');
        const snoozeDate = localStorage.getItem('fundherfuture_pwa_snooze');

        let initialStatus: PWAStatus = 'unprompted';

        if (savedStatus === 'dismissed') {
            initialStatus = 'dismissed';
        } else if (savedStatus === 'snoozed' && snoozeDate) {
            if (Date.now() < parseInt(snoozeDate, 10)) {
                initialStatus = 'snoozed';
            } else {
                // Snooze expired! Reset.
                localStorage.removeItem('fundherfuture_pwa_status');
                localStorage.removeItem('fundherfuture_pwa_snooze');
            }
        }

        // Delay showing the banner slightly so it feels natural
        setTimeout(() => setStatus(initialStatus), 1500);

        // 4. Capture native prompt (Android/Windows) even if we are overriding it
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Track successful installations
        const handleAppInstalled = () => {
            setIsInstalled(true);
            setStatus('unprompted');
        };
        window.addEventListener('appinstalled', handleAppInstalled);

        // Allow other components to trigger the widget manually
        const handleManualRequest = () => {
            setStatus('unprompted');
        };
        window.addEventListener('request-pwa-install', handleManualRequest);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
            window.removeEventListener('request-pwa-install', handleManualRequest);
        };
    }, []);

    const handleActionInstallClick = async () => {
        // If we have the native prompt ready, use it!
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            setDeferredPrompt(null);
            if (outcome === 'accepted') setIsInstalled(true);
        } else {
            // Otherwise, show our fallback instructions (iOS, Desktop, or blocked Android)
            setStatus('manual_instructions');
        }
    };

    const handleDismissClick = () => {
        // Instead of disappearing, smoothly transition to feedback state
        setStatus('feedback');
    };

    const handleFeedbackAction = (choice: 'snooze' | 'dismiss') => {
        if (choice === 'snooze') {
            // Snooze for 24 hours
            localStorage.setItem('fundherfuture_pwa_status', 'snoozed');
            localStorage.setItem('fundherfuture_pwa_snooze', (Date.now() + 24 * 60 * 60 * 1000).toString());
            setStatus('snoozed');
        } else {
            // Permanently dismiss banner
            localStorage.setItem('fundherfuture_pwa_status', 'dismissed');
            setStatus('dismissed');
        }
    };

    if (isInstalled || status === 'checking') return null;

    // --- State 1: Minimized "Always-Available" FAB Button ---
    if (status === 'snoozed' || status === 'dismissed') {
        return null; // Removing permanent FAB to improve visual aesthetic. Manual triggers are available on the landing page.
    }

    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-8 md:bottom-8 md:w-[420px] z-[100] animate-in slide-in-from-bottom-5 fade-in duration-500">
            {/* --- State 2: Manual Interactive Fallback UI --- */}
            {status === 'manual_instructions' && (
                <div className="bg-white dark:bg-[#301A18] border border-[#FFE4D6] dark:border-[#672B25] rounded-2xl shadow-2xl p-6 relative overflow-hidden animate-in fade-in duration-300">
                    <button
                        onClick={() => setStatus('dismissed')}
                        className="absolute top-3 right-3 text-[#A12B08] hover:text-[#361106] dark:text-[#FBA69B] dark:hover:text-[#FFF5F4] bg-[#FFF0E6] dark:bg-[#47221E] hover:bg-[#FFE4D6] dark:hover:bg-[#672B25] p-1.5 rounded-full transition-colors z-10"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className="w-16 h-16 bg-[#FFF0E6] dark:bg-[#47221E] rounded-2xl flex items-center justify-center border border-[#FFE4D6] dark:border-[#672B25] shadow-inner">
                            <Image src="/icon-192x192.svg" alt="App Icon" width={40} height={40} className="w-10 h-10" />
                        </div>

                        <div>
                            <h4 className="font-headline font-bold text-lg text-[#361106] dark:text-[#FFF5F4]">Add to Home Screen</h4>
                            <p className="text-sm text-[#7D250C] dark:text-[#FDC8C0] mt-2">
                                {(os === 'ios' || os === 'macos') ? (
                                    <>Tap the <Share className="inline w-4 h-4 mx-1 text-[#D43A08] dark:text-[#FBA69B]" /> <strong>Share</strong> button below and select <br /><strong>Add to Home Screen</strong>.</>
                                ) : (
                                    <>Tap the browser menu <MoreVertical className="inline w-4 h-4 mx-0.5 text-[#D43A08] dark:text-[#FBA69B]" /> at the top right and select <strong>Install app</strong> or Add to Home Screen.</>
                                )}
                            </p>
                        </div>

                        <Button
                            className="w-full font-semibold bg-theme-600 hover:bg-theme-700 text-white shadow-md border-none"
                            onClick={() => handleFeedbackAction('dismiss')}
                        >
                            Got it!
                        </Button>
                    </div>
                </div>
            )}

            {/* --- State 3: Feedback Questionnaire --- */}
            {status === 'feedback' && (
                <div className="bg-white dark:bg-[#301A18] border border-[#FFE4D6] dark:border-[#672B25] rounded-2xl shadow-2xl p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <h4 className="font-headline font-bold text-lg text-theme-900 dark:text-theme-100 mb-2">Remind you later?</h4>
                    <p className="text-sm text-theme-700 dark:text-theme-300 mb-6 font-medium">
                        You can always install the app later using the "Download App Now" button on the homepage.
                    </p>

                    <div className="space-y-3">
                        <Button
                            variant="outline"
                            className="w-full justify-start font-semibold border-theme-200 dark:border-theme-800 hover:bg-theme-50 dark:hover:bg-theme-900"
                            onClick={() => handleFeedbackAction('snooze')}
                        >
                            <Clock className="w-4 h-4 mr-2 text-theme-600" />
                            Remind me tomorrow
                        </Button>
                        <Button
                            variant="ghost"
                            className="w-full justify-start font-semibold text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                            onClick={() => handleFeedbackAction('dismiss')}
                        >
                            <BellOff className="w-4 h-4 mr-2" />
                            Don't show this popup again
                        </Button>
                    </div>
                </div>
            )}

            {/* --- State 4: Standard Initial Banner --- */}
            {status === 'unprompted' && (
                <div className="bg-white/95 dark:bg-[#301A18]/95 backdrop-blur-md border border-[#FFE4D6] dark:border-[#672B25] rounded-2xl shadow-2xl p-4 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-[#FFF0E6] dark:bg-[#47221E] rounded-xl flex items-center justify-center shadow-sm p-2 relative overflow-hidden">
                        <Image src="/icon-192x192.svg" alt="App Icon" width={28} height={28} className="w-full h-full object-contain relative z-10" />
                    </div>

                    <div className="flex-1 min-w-0 pr-2">
                        <h4 className="font-headline font-bold text-sm truncate text-[#361106] dark:text-[#FFF5F4]">Fund Her Future</h4>
                        <p className="text-xs text-[#7D250C] dark:text-[#FBA69B] truncate font-medium">Faster • Offline • Secure</p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                            onClick={handleActionInstallClick}
                            size="sm"
                            className="bg-theme-600 hover:bg-theme-700 text-white font-semibold px-4 rounded-xl shadow-md border-none"
                        >
                            <Download className="w-4 h-4 mr-1.5" />
                            Install
                        </Button>
                        <button
                            onClick={handleDismissClick}
                            className="text-[#A12B08] hover:text-[#361106] dark:text-[#FBA69B] dark:hover:text-[#FFF5F4] p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InstallAppWidget;
