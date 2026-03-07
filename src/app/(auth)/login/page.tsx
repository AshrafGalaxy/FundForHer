
import { Button } from '@/components/ui/button';
import { GraduationCap, Home } from 'lucide-react';
import Link from 'next/link';
import { ClientLoginForm } from '@/features/auth/ClientLoginForm';


export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/50">
        <div className="container mx-auto px-4 py-8 flex flex-col items-center">
             <div className="flex items-center gap-2 mb-6">
                <GraduationCap className="h-8 w-8 text-primary" />
                <span className="text-2xl font-headline font-bold text-card-foreground">
                FUND HER FUTURE
                </span>
            </div>
            <div className="max-w-md w-full">
                <Button asChild variant="ghost" className="mb-4 -ml-4">
                  <Link href="/">
                    <Home className="mr-2" />
                    Back to Home
                  </Link>
                </Button>
                <ClientLoginForm />
            </div>
        </div>
    </div>
  );
}
