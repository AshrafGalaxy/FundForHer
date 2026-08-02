'use client';

import { useState } from 'react';
import { AtSign, Check, X, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const USERNAME_REGEX = /^[a-z0-9_.-]{3,30}$/;

interface UsernameFieldProps {
  currentUsername?: string | null;
  userId: string;
  onSave: (username: string) => Promise<void>;
}

export function UsernameField({ currentUsername, userId, onSave }: UsernameFieldProps) {
  const db = useFirestore();
  const { toast } = useToast();
  const [value, setValue] = useState(currentUsername ?? '');
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'available' | 'taken' | 'invalid'>('idle');

  const validate = (v: string) => USERNAME_REGEX.test(v);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, '');
    setValue(raw);
    setStatus('idle');
  };

  const checkAvailability = async () => {
    if (!db || !value) return;
    if (!validate(value)) { setStatus('invalid'); return; }
    if (value === currentUsername) { setStatus('available'); return; }

    setChecking(true);
    try {
      const q = query(collection(db, 'users'), where('username', '==', value));
      const snap = await getDocs(q);
      const takenByOther = snap.docs.some(d => d.id !== userId);
      setStatus(takenByOther ? 'taken' : 'available');
    } catch {
      toast({ variant: 'destructive', title: 'Check failed', description: 'Could not verify username availability.' });
    } finally {
      setChecking(false);
    }
  };

  const handleSave = async () => {
    if (status !== 'available') return;
    setSaving(true);
    try {
      await onSave(value);
      toast({ title: '✓ Username saved', description: `Your handle is now @${value}` });
    } finally {
      setSaving(false); }
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Username / Handle</Label>
      <p className="text-xs text-muted-foreground">3–30 characters. Lowercase letters, numbers, underscores, dots, hyphens only. Used for your public profile link: <code className="bg-secondary px-1 py-0.5 rounded text-primary">/u/your-username</code></p>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={value}
            onChange={handleChange}
            onBlur={checkAvailability}
            placeholder="e.g. priya_sharma"
            className={cn('pl-9', status === 'available' && 'border-emerald-400', status === 'taken' && 'border-red-400', status === 'invalid' && 'border-amber-400')}
            maxLength={30}
          />
          {status === 'available' && <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />}
          {status === 'taken'     && <AlertCircle   className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />}
          {checking               && <Loader2        className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        <Button variant="outline" size="sm" className="h-10 px-3" onClick={checkAvailability} disabled={!value || checking}>
          Check
        </Button>
        <Button size="sm" className="h-10 px-4 bg-theme-600 hover:bg-theme-700 text-white" onClick={handleSave} disabled={status !== 'available' || saving || !value}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        </Button>
      </div>
      {status === 'available' && value !== currentUsername && <p className="text-xs text-emerald-600 dark:text-emerald-400">✓ @{value} is available!</p>}
      {status === 'taken'     && <p className="text-xs text-red-600 dark:text-red-400">✗ @{value} is already taken. Try another.</p>}
      {status === 'invalid'   && <p className="text-xs text-amber-600 dark:text-amber-400">✗ Invalid format. Use 3–30 chars: a-z, 0-9, _ . -</p>}
      {currentUsername && <p className="text-xs text-muted-foreground">Current: <span className="font-mono text-primary">@{currentUsername}</span></p>}
    </div>
  );
}
