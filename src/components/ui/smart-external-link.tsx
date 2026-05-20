'use client';

import React, { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger, 
  DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

interface SmartExternalLinkProps {
  url: string;
  children: React.ReactNode;
  fallbackTitle?: string;
}

export function SmartExternalLink({ url, children, fallbackTitle = "External Portal" }: SmartExternalLinkProps) {
  const [open, setOpen] = useState(false);

  const handleNativeClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url, presentationStyle: 'popover' });
    } catch (error) {
      console.error("Failed to open capacitor browser:", error);
      // Fallback if plugin fails
      window.open(url, '_blank');
    }
  };

  // If we are in a native app (Capacitor Android/iOS)
  if (Capacitor.isNativePlatform()) {
    return (
      <div onClick={handleNativeClick} className="inline-block cursor-pointer">
        {children}
      </div>
    );
  }

  // If we are on the web, use the shadcn/ui Dialog iframe wrapper
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[80vw] h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 border-b shrink-0 flex flex-row items-center justify-between">
          <div>
            <DialogTitle>{fallbackTitle}</DialogTitle>
            <DialogDescription className="sr-only">
              External scholarship application portal
            </DialogDescription>
          </div>
        </DialogHeader>
        
        {/* Security fallback banner for X-Frame-Options: DENY */}
        <div className="bg-muted p-2 flex flex-col sm:flex-row items-center justify-center gap-2 text-sm text-center shrink-0 border-b">
          <span>Portal refused to connect securely or showing a blank page?</span>
          <Button variant="outline" size="sm" onClick={() => window.open(url, '_blank')}>
            Open in new tab <ExternalLink className="ml-2 h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 w-full relative overflow-hidden bg-background">
          <iframe 
            src={url}
            className="w-full h-full border-0 absolute inset-0"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
            title={fallbackTitle}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
