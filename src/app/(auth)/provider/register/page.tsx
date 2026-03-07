
import { ProviderRegisterForm } from '@/features/auth/ProviderRegisterForm';
import { Button } from '@/components/ui/button';
import { Briefcase, Home } from 'lucide-react';
import Link from 'next/link';

export default function ProviderRegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/50">
        <div className="container mx-auto px-4 py-8 flex flex-col items-center">
             <div className="flex items-center gap-2 mb-6">
                <Briefcase className="h-8 w-8 text-primary" />
                <span className="text-2xl font-headline font-bold text-card-foreground">
                    Provider Portal
                </span>
            </div>
            <div className="max-w-2xl w-full">
                 <Button asChild variant="ghost" className="mb-4 -ml-4">
                    <Link href="/">
                        <Home className="mr-2" />
                        Back to Home
                    </Link>
                </Button>
                <ProviderRegisterForm />
            </div>
            <p className="text-center text-sm text-muted-foreground mt-6">
                Are you a student?{' '}
                <Link href="/register" className="font-semibold text-primary hover:underline">
                    Register here
                </Link>
            </p>
        </div>
    </div>
  );
}
