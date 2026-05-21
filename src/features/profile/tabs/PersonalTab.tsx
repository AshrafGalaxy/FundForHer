'use client';

import { useState } from 'react';
import { User, Phone, Mail, Cake, MapPin, IndianRupee, Globe, Link2, BookOpen, Heart, Users } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save } from 'lucide-react';
import { TagInput } from '@/features/profile/TagInput';
import { EditableInfoField } from '@/features/profile/EditableInfoField';
import type { UserProfile } from '@/server/db/user-data';

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana',
  'Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur',
  'Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana',
  'Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
  'Andaman & Nicobar Islands','Chandigarh','D&N Haveli and D&D','Delhi','Jammu & Kashmir','Ladakh','Lakshadweep','Puducherry',
];

interface PersonalTabProps {
  profile: UserProfile;
  onSave: (key: string, value: any) => Promise<void>;
  onBatchSave: (data: Partial<UserProfile>) => Promise<void>;
}

export function PersonalTab({ profile, onSave, onBatchSave }: PersonalTabProps) {
  const [saving, setSaving] = useState(false);
  const [batch, setBatch] = useState<Partial<UserProfile>>({
    gender: profile.gender ?? undefined,
    religion: profile.religion ?? undefined,
    category: profile.category ?? undefined,
    nationality: profile.nationality ?? 'Indian',
    stateOfDomicile: profile.stateOfDomicile ?? undefined,
    city: profile.city ?? undefined,
    whatsapp: profile.whatsapp ?? undefined,
    linkedinUrl: profile.linkedinUrl ?? undefined,
    annualFamilyIncome: profile.annualFamilyIncome ?? undefined,
    rationCardType: profile.rationCardType ?? undefined,
    fatherOccupation: profile.fatherOccupation ?? undefined,
    motherOccupation: profile.motherOccupation ?? undefined,
    languages: profile.languages ?? [],
  });

  const set = (key: keyof typeof batch, val: any) => setBatch(prev => ({ ...prev, [key]: val }));

  const handleSaveBatch = async () => {
    setSaving(true);
    try { await onBatchSave(batch); } finally { setSaving(false); }
  };

  const incomeLabel = (v?: number | null) => {
    if (!v) return '';
    if (v < 100000) return '< ₹1 Lakh';
    if (v < 250000) return '₹1–2.5 Lakh';
    if (v < 500000) return '₹2.5–5 Lakh';
    if (v < 800000) return '₹5–8 Lakh';
    return '> ₹8 Lakh';
  };

  return (
    <div className="space-y-8">
      {/* Core Identity */}
      <section>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
          <User className="h-4 w-4" /> Core Identity
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <EditableInfoField icon={<User />} label="Full Name" value={profile.fullName} placeholder="Your full name" fieldKey="fullName" onSave={onSave} />
          <EditableInfoField icon={<Mail />} label="Email" value={profile.email} placeholder="—" fieldKey="email" onSave={onSave} disabled />
          <EditableInfoField icon={<Phone />} label="Phone Number" value={profile.phone} placeholder="e.g. 9876543210" fieldKey="phone" onSave={onSave} />
          <EditableInfoField icon={<Phone />} label="WhatsApp Number" value={profile.whatsapp} placeholder="Same as phone?" fieldKey="whatsapp" onSave={onSave} />
          <EditableInfoField icon={<Cake />} label="Date of Birth" value={profile.dob as any} placeholder="YYYY-MM-DD" fieldKey="dob" type="date" onSave={onSave} />
          <EditableInfoField icon={<MapPin />} label="Full Address" value={profile.address} placeholder="Street, city, state, PIN" fieldKey="address" onSave={onSave} />
          <EditableInfoField icon={<Link2 />} label="LinkedIn URL" value={profile.linkedinUrl} placeholder="https://linkedin.com/in/..." fieldKey="linkedinUrl" onSave={onSave} />
        </div>
      </section>

      {/* Demographics */}
      <section className="border-t pt-6">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
          <Users className="h-4 w-4" /> Demographics & Eligibility
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Gender</Label>
            <Select value={batch.gender ?? ''} onValueChange={v => set('gender', v as any)}>
              <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
              <SelectContent>
                {['Female','Male','Non-binary','Prefer not to say'].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Category</Label>
            <Select value={batch.category ?? ''} onValueChange={v => set('category', v as any)}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {['General','OBC','SC','ST','EWS','PwD'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Religion</Label>
            <Select value={batch.religion ?? ''} onValueChange={v => set('religion', v)}>
              <SelectTrigger><SelectValue placeholder="Select religion" /></SelectTrigger>
              <SelectContent>
                {['Hindu','Muslim','Christian','Sikh','Buddhist','Jain','Parsi','Other','Prefer not to say'].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">State of Domicile</Label>
            <Select value={batch.stateOfDomicile ?? ''} onValueChange={v => set('stateOfDomicile', v)}>
              <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
              <SelectContent className="max-h-60">
                {INDIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">City / District</Label>
            <Input value={batch.city ?? ''} onChange={e => set('city', e.target.value)} placeholder="e.g. Mumbai" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Nationality</Label>
            <Input value={batch.nationality ?? 'Indian'} onChange={e => set('nationality', e.target.value)} placeholder="Indian" />
          </div>
        </div>
      </section>

      {/* Financial */}
      <section className="border-t pt-6">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
          <IndianRupee className="h-4 w-4" /> Financial Background
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Annual Family Income (₹)</Label>
            <div className="flex gap-3 items-center">
              <Input
                type="number"
                value={batch.annualFamilyIncome ?? ''}
                onChange={e => set('annualFamilyIncome', e.target.value ? Number(e.target.value) : null)}
                placeholder="e.g. 350000"
                className="max-w-[200px]"
              />
              {batch.annualFamilyIncome && (
                <span className="text-sm font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
                  {incomeLabel(batch.annualFamilyIncome)}
                </span>
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Ration Card Type</Label>
            <Select value={batch.rationCardType ?? ''} onValueChange={v => set('rationCardType', v as any)}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                {['APL','BPL','AAY','None'].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Father's Occupation</Label>
            <Input value={batch.fatherOccupation ?? ''} onChange={e => set('fatherOccupation', e.target.value)} placeholder="e.g. Farmer, Teacher" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Mother's Occupation</Label>
            <Input value={batch.motherOccupation ?? ''} onChange={e => set('motherOccupation', e.target.value)} placeholder="e.g. Homemaker, Nurse" />
          </div>
        </div>
      </section>

      {/* Languages */}
      <section className="border-t pt-6">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
          <Globe className="h-4 w-4" /> Languages Known
        </h3>
        <TagInput
          value={batch.languages ?? []}
          onChange={v => set('languages', v)}
          placeholder="Type a language and press Enter..."
        />
      </section>

      <div className="flex justify-end pt-2">
        <Button onClick={handleSaveBatch} disabled={saving} className="gap-2 bg-theme-600 hover:bg-theme-700 text-white min-w-[140px]">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving...' : 'Save Section'}
        </Button>
      </div>
    </div>
  );
}
