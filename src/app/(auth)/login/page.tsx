
import { Home, Lightbulb, TrendingUp, Users } from 'lucide-react';
import Logo from '@/components/ui/Logo';
import Link from 'next/link';
import { ClientLoginForm } from '@/features/auth/ClientLoginForm';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      {/* Left Pane - Visual Hook */}
      <div className="hidden md:flex w-full md:w-1/2 lg:w-[55%] bg-primary/5 border-r border-primary/10 flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[10%] left-[10%] w-72 h-72 bg-gradient-to-br from-primary/20 to-secondary/30 rounded-full blur-3xl" />
          <div className="absolute bottom-[20%] right-[10%] w-96 h-96 bg-gradient-to-tr from-accent/20 to-primary/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 max-w-lg w-full flex flex-col gap-8">
          <div className="flex items-center gap-3">
            <Logo className="w-12 h-12" />
            <span className="text-3xl font-headline font-black text-foreground">FUND HER FUTURE</span>
          </div>
          <div>
            <h1 className="text-5xl font-headline font-bold leading-tight mb-6 mt-4">
              Your future <span className="text-primary italic">funded.</span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Join thousands of women matching with millions in untapped scholarships, grants, and stipends. AI matches you in seconds.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 mt-4">
            <div className="bg-card/60 backdrop-blur-sm p-4 rounded-xl flex items-start gap-4 border shadow-sm">
              <div className="bg-primary/20 p-3 rounded-full"><TrendingUp className="w-6 h-6 text-primary" /></div>
              <div>
                <h3 className="font-semibold text-lg">90% Application Accuracy</h3>
                <p className="text-muted-foreground text-sm">Our AI pre-fills your exact qualifications so you only see what you can actually win.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Pane - The Dual Choice Authentication */}
      <div className="w-full md:w-1/2 lg:w-[45%] flex flex-col justify-center items-center p-6 md:p-12 relative">
        <Button asChild variant="ghost" className="absolute top-6 left-6 md:hidden">
          <Link href="/"><Home className="mr-2 w-4 h-4" />Home</Link>
        </Button>
        <Button asChild variant="ghost" className="absolute top-6 right-6 hidden md:flex">
          <Link href="/"><Home className="mr-2 w-4 h-4" />Back to Home</Link>
        </Button>

        <div className="w-full max-w-md mx-auto mt-12 md:mt-0">
          <div className="md:hidden flex items-center justify-center gap-2 mb-8">
            <Logo className="w-8 h-8" />
            <span className="text-xl font-headline font-bold text-foreground">FUND HER FUTURE</span>
          </div>
          <ClientLoginForm />
        </div>
      </div>
    </div>
  );
}
