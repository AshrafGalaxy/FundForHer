'use client';

import { useState, useRef } from 'react';
import { Download, Loader2, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/server/db/user-data';
import { format } from 'date-fns';

interface DownloadResumeButtonProps {
  userProfile: UserProfile;
  completionPercentage: number;
}

export function DownloadResumeButton({ userProfile, completionPercentage }: DownloadResumeButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const resumeRef = useRef<HTMLDivElement>(null);

  const calculateAge = (dob: any) => {
    if (!dob) return 'N/A';
    const birthDate = new Date(dob instanceof Date ? dob : (dob.toDate ? dob.toDate() : new Date(dob as string | number)));
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleDownload = async () => {
    if (!resumeRef.current) return;

    // Require at least 50% completion before generating to avoid blank pages
    if (completionPercentage < 50) {
      toast({
        title: "Profile Incomplete",
        description: "Please fill out at least 50% of your profile before generating a resume.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    toast({ title: "Generating PDF", description: "This might take a few seconds..." });

    try {
      // Dynamically import to keep main bundle small
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;

      // Unhide the ref momentarily, capture it, re-hide it
      resumeRef.current.style.display = 'block';

      const canvas = await html2canvas(resumeRef.current, {
        scale: 2, // higher resolution
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      resumeRef.current.style.display = 'none';

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${userProfile.fullName || 'Scholarship'}_Resume.pdf`);

      toast({ title: "Success!", description: "Your scholarship resume has been downloaded." });
    } catch (error) {
      console.error(error);
      toast({
        title: "Download Failed",
        description: "There was an error generating your PDF. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
      if (resumeRef.current) resumeRef.current.style.display = 'none';
    }
  };

  const formattedDob = userProfile.dob
    ? format(userProfile.dob instanceof Date ? userProfile.dob : ((userProfile.dob as any).toDate ? (userProfile.dob as any).toDate() : new Date((userProfile.dob as unknown) as string | number)), 'PPP')
    : 'N/A';

  return (
    <>
      <Button
        onClick={handleDownload}
        disabled={isGenerating}
        variant="default"
        className="w-full justify-start bg-theme-600 hover:bg-theme-700 text-white shadow-md transition-all hover:shadow-lg"
      >
        {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
        {isGenerating ? 'Generating PDF...' : 'Download Scholarship Resume'}
      </Button>

      {/* Hidden PDF Template - Beautifully formatted specifically for print/pdf export */}
      <div className="overflow-hidden" style={{ height: 0, width: 0, opacity: 0, position: 'absolute', pointerEvents: 'none' }}>
        <div ref={resumeRef} style={{ display: 'none', width: '800px', backgroundColor: 'white', padding: '60px', color: '#1a1a1a', fontFamily: 'sans-serif' }}>

          {/* Header */}
          <div style={{ borderBottom: '2px solid #e11d48', paddingBottom: '24px', marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <h1 style={{ fontSize: '36px', fontWeight: 'bold', margin: '0 0 8px 0', color: '#111827' }}>{userProfile.fullName || 'Candidate Profile'}</h1>
              <p style={{ fontSize: '18px', margin: 0, color: '#4b5563' }}>Scholarship Application Portfolio</p>
            </div>
            <div style={{ textAlign: 'right', fontSize: '14px', color: '#6b7280' }}>
              <p style={{ margin: '0 0 4px 0' }}>{userProfile.email}</p>
              <p style={{ margin: '0 0 4px 0' }}>{userProfile.phone || 'Phone not provided'}</p>
              <p style={{ margin: 0 }}>Generated via Fund Her Future</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '48px' }}>
            {/* Left Column */}
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: '20px', color: '#e11d48', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px', marginBottom: '16px', fontWeight: 'bold' }}>Personal Information</h2>

              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date of Birth & Age</p>
                <p style={{ fontSize: '16px', margin: 0, fontWeight: 500 }}>{formattedDob} ({calculateAge(userProfile.dob)} years old)</p>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Residential Address</p>
                <p style={{ fontSize: '16px', margin: 0, fontWeight: 500, lineHeight: 1.5 }}>{userProfile.address || 'Not provided'}</p>
              </div>

              <h2 style={{ fontSize: '20px', color: '#e11d48', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px', marginBottom: '16px', marginTop: '40px', fontWeight: 'bold' }}>Identity Verification</h2>

              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Aadhar Number</p>
                <p style={{ fontSize: '16px', margin: 0, fontWeight: 500, fontFamily: 'monospace' }}>
                  {userProfile.aadhar ? `XXXX-XXXX-${userProfile.aadhar.slice(-4)}` : 'Not provided'}
                </p>
              </div>
            </div>

            {/* Right Column */}
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: '20px', color: '#e11d48', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px', marginBottom: '16px', fontWeight: 'bold' }}>Academic Background</h2>

              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Highest Qualification</p>
                <p style={{ fontSize: '16px', margin: 0, fontWeight: 500 }}>{userProfile.qualification || 'Not provided'}</p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Institution</p>
                <p style={{ fontSize: '16px', margin: 0, fontWeight: 500 }}>{userProfile.college || 'Not provided'}</p>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Field of Study / Major</p>
                <p style={{ fontSize: '16px', margin: 0, fontWeight: 500 }}>{userProfile.fieldOfStudy || 'Not provided'}</p>
              </div>
            </div>
          </div>

          {/* Footer watermark */}
          <div style={{ marginTop: '100px', textAlign: 'center', color: '#9ca3af', fontSize: '12px', borderTop: '1px solid #f3f4f6', paddingTop: '24px' }}>
            Certified accurate via <strong>Fund Her Future</strong> Profile Dashboard • {format(new Date(), 'MMMM d, yyyy')}
          </div>
        </div>
      </div>
    </>
  );
}
