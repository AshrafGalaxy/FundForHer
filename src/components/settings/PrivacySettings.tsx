'use client';

import { useState } from 'react';
import { Shield, Globe, Lock, Eye, EyeOff, Loader2, Save, Info } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { PublicFieldKey } from '@/server/db/user-data';
import { DEFAULT_PUBLIC_FIELDS } from '@/server/db/user-data';
import { useToast } from '@/hooks/use-toast';

interface PrivacyField {
  key: PublicFieldKey;
  label: string;
  description: string;
  icon: string;
  recommended: boolean;
}

const PRIVACY_FIELDS: PrivacyField[] = [
  { key: 'education',       label: 'Education History',          description: 'College, degree, field of study, CGPA, graduation year', icon: '🎓', recommended: true },
  { key: 'location',        label: 'Location',                   description: 'State and city only — your full address is always private', icon: '📍', recommended: true },
  { key: 'skills',          label: 'Skills',                     description: 'Technical skills, soft skills, and programming languages', icon: '⚡', recommended: true },
  { key: 'certifications',  label: 'Certifications',             description: 'Your certification list (credential IDs stay hidden)', icon: '🏅', recommended: true },
  { key: 'achievements',    label: 'Achievements',               description: 'Awards, extracurricular activities, competition results', icon: '🏆', recommended: true },
  { key: 'category',        label: 'Category (Caste/EWS/PwD)',   description: 'Your reservation category e.g. OBC, SC, EWS', icon: '🪪', recommended: false },
  { key: 'languages',       label: 'Languages Known',            description: 'Languages you speak or understand', icon: '🌐', recommended: false },
  { key: 'internships',     label: 'Internships & Experience',   description: 'Companies, roles, and durations (stipend stays hidden)', icon: '💼', recommended: false },
  { key: 'fellowships',     label: 'Fellowships',                description: 'Fellowship name and organisation (amounts stay hidden)', icon: '🌟', recommended: false },
  { key: 'scholarshipsWon', label: 'Scholarships Won',           description: 'Previous scholarships you have received (amounts optional)', icon: '🎖️', recommended: false },
  { key: 'publications',    label: 'Research & Publications',    description: 'Papers, patents, books, and thesis links', icon: '📄', recommended: false },
];

const ALWAYS_PRIVATE = [
  { label: 'Phone & WhatsApp',     icon: '📱' },
  { label: 'Email address',        icon: '✉️' },
  { label: 'Full address',         icon: '🏠' },
  { label: 'Aadhar / PAN',        icon: '🔒' },
  { label: 'Annual family income', icon: '💰' },
  { label: 'Bank documents',       icon: '🏦' },
  { label: 'Exam scores (JEE/NEET/GRE etc.)', icon: '📊' },
  { label: 'Document vault files', icon: '📁' },
];

interface PrivacySettingsProps {
  isProfilePublic: boolean;
  publicFields: PublicFieldKey[];
  username?: string | null;
  onSave: (data: { isProfilePublic: boolean; publicFields: PublicFieldKey[] }) => Promise<void>;
}

export function PrivacySettings({ isProfilePublic, publicFields, username, onSave }: PrivacySettingsProps) {
  const [isPublic, setIsPublic] = useState(isProfilePublic);
  const [fields, setFields] = useState<PublicFieldKey[]>(publicFields.length ? publicFields : DEFAULT_PUBLIC_FIELDS);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const toggleField = (key: PublicFieldKey) => {
    setFields(prev => prev.includes(key) ? prev.filter(f => f !== key) : [...prev, key]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ isProfilePublic: isPublic, publicFields: fields });
      toast({ title: 'Privacy settings saved ✓' });
    } finally {
      setSaving(false);
    }
  };

  const profileUrl = username
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/u/${username}`
    : null;

  return (
    <div className="space-y-8">
      {/* Profile Visibility toggle */}
      <div className="flex items-start justify-between gap-6 p-5 rounded-xl border bg-card">
        <div className="flex items-start gap-4">
          <div className={cn('p-3 rounded-xl shrink-0', isPublic ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : 'bg-secondary text-muted-foreground')}>
            {isPublic ? <Globe className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
          </div>
          <div>
            <p className="font-semibold text-foreground">
              {isPublic ? 'Public Profile' : 'Private Profile'}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5 max-w-md">
              {isPublic
                ? 'Anyone with your profile link can view the sections you choose below. Your profile is discoverable in the community.'
                : 'Only you can see your full profile. In the community, others only see your display name and avatar.'}
            </p>
            {isPublic && profileUrl && (
              <div className="mt-2 flex items-center gap-2">
                <code className="text-xs bg-secondary px-2 py-1 rounded font-mono text-primary">{profileUrl}</code>
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => { navigator.clipboard.writeText(profileUrl); toast({ title: 'Link copied!' }); }}>
                  Copy
                </Button>
              </div>
            )}
            {isPublic && !username && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
                <Info className="h-3 w-3" /> Set a username in your profile to get a shareable link.
              </p>
            )}
          </div>
        </div>
        <Switch checked={isPublic} onCheckedChange={setIsPublic} className="mt-1 shrink-0" />
      </div>

      {/* Granular field controls */}
      {isPublic && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">What visitors can see</h3>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setFields(PRIVACY_FIELDS.map(f => f.key))}>Show all</Button>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setFields(DEFAULT_PUBLIC_FIELDS)}>Reset to recommended</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {PRIVACY_FIELDS.map(field => {
              const enabled = fields.includes(field.key);
              return (
                <div
                  key={field.key}
                  onClick={() => toggleField(field.key)}
                  className={cn(
                    'flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all select-none',
                    enabled ? 'border-primary/40 bg-primary/5' : 'border-border hover:border-primary/20 bg-card opacity-60 hover:opacity-80',
                  )}
                >
                  <span className="text-xl shrink-0">{field.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{field.label}</p>
                      {field.recommended && <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-emerald-600 border-emerald-400">Recommended</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{field.description}</p>
                  </div>
                  <div className={cn('shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors', enabled ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground')}>
                    {enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Always private section */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Lock className="h-3.5 w-3.5" /> Always Private — Never Shown Publicly
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ALWAYS_PRIVATE.map(item => (
            <div key={item.label} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-secondary/50 border border-border/50">
              <span className="text-sm">{item.icon}</span>
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <Lock className="h-3 w-3 ml-auto text-muted-foreground/50 shrink-0" />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={saving} className="gap-2 bg-theme-600 hover:bg-theme-700 text-white min-w-[160px]">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving...' : 'Save Privacy Settings'}
        </Button>
      </div>
    </div>
  );
}
