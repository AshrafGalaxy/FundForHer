'use client';

import { useState } from 'react';
import { Briefcase, Award, Star, BookOpen, BadgeCheck, Code, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DynamicListEditor } from '@/features/profile/DynamicListEditor';
import { TagInput } from '@/features/profile/TagInput';
import type { UserProfile, Internship, Fellowship, ScholarshipWon, Certification, Achievement, Publication } from '@/server/db/user-data';
import { v4 as uuid } from 'uuid';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── Internship Form ───────────────────────────────────────────────────────────
function InternshipForm({ item, onChange }: { item: Internship; onChange: (e: Internship) => void }) {
  const set = (k: keyof Internship, v: any) => onChange({ ...item, [k]: v });
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
      <div className="space-y-1.5 sm:col-span-2">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Company / Organisation</Label>
        <Input value={item.company} onChange={e => set('company', e.target.value)} placeholder="e.g. Google, DRDO" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Role / Position</Label>
        <Input value={item.role} onChange={e => set('role', e.target.value)} placeholder="e.g. Software Intern" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Type</Label>
        <Select value={item.type} onValueChange={v => set('type', v as any)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{['Remote','Onsite','Hybrid'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="flex gap-2">
        <div className="space-y-1.5 flex-1">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Start</Label>
          <div className="flex gap-1">
            <Select value={item.startMonth} onValueChange={v => set('startMonth', v)}><SelectTrigger className="w-[80px]"><SelectValue placeholder="Mon" /></SelectTrigger><SelectContent>{MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select>
            <Input value={item.startYear} onChange={e => set('startYear', e.target.value)} placeholder="YYYY" className="w-[80px]" maxLength={4} />
          </div>
        </div>
        <div className="space-y-1.5 flex-1">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">End</Label>
          <div className="flex gap-1">
            <Select value={item.endMonth} onValueChange={v => set('endMonth', v)}><SelectTrigger className="w-[80px]"><SelectValue placeholder="Mon" /></SelectTrigger><SelectContent>{MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select>
            <Input value={item.endYear} onChange={e => set('endYear', e.target.value)} placeholder="YYYY" className="w-[80px]" maxLength={4} />
          </div>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Stipend (₹/month)</Label>
        <Input type="number" value={item.stipend} onChange={e => set('stipend', e.target.value)} placeholder="e.g. 15000" />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Brief Description</Label>
        <Textarea value={item.description} onChange={e => set('description', e.target.value)} placeholder="What did you work on?" maxLength={150} rows={2} />
      </div>
    </div>
  );
}

// ── Fellowship Form ───────────────────────────────────────────────────────────
function FellowshipForm({ item, onChange }: { item: Fellowship; onChange: (e: Fellowship) => void }) {
  const set = (k: keyof Fellowship, v: any) => onChange({ ...item, [k]: v });
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
      <div className="space-y-1.5 sm:col-span-2"><Label className="text-xs text-muted-foreground uppercase tracking-wide">Fellowship Name</Label><Input value={item.name} onChange={e => set('name', e.target.value)} placeholder="e.g. DST-INSPIRE, ICMR-STS" /></div>
      <div className="space-y-1.5"><Label className="text-xs text-muted-foreground uppercase tracking-wide">Organisation</Label><Input value={item.organisation} onChange={e => set('organisation', e.target.value)} placeholder="e.g. DST, ICMR" /></div>
      <div className="space-y-1.5"><Label className="text-xs text-muted-foreground uppercase tracking-wide">Year</Label><Input value={item.year} onChange={e => set('year', e.target.value)} placeholder="e.g. 2023" maxLength={4} /></div>
      <div className="space-y-1.5"><Label className="text-xs text-muted-foreground uppercase tracking-wide">Duration</Label><Input value={item.duration} onChange={e => set('duration', e.target.value)} placeholder="e.g. 6 months" /></div>
      <div className="space-y-1.5"><Label className="text-xs text-muted-foreground uppercase tracking-wide">Amount (₹)</Label><Input type="number" value={item.amount} onChange={e => set('amount', e.target.value)} placeholder="e.g. 50000" /></div>
      <div className="space-y-1.5 sm:col-span-2"><Label className="text-xs text-muted-foreground uppercase tracking-wide">Description</Label><Textarea value={item.description} onChange={e => set('description', e.target.value)} placeholder="Brief description" maxLength={200} rows={2} /></div>
    </div>
  );
}

// ── ScholarshipWon Form ───────────────────────────────────────────────────────
function ScholarshipWonForm({ item, onChange }: { item: ScholarshipWon; onChange: (e: ScholarshipWon) => void }) {
  const set = (k: keyof ScholarshipWon, v: any) => onChange({ ...item, [k]: v });
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
      <div className="space-y-1.5 sm:col-span-2"><Label className="text-xs text-muted-foreground uppercase tracking-wide">Scholarship Name</Label><Input value={item.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Reliance Foundation Scholarship" /></div>
      <div className="space-y-1.5"><Label className="text-xs text-muted-foreground uppercase tracking-wide">Awarding Organisation</Label><Input value={item.organisation} onChange={e => set('organisation', e.target.value)} placeholder="e.g. Reliance Foundation" /></div>
      <div className="space-y-1.5"><Label className="text-xs text-muted-foreground uppercase tracking-wide">Year Awarded</Label><Input value={item.yearAwarded} onChange={e => set('yearAwarded', e.target.value)} placeholder="e.g. 2022" maxLength={4} /></div>
      <div className="space-y-1.5"><Label className="text-xs text-muted-foreground uppercase tracking-wide">Amount (₹)</Label><Input type="number" value={item.amount} onChange={e => set('amount', e.target.value)} placeholder="e.g. 100000" /></div>
      <div className="space-y-1.5"><Label className="text-xs text-muted-foreground uppercase tracking-wide">Level</Label>
        <Select value={item.level} onValueChange={v => set('level', v as any)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{['National','State','University','Private','International','Other'].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
        </Select>
      </div>
    </div>
  );
}

// ── Certification Form ────────────────────────────────────────────────────────
function CertificationForm({ item, onChange }: { item: Certification; onChange: (e: Certification) => void }) {
  const set = (k: keyof Certification, v: any) => onChange({ ...item, [k]: v });
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
      <div className="space-y-1.5 sm:col-span-2"><Label className="text-xs text-muted-foreground uppercase tracking-wide">Certification Name</Label><Input value={item.name} onChange={e => set('name', e.target.value)} placeholder="e.g. AWS Solutions Architect" /></div>
      <div className="space-y-1.5"><Label className="text-xs text-muted-foreground uppercase tracking-wide">Issuing Organisation</Label><Input value={item.issuingOrg} onChange={e => set('issuingOrg', e.target.value)} placeholder="e.g. Amazon, Coursera" /></div>
      <div className="space-y-1.5"><Label className="text-xs text-muted-foreground uppercase tracking-wide">Issue Date</Label><Input type="date" value={item.issueDate} onChange={e => set('issueDate', e.target.value)} /></div>
      <div className="space-y-1.5"><Label className="text-xs text-muted-foreground uppercase tracking-wide">Expiry Date (optional)</Label><Input type="date" value={item.expiryDate} onChange={e => set('expiryDate', e.target.value)} /></div>
      <div className="space-y-1.5"><Label className="text-xs text-muted-foreground uppercase tracking-wide">Credential ID</Label><Input value={item.credentialId} onChange={e => set('credentialId', e.target.value)} placeholder="e.g. ABC123" /></div>
      <div className="space-y-1.5 sm:col-span-2"><Label className="text-xs text-muted-foreground uppercase tracking-wide">Certificate URL (optional)</Label><Input value={item.certificateUrl} onChange={e => set('certificateUrl', e.target.value)} placeholder="https://..." /></div>
    </div>
  );
}

// ── Achievement Form ──────────────────────────────────────────────────────────
function AchievementForm({ item, onChange }: { item: Achievement; onChange: (e: Achievement) => void }) {
  const set = (k: keyof Achievement, v: any) => onChange({ ...item, [k]: v });
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
      <div className="space-y-1.5 sm:col-span-2"><Label className="text-xs text-muted-foreground uppercase tracking-wide">Activity / Achievement Name</Label><Input value={item.activityName} onChange={e => set('activityName', e.target.value)} placeholder="e.g. State Table Tennis Champion" /></div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Category</Label>
        <Select value={item.category} onValueChange={v => set('category', v as any)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{['Sports','Arts','Social Work','Tech','Academic','Other'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Level</Label>
        <Select value={item.level} onValueChange={v => set('level', v as any)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{['School','District','State','National','International'].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5"><Label className="text-xs text-muted-foreground uppercase tracking-wide">Year</Label><Input value={item.year} onChange={e => set('year', e.target.value)} placeholder="e.g. 2023" maxLength={4} /></div>
      <div className="space-y-1.5"><Label className="text-xs text-muted-foreground uppercase tracking-wide">Award / Position</Label><Input value={item.award} onChange={e => set('award', e.target.value)} placeholder="e.g. Gold Medal, 1st Place" /></div>
    </div>
  );
}

// ── Publication Form ──────────────────────────────────────────────────────────
function PublicationForm({ item, onChange }: { item: Publication; onChange: (e: Publication) => void }) {
  const set = (k: keyof Publication, v: any) => onChange({ ...item, [k]: v });
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
      <div className="space-y-1.5 sm:col-span-2"><Label className="text-xs text-muted-foreground uppercase tracking-wide">Title</Label><Input value={item.title} onChange={e => set('title', e.target.value)} placeholder="Paper / patent / book title" /></div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Type</Label>
        <Select value={item.type} onValueChange={v => set('type', v as any)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{['Paper','Patent','Book','Thesis','Other'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5"><Label className="text-xs text-muted-foreground uppercase tracking-wide">Journal / Conference</Label><Input value={item.journal} onChange={e => set('journal', e.target.value)} placeholder="e.g. IEEE, Nature" /></div>
      <div className="space-y-1.5"><Label className="text-xs text-muted-foreground uppercase tracking-wide">Year</Label><Input value={item.year} onChange={e => set('year', e.target.value)} placeholder="e.g. 2024" maxLength={4} /></div>
      <div className="space-y-1.5"><Label className="text-xs text-muted-foreground uppercase tracking-wide">DOI / URL</Label><Input value={item.doi} onChange={e => set('doi', e.target.value)} placeholder="https://doi.org/..." /></div>
    </div>
  );
}

// ── ExperienceTab ─────────────────────────────────────────────────────────────
interface ExperienceTabProps {
  profile: UserProfile;
  onBatchSave: (data: Partial<UserProfile>) => Promise<void>;
}

export function ExperienceTab({ profile, onBatchSave }: ExperienceTabProps) {
  const [internships, setInternships] = useState<Internship[]>(profile.internships ?? []);
  const [fellowships, setFellowships] = useState<Fellowship[]>(profile.fellowships ?? []);
  const [scholarshipsWon, setScholarshipsWon] = useState<ScholarshipWon[]>(profile.scholarshipsWon ?? []);
  const [certifications, setCertifications] = useState<Certification[]>(profile.certifications ?? []);
  const [achievements, setAchievements] = useState<Achievement[]>(profile.achievements ?? []);
  const [publications, setPublications] = useState<Publication[]>(profile.publications ?? []);
  const [techSkills, setTechSkills] = useState<string[]>(profile.technicalSkills ?? []);
  const [softSkills, setSoftSkills] = useState<string[]>(profile.softSkills ?? []);
  const [progLangs, setProgLangs] = useState<string[]>(profile.programmingLanguages ?? []);
  const [saving, setSaving] = useState(false);

  const e = <T extends { id: string }>(arr: T[], item: T) => arr.map(x => x.id === item.id ? item : x);
  const d = <T extends { id: string }>(arr: T[], id: string) => arr.filter(x => x.id !== id);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onBatchSave({
        internships, fellowships, scholarshipsWon, certifications,
        achievements, publications, technicalSkills: techSkills,
        softSkills, programmingLanguages: progLangs,
      });
    } finally { setSaving(false); }
  };

  const emptyInternship = (): Internship => ({ id: uuid(), company: '', role: '', startMonth: '', startYear: '', endMonth: '', endYear: '', type: 'Remote', stipend: '', description: '', certificateUrl: '' });
  const emptyFellowship = (): Fellowship => ({ id: uuid(), name: '', organisation: '', year: '', duration: '', amount: '', description: '' });
  const emptyScholarship = (): ScholarshipWon => ({ id: uuid(), name: '', organisation: '', yearAwarded: '', amount: '', level: 'National' });
  const emptyCert = (): Certification => ({ id: uuid(), name: '', issuingOrg: '', issueDate: '', expiryDate: '', credentialId: '', certificateUrl: '' });
  const emptyAchievement = (): Achievement => ({ id: uuid(), activityName: '', category: 'Academic', level: 'School', year: '', award: '' });
  const emptyPublication = (): Publication => ({ id: uuid(), title: '', type: 'Paper', journal: '', year: '', doi: '' });

  const inSummary = (i: Internship) => (<div><p className="text-sm font-semibold">{i.role || 'Intern'} {i.company && `@ ${i.company}`}</p><p className="text-xs text-muted-foreground">{i.type}{i.startYear && ` · ${i.startMonth} ${i.startYear} – ${i.endMonth} ${i.endYear}`}</p></div>);
  const feSummary = (f: Fellowship) => (<div><p className="text-sm font-semibold">{f.name}</p><p className="text-xs text-muted-foreground">{f.organisation}{f.year && ` · ${f.year}`}</p></div>);
  const swSummary = (s: ScholarshipWon) => (<div><p className="text-sm font-semibold">{s.name}</p><p className="text-xs text-muted-foreground">{s.organisation} · {s.yearAwarded} · {s.level}</p></div>);
  const ceSummary = (c: Certification) => (<div><p className="text-sm font-semibold">{c.name}</p><p className="text-xs text-muted-foreground">{c.issuingOrg}{c.issueDate && ` · ${c.issueDate}`}</p></div>);
  const acSummary = (a: Achievement) => (<div><p className="text-sm font-semibold">{a.activityName}</p><p className="text-xs text-muted-foreground">{a.category} · {a.level}{a.year && ` · ${a.year}`}</p></div>);
  const puSummary = (p: Publication) => (<div><p className="text-sm font-semibold truncate">{p.title}</p><p className="text-xs text-muted-foreground">{p.type} · {p.journal}{p.year && ` · ${p.year}`}</p></div>);

  const Section = ({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) => (
    <section className="border-t pt-6 first:border-t-0 first:pt-0">
      <div className="flex items-center gap-2 mb-4"><Icon className="h-5 w-5 text-theme-500" /><h3 className="text-base font-headline font-semibold">{title}</h3></div>
      {children}
    </section>
  );

  return (
    <div className="space-y-8">
      <Section icon={Briefcase} title="Internships">
        <DynamicListEditor<Internship> items={internships} onAdd={i => setInternships(p => [...p, i])} onEdit={i => setInternships(p => e(p, i))} onDelete={id => setInternships(p => d(p, id))} renderSummary={inSummary} renderForm={(_, oc) => <InternshipForm item={_ ?? emptyInternship()} onChange={oc} />} createEmpty={emptyInternship} title="Internship" addLabel="Add Internship" emptyMessage="No internships added yet." />
      </Section>
      <Section icon={Star} title="Fellowships">
        <DynamicListEditor<Fellowship> items={fellowships} onAdd={i => setFellowships(p => [...p, i])} onEdit={i => setFellowships(p => e(p, i))} onDelete={id => setFellowships(p => d(p, id))} renderSummary={feSummary} renderForm={(_, oc) => <FellowshipForm item={_ ?? emptyFellowship()} onChange={oc} />} createEmpty={emptyFellowship} title="Fellowship" addLabel="Add Fellowship" emptyMessage="No fellowships added yet." />
      </Section>
      <Section icon={Award} title="Previous Scholarships Won">
        <DynamicListEditor<ScholarshipWon> items={scholarshipsWon} onAdd={i => setScholarshipsWon(p => [...p, i])} onEdit={i => setScholarshipsWon(p => e(p, i))} onDelete={id => setScholarshipsWon(p => d(p, id))} renderSummary={swSummary} renderForm={(_, oc) => <ScholarshipWonForm item={_ ?? emptyScholarship()} onChange={oc} />} createEmpty={emptyScholarship} title="Scholarship" addLabel="Add Scholarship Won" emptyMessage="No scholarships won yet." />
      </Section>
      <Section icon={BadgeCheck} title="Certifications">
        <DynamicListEditor<Certification> items={certifications} onAdd={i => setCertifications(p => [...p, i])} onEdit={i => setCertifications(p => e(p, i))} onDelete={id => setCertifications(p => d(p, id))} renderSummary={ceSummary} renderForm={(_, oc) => <CertificationForm item={_ ?? emptyCert()} onChange={oc} />} createEmpty={emptyCert} title="Certification" addLabel="Add Certification" emptyMessage="No certifications added yet." />
      </Section>
      <Section icon={Star} title="Achievements & Extra-curriculars">
        <DynamicListEditor<Achievement> items={achievements} onAdd={i => setAchievements(p => [...p, i])} onEdit={i => setAchievements(p => e(p, i))} onDelete={id => setAchievements(p => d(p, id))} renderSummary={acSummary} renderForm={(_, oc) => <AchievementForm item={_ ?? emptyAchievement()} onChange={oc} />} createEmpty={emptyAchievement} title="Achievement" addLabel="Add Achievement" emptyMessage="No achievements added yet." />
      </Section>
      <Section icon={BookOpen} title="Research & Publications">
        <DynamicListEditor<Publication> items={publications} onAdd={i => setPublications(p => [...p, i])} onEdit={i => setPublications(p => e(p, i))} onDelete={id => setPublications(p => d(p, id))} renderSummary={puSummary} renderForm={(_, oc) => <PublicationForm item={_ ?? emptyPublication()} onChange={oc} />} createEmpty={emptyPublication} title="Publication" addLabel="Add Publication / Research" emptyMessage="No publications added yet." />
      </Section>

      <section className="border-t pt-6">
        <div className="flex items-center gap-2 mb-4"><Code className="h-5 w-5 text-theme-500" /><h3 className="text-base font-headline font-semibold">Skills</h3></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Technical Skills</Label>
            <TagInput value={techSkills} onChange={setTechSkills} placeholder="e.g. Machine Learning" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Soft Skills</Label>
            <TagInput value={softSkills} onChange={setSoftSkills} placeholder="e.g. Leadership" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Programming Languages</Label>
            <TagInput value={progLangs} onChange={setProgLangs} placeholder="e.g. Python, Java" />
          </div>
        </div>
      </section>

      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={saving} className="gap-2 bg-theme-600 hover:bg-theme-700 text-white min-w-[160px]">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving...' : 'Save All Experience'}
        </Button>
      </div>
    </div>
  );
}
