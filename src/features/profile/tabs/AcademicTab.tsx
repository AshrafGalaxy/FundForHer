'use client';

import { useState } from 'react';
import { GraduationCap, FlaskConical, Plus, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { DynamicListEditor } from '@/features/profile/DynamicListEditor';
import type { UserProfile, EducationEntry, TestScore } from '@/server/db/user-data';
import { v4 as uuid } from 'uuid';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

// ── Education Entry Form ──────────────────────────────────────────────────────
function EducationForm({ item, onChange }: { item: EducationEntry; onChange: (e: EducationEntry) => void }) {
  const set = (k: keyof EducationEntry, v: any) => onChange({ ...item, [k]: v });
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Degree Level *</Label>
        <Select value={item.degreeLevel} onValueChange={v => set('degreeLevel', v as any)}>
          <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
          <SelectContent>
            {['Class 10','Class 12','Diploma','UG','PG','PhD','Integrated','Dual Degree','Certificate','Other'].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Degree Name *</Label>
        <Input value={item.degreeName} onChange={e => set('degreeName', e.target.value)} placeholder="e.g. B.Tech, MBBS, B.Com" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Specialisation / Major</Label>
        <Input value={item.specialisation} onChange={e => set('specialisation', e.target.value)} placeholder="e.g. Computer Science" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Institution Name *</Label>
        <Input value={item.institution} onChange={e => set('institution', e.target.value)} placeholder="e.g. IIT Delhi" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">University / Board</Label>
        <Input value={item.university} onChange={e => set('university', e.target.value)} placeholder="e.g. CBSE, Anna University" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">City, State</Label>
        <Input value={item.locationCity} onChange={e => set('locationCity', e.target.value)} placeholder="e.g. Pune, Maharashtra" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Start Year</Label>
        <Input value={item.startYear} onChange={e => set('startYear', e.target.value)} placeholder="e.g. 2020" maxLength={4} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">End / Expected Year</Label>
        <Input value={item.endYear} onChange={e => set('endYear', e.target.value)} placeholder="e.g. 2024" maxLength={4} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Status</Label>
        <Select value={item.status} onValueChange={v => set('status', v as any)}>
          <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
          <SelectContent>
            {['Completed','Ongoing','Dropped'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Score Type</Label>
        <Select value={item.scoreType} onValueChange={v => set('scoreType', v as any)}>
          <SelectTrigger><SelectValue placeholder="CGPA / %" /></SelectTrigger>
          <SelectContent>
            {['CGPA','Percentage','GPA','Grade'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Score / Marks</Label>
        <Input value={item.score} onChange={e => set('score', e.target.value)} placeholder="e.g. 8.7 or 85.4" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Out Of</Label>
        <Input value={item.scoreOutOf} onChange={e => set('scoreOutOf', e.target.value)} placeholder="e.g. 10 or 100" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Backlogs / Arrears</Label>
        <Input type="number" min={0} value={item.backlogs} onChange={e => set('backlogs', Number(e.target.value))} placeholder="0" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Medium of Instruction</Label>
        <Select value={item.mediumOfInstruction} onValueChange={v => set('mediumOfInstruction', v as any)}>
          <SelectTrigger><SelectValue placeholder="Select medium" /></SelectTrigger>
          <SelectContent>
            {['English','Hindi','Regional','Other'].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="sm:col-span-2 flex items-center gap-3 pt-1">
        <Switch checked={item.scholarshipDuringDegree} onCheckedChange={v => set('scholarshipDuringDegree', v)} />
        <Label className="cursor-pointer text-sm">Received scholarship during this degree</Label>
        {item.scholarshipDuringDegree && (
          <Input value={item.scholarshipName} onChange={e => set('scholarshipName', e.target.value)} placeholder="Scholarship name" className="ml-2 max-w-[220px] h-8" />
        )}
      </div>
    </div>
  );
}

// ── Test Score Form ───────────────────────────────────────────────────────────
function TestScoreForm({ item, onChange }: { item: TestScore; onChange: (e: TestScore) => void }) {
  const set = (k: keyof TestScore, v: any) => onChange({ ...item, [k]: v });
  const COMMON_EXAMS = ['JEE Main','JEE Advanced','NEET','GATE','CAT','XAT','MAT','CMAT','GMAT','GRE','IELTS','TOEFL','PTE','SAT','UPSC','CLAT','Custom'];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Exam Name</Label>
        <Select value={COMMON_EXAMS.includes(item.examName) ? item.examName : 'Custom'} onValueChange={v => set('examName', v === 'Custom' ? '' : v)}>
          <SelectTrigger><SelectValue placeholder="Select exam" /></SelectTrigger>
          <SelectContent>{COMMON_EXAMS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
        </Select>
        {(!COMMON_EXAMS.includes(item.examName) || item.examName === '') && (
          <Input value={item.examName} onChange={e => set('examName', e.target.value)} placeholder="Enter exam name" className="mt-1" />
        )}
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Year</Label>
        <Input value={item.year} onChange={e => set('year', e.target.value)} placeholder="e.g. 2023" maxLength={4} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Score</Label>
        <Input value={item.score} onChange={e => set('score', e.target.value)} placeholder="e.g. 720" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Rank (if applicable)</Label>
        <Input value={item.rank} onChange={e => set('rank', e.target.value)} placeholder="e.g. 1234 AIR" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Percentile (if applicable)</Label>
        <Input value={item.percentile} onChange={e => set('percentile', e.target.value)} placeholder="e.g. 99.2" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Additional Info</Label>
        <Input value={item.additionalInfo} onChange={e => set('additionalInfo', e.target.value)} placeholder="e.g. Stream: CS (GATE), AWA 5.0 (GRE)" />
      </div>
    </div>
  );
}

// ── AcademicTab ───────────────────────────────────────────────────────────────
interface AcademicTabProps {
  profile: UserProfile;
  onBatchSave: (data: Partial<UserProfile>) => Promise<void>;
}

export function AcademicTab({ profile, onBatchSave }: AcademicTabProps) {
  const [entries, setEntries] = useState<EducationEntry[]>(profile.educationEntries ?? []);
  const [testScores, setTestScores] = useState<TestScore[]>(profile.testScores ?? []);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try { await onBatchSave({ educationEntries: entries, testScores }); } finally { setSaving(false); }
  };

  const emptyEntry = (): EducationEntry => ({
    id: uuid(), degreeLevel: 'UG', degreeName: '', specialisation: '', institution: '',
    university: '', locationCity: '', startYear: '', endYear: '', status: 'Ongoing',
    scoreType: 'CGPA', score: '', scoreOutOf: '10', division: '', backlogs: 0,
    mediumOfInstruction: 'English', scholarshipDuringDegree: false, scholarshipName: '',
  });

  const emptyScore = (): TestScore => ({ id: uuid(), examName: '', score: '', rank: '', percentile: '', year: '', additionalInfo: '' });

  const summaryEntry = (e: EducationEntry) => (
    <div className="flex items-center gap-3 min-w-0">
      <div>
        <p className="text-sm font-semibold text-foreground leading-tight">
          {e.degreeLevel} {e.degreeName && `— ${e.degreeName}`}
          {e.specialisation && ` (${e.specialisation})`}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {e.institution}{e.endYear && ` · ${e.status === 'Ongoing' ? 'Expected' : ''} ${e.endYear}`}
          {e.score && ` · ${e.score}${e.scoreType === 'Percentage' ? '%' : ` ${e.scoreType}`}`}
        </p>
      </div>
      <Badge variant={e.status === 'Completed' ? 'default' : 'secondary'} className={`ml-auto shrink-0 text-[10px] ${e.status === 'Completed' ? 'bg-emerald-500 hover:bg-emerald-600 text-white border-0' : ''}`}>
        {e.status}
      </Badge>
    </div>
  );

  const summaryScore = (s: TestScore) => (
    <div>
      <p className="text-sm font-semibold">{s.examName} {s.year && `(${s.year})`}</p>
      <p className="text-xs text-muted-foreground">
        {s.score && `Score: ${s.score}`}{s.rank && ` · Rank: ${s.rank}`}{s.percentile && ` · ${s.percentile} %ile`}
      </p>
    </div>
  );

  return (
    <div className="space-y-10">
      {/* Education Entries */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <GraduationCap className="h-5 w-5 text-theme-500" />
          <h3 className="text-base font-headline font-semibold">Education History</h3>
        </div>
        <DynamicListEditor<EducationEntry>
          items={entries}
          onAdd={e => setEntries(prev => [...prev, e])}
          onEdit={e => setEntries(prev => prev.map(x => x.id === e.id ? e : x))}
          onDelete={id => setEntries(prev => prev.filter(x => x.id !== id))}
          renderSummary={summaryEntry}
          renderForm={(_, onChange) => <EducationForm item={_ ?? emptyEntry()} onChange={onChange} />}
          createEmpty={emptyEntry}
          title="Education Entry"
          addLabel="Add Degree / Qualification"
          emptyMessage="No education entries yet. Add your Class 10, Class 12, degree and more."
        />
      </section>

      {/* Test Scores — PRIVATE */}
      <section className="border-t pt-8">
        <div className="flex items-center gap-2 mb-1">
          <FlaskConical className="h-5 w-5 text-theme-500" />
          <h3 className="text-base font-headline font-semibold">Standardised Test Scores</h3>
          <Badge variant="outline" className="text-[10px] text-muted-foreground border-muted-foreground/40 ml-1">Private — used only for AI matching</Badge>
        </div>
        <p className="text-xs text-muted-foreground mb-4">These scores are never shown publicly. They power the AI eligibility analysis when you check your odds.</p>
        <DynamicListEditor<TestScore>
          items={testScores}
          onAdd={e => setTestScores(prev => [...prev, e])}
          onEdit={e => setTestScores(prev => prev.map(x => x.id === e.id ? e : x))}
          onDelete={id => setTestScores(prev => prev.filter(x => x.id !== id))}
          renderSummary={summaryScore}
          renderForm={(_, onChange) => <TestScoreForm item={_ ?? emptyScore()} onChange={onChange} />}
          createEmpty={emptyScore}
          title="Test Score"
          addLabel="Add Exam Score"
          emptyMessage="No test scores yet. Add JEE, NEET, GATE, GRE, IELTS and more."
        />
      </section>

      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={saving} className="gap-2 bg-theme-600 hover:bg-theme-700 text-white min-w-[140px]">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving...' : 'Save Academic Data'}
        </Button>
      </div>
    </div>
  );
}
