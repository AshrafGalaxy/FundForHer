import ScholarshipDetailsClient from './ScholarshipDetailsClient';

// Required for Next.js static export (output: 'export')
// Returns empty array = no pages pre-rendered; they render client-side at runtime
export async function generateStaticParams() {
  return [{ id: 'placeholder' }];
}

export default async function ScholarshipDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ScholarshipDetailsClient id={id} />;
}
