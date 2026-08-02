import { SidebarNav } from "@/components/ui/SidebarNav";

// NOTE: Auth guarding is handled globally by auth-provider.tsx (AuthProvider)
// which calls router.replace('/login') for any unauthenticated access to
// non-public routes, including all /authenticated/* paths.
// Role-based guard (student vs provider) is enforced here client-side.

export default function AuthenticatedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen bg-background relative selection:bg-primary/20">
            <SidebarNav isProvider={false} />
            <div className="flex-1 w-full min-w-0">
                <main className="w-full relative">
                    {children}
                </main>
            </div>
        </div>
    );
}
