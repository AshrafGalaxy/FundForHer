import { ProviderRegisterForm } from '@/features/auth/ProviderRegisterForm';
import { Button } from '@/components/ui/button';
import { Briefcase, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ProviderRegisterPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-secondary/50 relative">
            <Button asChild variant="ghost" className="absolute top-6 left-10 md:left-14 z-50">
                <Link href="/">
                    <ArrowLeft className="mr-2 w-4 h-4" />
                    Back to Home
                </Link>
            </Button>
            <div className="container mx-auto px-4 py-8 flex flex-col items-center">
                <div className="flex items-center gap-2 mb-6">
                    <Briefcase className="h-8 w-8 text-primary" />
                    <span className="text-2xl font-headline font-bold text-card-foreground">
                        Provider Portal
                    </span>
                </div>
                <div className="max-w-2xl w-full">
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
