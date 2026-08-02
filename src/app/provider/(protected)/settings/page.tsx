'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Bell, Moon, Globe, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function ProviderSettingsPage() {
  const { toast } = useToast();
  const [emailNotifs, setEmailNotifs]   = useState(true);
  const [newApplicant, setNewApplicant] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);

  const handleSave = () => {
    toast({ title: 'Settings saved', description: 'Your notification preferences have been updated.' });
  };

  return (
    <div className="container max-w-2xl mx-auto px-4 py-8 space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-headline font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">Manage notifications and account preferences.</p>
      </div>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-lg flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" /> Notifications
          </CardTitle>
          <CardDescription>Control how Fund Her Future contacts you.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { id: 'email-notifs',  label: 'Email notifications',       desc: 'Receive emails for important account activity', value: emailNotifs,   set: setEmailNotifs   },
            { id: 'new-applicant', label: 'New applicant alerts',       desc: 'Get notified immediately when someone applies',  value: newApplicant,  set: setNewApplicant  },
            { id: 'weekly-digest', label: 'Weekly performance digest',  desc: 'Summary of applicants and KPIs every Monday',   value: weeklyDigest,  set: setWeeklyDigest  },
          ].map(({ id, label, desc, value, set }) => (
            <div key={id} className="flex items-center justify-between py-2">
              <div>
                <Label htmlFor={id} className="text-sm font-medium">{label}</Label>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </div>
              <Switch id={id} checked={value} onCheckedChange={set} />
            </div>
          ))}
          <Separator />
          <Button onClick={handleSave} className="w-full">Save Preferences</Button>
        </CardContent>
      </Card>

      {/* Quick links */}
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-lg flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" /> Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="outline" className="w-full justify-start gap-2" asChild>
            <Link href="/provider/profile">
              <Globe className="w-4 h-4" /> Edit Profile & Branding
            </Link>
          </Button>
          <p className="text-xs text-muted-foreground px-1 pt-2">
            To delete your account, go to{' '}
            <Link href="/provider/profile" className="text-destructive underline">Profile &rarr; Danger Zone</Link>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
