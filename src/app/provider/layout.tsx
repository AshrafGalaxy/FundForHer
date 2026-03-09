import { SidebarNav } from "@/components/ui/SidebarNav";

export default function ProviderLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen bg-background relative selection:bg-primary/20">
            <SidebarNav isProvider={true} />
            <div className="flex-1 w-full min-w-0">
                <main className="w-full relative">
                    {children}
                </main>
            </div>
        </div>
    );
}
