import ProviderKanbanBoardClient from './ProviderKanbanClient';

// Required for Next.js static export (output: 'export')
export async function generateStaticParams() {
    return [{ scholarshipId: 'placeholder' }];
}

export default function ProviderKanbanPage() {
    return <ProviderKanbanBoardClient />;
}
