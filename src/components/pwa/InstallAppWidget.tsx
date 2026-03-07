'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Info, X, Share, MoreVertical } from 'lucide-react';
import Image from 'next/image';

type OS = 'windows' | 'android' | 'ios' | 'macos' | 'unknown';

export const InstallAppWidget = () => {
    const [os, setOs] = useState<OS>('unknown');
    const [isInstalled, setIsInstalled] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showFallback, setShowFallback] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);

    useEffect(() => {
        // 1. Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
            setIsInstalled(true);
            return;
        }

        let currentOs: OS = 'unknown';
        const userAgent = window.navigator.userAgent.toLowerCase();
        if (/windows/.test(userAgent)) {
            currentOs = 'windows';
            setOs('windows');
        } else if (/android/.test(userAgent)) {
            currentOs = 'android';
            setOs('android');
        } else if (/iphone|ipad|ipod/.test(userAgent)) {
            currentOs = 'ios';
            setOs('ios');
        } else if (/macintosh|mac os x/.test(userAgent)) {
            currentOs = 'macos';
            setOs('macos');
        } else {
            setOs('unknown');
        }

        // 3. Listen for the native install prompt event (Windows/Android)
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            // On Android/Windows, ONLY show the banner when the native prompt is actually ready!
            // This guarantees the "Install" button will automatically install without falling back.
            setIsVisible(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Track successful installations
        const handleAppInstalled = () => {
            setIsInstalled(true);
            setIsVisible(false);
            setDeferredPrompt(null);
        };
        window.addEventListener('appinstalled', handleAppInstalled);

        // 4. Time Delay Fallback ONLY for iOS / macOS since they never fire 'beforeinstallprompt'
        let timer: any;
        if (currentOs === 'ios' || currentOs === 'macos') {
            timer = setTimeout(() => {
                setIsVisible(true);
            }, 10000); // 10 seconds for iOS manual instructions
        }

        // Note: For Android, we do NOT use a timer. We wait for beforeinstallprompt. 
        // This stops the widget from appearing before it can do an automated install.

        return () => {
            if (timer) clearTimeout(timer);
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const handleInstallClick = async () => {
        if (os === 'ios' || os === 'macos' || !deferredPrompt) {
            // Trigger beautiful fallback UI
            setShowFallback(true);
            return;
        }

        // Show the native Android/Windows install prompt
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        setDeferredPrompt(null);

        if (outcome === 'accepted') {
            setIsVisible(false);
        }
    };

    // If installed, dismissed, or not yet visible - render nothing
    if (isInstalled || isDismissed || !isVisible) {
        return null;
    }

    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-8 md:bottom-8 md:w-[400px] z-[100] animate-in slide-in-from-bottom-5 fade-in duration-500">
            {showFallback ? (
                // Premium Visual Fallback UI
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 relative overflow-hidden">
                    <button
                        onClick={() => setShowFallback(false)}
                        className="absolute top-3 right-3 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 p-1.5 rounded-full transition-colors z-10"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-inner">
                            <Image src="/icon-192x192.svg" alt="App Icon" width={40} height={40} className="w-10 h-10" />
                        </div>

                        <div>
                            <h4 className="font-headline font-bold text-lg text-slate-900 dark:text-white">Add to Home Screen</h4>
                            <p className="text-sm text-slate-700 dark:text-slate-300 mt-2">
                                {(os === 'ios' || os === 'macos') ? (
                                    <>Tap the <Share className="inline w-4 h-4 mx-1 text-theme-600 dark:text-theme-400" /> <strong>Share</strong> button below and select <br /><strong>Add to Home Screen</strong>.</>
                                ) : (
                                    <>Tap the browser menu <MoreVertical className="inline w-4 h-4 mx-0.5 text-theme-600 dark:text-theme-400" /> at the top right and select <strong>Install app</strong> or Add to Home Screen.</>
                                )}
                            </p>
                        </div>

                        <Button
                            className="w-full font-semibold bg-theme-600 hover:bg-theme-700 text-white shadow-md border-none"
                            onClick={() => { setShowFallback(false); setIsDismissed(true); }}
                        >
                            Got it!
                        </Button>
                    </div>
                </div>
            ) : (
                // Standard Sticky Banner
                <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 flex items-center gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center shadow-sm p-2">
                        <Image src="/icon-192x192.svg" alt="App Icon" width={28} height={28} className="w-full h-full object-contain" />
                    </div>

                    <div className="flex-1 min-w-0">
                        <h4 className="font-headline font-bold text-sm truncate text-slate-900 dark:text-white">Fund Her Future Web App</h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400 truncate">Fast, secure, offline-ready</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
                        <Button
                            onClick={handleInstallClick}
                            size="sm"
                            className="bg-theme-600 hover:bg-theme-700 text-white font-semibold px-4 rounded-xl shadow-md border-none"
                        >
                            <Download className="w-4 h-4 mr-1.5" />
                            Install
                        </Button>
                        <button
                            onClick={() => setIsDismissed(true)}
                            className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
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
