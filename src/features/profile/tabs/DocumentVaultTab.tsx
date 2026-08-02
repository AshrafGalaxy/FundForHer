'use client';

import { useState } from 'react';
import { Shield, Upload, Info } from 'lucide-react';
import { DocumentUploadCard } from '@/features/profile/DocumentUploadCard';
import type { UserProfile, DocumentVaultEntry } from '@/server/db/user-data';
import { updateUserProfile } from '@/server/db/user-data';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

// ── Vault schema ──────────────────────────────────────────────────────────────
const VAULT_DOCS: { docType: string; label: string; description: string; category: string }[] = [
  // Identity
  { docType: 'aadhar_front', label: 'Aadhar Card (Front)', description: 'Front side of Aadhar card', category: 'Identity' },
  { docType: 'aadhar_back',  label: 'Aadhar Card (Back)',  description: 'Back side of Aadhar card',  category: 'Identity' },
  { docType: 'pan_card',     label: 'PAN Card',            description: 'Permanent Account Number card', category: 'Identity' },
  { docType: 'passport',     label: 'Passport',            description: 'Passport (if available)', category: 'Identity' },
  { docType: 'photo',        label: 'Passport-size Photo', description: 'Recent passport-size photograph', category: 'Identity' },
  { docType: 'signature',    label: 'Digital Signature',   description: 'Scanned signature on white paper', category: 'Identity' },
  // Financial
  { docType: 'income_cert',  label: 'Income Certificate',  description: 'Issued by competent authority', category: 'Financial' },
  { docType: 'bank_passbook',label: 'Bank Passbook / Statement', description: 'First page showing account details', category: 'Financial' },
  { docType: 'ration_card',  label: 'Ration Card',         description: 'APL / BPL / AAY ration card', category: 'Financial' },
  // Community
  { docType: 'caste_cert',   label: 'Caste Certificate',   description: 'For OBC/SC/ST applicants', category: 'Community' },
  { docType: 'domicile_cert',label: 'Domicile Certificate', description: 'State domicile proof', category: 'Community' },
  { docType: 'disability_cert', label: 'Disability Certificate', description: 'For PwD applicants', category: 'Community' },
  // Academic
  { docType: 'class10_marksheet', label: 'Class 10 Marksheet', description: '', category: 'Academic' },
  { docType: 'class12_marksheet', label: 'Class 12 Marksheet', description: '', category: 'Academic' },
  { docType: 'ug_marksheet',  label: 'UG Marksheets / Transcript', description: 'All semester marksheets', category: 'Academic' },
  { docType: 'pg_marksheet',  label: 'PG Marksheets / Transcript', description: 'All semester marksheets', category: 'Academic' },
  { docType: 'degree_cert',   label: 'Degree Certificate(s)', description: 'Provisional or original', category: 'Academic' },
  { docType: 'migration_cert',label: 'Migration Certificate', description: 'Required for inter-university transfers', category: 'Academic' },
  { docType: 'gap_cert',      label: 'Gap Certificate',    description: 'If there was a gap in education', category: 'Academic' },
  // Application Docs
  { docType: 'sop',           label: 'Statement of Purpose (SOP)', description: 'Your personal statement PDF', category: 'Application' },
  { docType: 'lor_1',         label: 'Letter of Recommendation 1', description: 'From a professor or employer', category: 'Application' },
  { docType: 'lor_2',         label: 'Letter of Recommendation 2', description: 'From a professor or employer', category: 'Application' },
  { docType: 'resume',        label: 'CV / Resume',         description: 'Your latest resume', category: 'Application' },
];

const CATEGORIES = ['Identity', 'Financial', 'Community', 'Academic', 'Application'];

interface DocumentVaultTabProps {
  profile: UserProfile;
  onVaultUpdate: (docs: DocumentVaultEntry[]) => void;
}

export function DocumentVaultTab({ profile, onVaultUpdate }: DocumentVaultTabProps) {
  const db = useFirestore();
  const { toast } = useToast();
  const [docs, setDocs] = useState<DocumentVaultEntry[]>(profile.documents ?? []);

  const getExisting = (docType: string) => docs.find(d => d.docType === docType);
  const uploadedCount = docs.length;
  const totalDocs = VAULT_DOCS.length;

  const handleUploaded = async (entry: DocumentVaultEntry) => {
    if (!db || !profile.uid) return;
    const newDocs = [...docs.filter(d => d.docType !== entry.docType), entry];
    setDocs(newDocs);
    onVaultUpdate(newDocs);
    try {
      await updateUserProfile(db, profile.uid, { documents: newDocs });
      toast({ title: '✅ Document Saved', description: `${entry.label} uploaded to your vault.` });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Save Failed', description: e.message });
    }
  };

  const handleDeleted = async (docType: string) => {
    if (!db || !profile.uid) return;
    const newDocs = docs.filter(d => d.docType !== docType);
    setDocs(newDocs);
    onVaultUpdate(newDocs);
    try {
      await updateUserProfile(db, profile.uid, { documents: newDocs });
      toast({ title: 'Document Removed', description: 'Removed from your vault.' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    }
  };

  return (
    <div className="space-y-8">
      {/* Vault Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-gradient-to-r from-primary/5 to-theme-500/5 border border-primary/20 rounded-xl">
        <div className="p-3 bg-primary/10 rounded-lg text-primary shrink-0">
          <Shield className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-foreground">Secure Document Vault</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Upload once, apply everywhere. These documents are securely stored and can be auto-attached to scholarship applications.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">{uploadedCount}</p>
            <p className="text-xs text-muted-foreground">of {totalDocs} uploaded</p>
          </div>
          <div className="w-12 h-12 relative shrink-0">
            <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/30" />
              <circle cx="18" cy="18" r="15.9" fill="none" strokeWidth="3"
                strokeDasharray={`${Math.round((uploadedCount / totalDocs) * 100)} 100`}
                className="text-primary" stroke="currentColor" strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-primary">
              {Math.round((uploadedCount / totalDocs) * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Limits notice */}
      <div className="flex items-start gap-2 text-xs text-muted-foreground bg-secondary/50 rounded-lg p-3 border">
        <Info className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
        <span>Max file size: <strong>2 MB per file</strong>. Accepted formats: <strong>PDF, JPG, PNG</strong>. Files are encrypted in Firebase Storage and only accessible to you.</span>
      </div>

      {/* Categories */}
      {CATEGORIES.map(category => {
        const catDocs = VAULT_DOCS.filter(d => d.category === category);
        const catUploaded = catDocs.filter(d => getExisting(d.docType)).length;
        return (
          <section key={category}>
            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{category}</h3>
              <Badge variant="outline" className={`text-[10px] ${catUploaded === catDocs.length ? 'border-emerald-400 text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                {catUploaded}/{catDocs.length} uploaded
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {catDocs.map(d => (
                <DocumentUploadCard
                  key={d.docType}
                  userId={profile.uid}
                  docType={d.docType}
                  label={d.label}
                  description={d.description}
                  existing={getExisting(d.docType)}
                  onUploaded={handleUploaded}
                  onDeleted={() => handleDeleted(d.docType)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
