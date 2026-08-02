// src/app/provider/(protected)/scholarships/page.tsx
// Redirect: /provider/scholarships → /provider/dashboard
// The scholarships list lives on the main dashboard.
import { redirect } from 'next/navigation';

export default function ProviderScholarshipsRedirect() {
  redirect('/provider/dashboard');
}
