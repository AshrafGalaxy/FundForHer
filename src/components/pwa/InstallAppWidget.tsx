'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Monitor, Phone, Info, X, Share } from 'lucide-react';

// Platform types
type OS = 'windows' | 'android' | 'ios' | 'macos' | 'unknown';

export const InstallAppWidget = () => {
    const [os, setOs] = useState<OS>('unknown');
    const [isInstalled, setIsInstalled] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showIOSModal, setShowIOSModal] = useState(false);

    useEffect(() => {
        // 1. Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
            setIsInstalled(true);
            return;
        }

        // 2. Detect OS based on userAgent
        const userAgent = window.navigator.userAgent.toLowerCase();
        if (/windows/.test(userAgent)) {
            setOs('windows');
        } else if (/android/.test(userAgent)) {
            setOs('android');
        } else if (/iphone|ipad|ipod/.test(userAgent)) {
            setOs('ios');
        } else if (/macintosh|mac os x/.test(userAgent)) {
            setOs('macos');
        } else {
            setOs('unknown');
        }

        // 3. Listen for the native install prompt event (Windows/Android)
        const handleBeforeInstallPrompt = (e: Event) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Track successful installations
        const handleAppInstalled = () => {
            setIsInstalled(true);
            setDeferredPrompt(null);
        };
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    // Click handler for Windows/Android
    const handleInstallClick = async () => {
        if (os === 'ios' || os === 'macos') {
            setShowIOSModal(true);
            return;
        }

        if (!deferredPrompt) {
            // Browsers might not fire beforeinstallprompt if conditions aren't met
            // Fallback: show instructions if prompt is missing
            setShowIOSModal(true);
            return;
        }

        // Show the install prompt
        deferredPrompt.prompt();
        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        // We've used the prompt, and can't use it again, throw it away
        setDeferredPrompt(null);
    };

    // If already installed, don't render widget
    if (isInstalled) {
        return null;
    }

    // Determine button copy and icon
    const getButtonConfig = () => {
        switch (os) {
            case 'windows':
                return { text: 'Install for Windows', icon: <Monitor className="w-5 h-5 mr-2" /> };
            case 'android':
                return { text: 'Install for Android', icon: <Phone className="w-5 h-5 mr-2" /> };
            case 'ios':
                return { text: 'Install for iOS', icon: <Phone className="w-5 h-5 mr-2" /> };
            case 'macos':
                return { text: 'Install for macOS', icon: <Monitor className="w-5 h-5 mr-2" /> };
            default:
                return { text: 'Add to Home Screen', icon: <Monitor className="w-5 h-5 mr-2" /> };
        }
    };

    const config = getButtonConfig();

    return (
        <div className="w-full flex justify-center my-6">
            <div className="relative">
                <Button
                    onClick={handleInstallClick}
                    size="lg"
                    className="font-semibold text-theme-950 dark:text-theme-100 bg-theme-200 hover:bg-theme-300 dark:bg-theme-800 dark:hover:bg-theme-700 shadow-md transition-all duration-300 transform hover:scale-105"
                >
                    {config.icon}
                    {config.text}
                </Button>

                {/* Fallback / iOS Instruction Modal */}
                {showIOSModal && (
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-4 w-72 bg-card border border-border rounded-xl shadow-2xl z-50 p-4 animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="flex justify-between items-start mb-2">
                            <h4 className="font-headline font-semibold text-card-foreground flex items-center">
                                <Info className="w-4 h-4 mr-2 text-theme-600 dark:text-theme-400" />
                                Install App
                            </h4>
                            <button onClick={() => setShowIOSModal(false)} className="text-muted-foreground hover:text-foreground">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="text-sm text-muted-foreground space-y-3 mt-3">
                            {(os === 'ios' || os === 'macos') ? (
                                <>
                                    <p>To install <strong>Fund Her Future</strong> on your Apple device:</p>
                                    <ol className="list-decimal pl-5 space-y-2">
                                        <li>Tap the <strong>Share</strong> button <Share className="inline w-4 h-4 mx-1" /> at the {os === 'ios' ? 'bottom' : 'top'} of Safari.</li>
                                        <li>Scroll down and select <strong>Add to Home Screen</strong>.</li>
                                    </ol>
                                </>
                            ) : (
                                <p>
                                    Automatic installation is currently unavailable in this browser. To install the app, look for the "Install" or "Add to Home Screen" option in your browser menu.
                                </p>
                            )}
                        </div>

                        <Button
                            size="sm"
                            variant="outline"
                            className="w-full mt-4"
                            onClick={() => setShowIOSModal(false)}
                        >
                            Got it
                        </Button>

                        {/* Arrow pointer matching standard tooltip design */}
                        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-card border-t border-l border-border rotate-45" />
                    </div>
                )}
            </div>
        </div>
    );
};

export default InstallAppWidget;
