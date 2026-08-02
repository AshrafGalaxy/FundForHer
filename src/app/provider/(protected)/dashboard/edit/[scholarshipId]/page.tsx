// Server component wrapper — required for Next.js static export (output: 'export')
// The actual UI lives in EditScholarshipClient.tsx (use client)
import EditScholarshipClient from './EditScholarshipClient';

// Returns a placeholder so Next.js knows this dynamic segment exists.
// At runtime the correct scholarshipId is read from useParams() in the client.
export async function generateStaticParams() {
  return [{ scholarshipId: 'placeholder' }];
}

export default function EditScholarshipPage() {
  return <EditScholarshipClient />;
}
