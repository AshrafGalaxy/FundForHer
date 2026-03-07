import { ExperienceFeedbackForm } from '@/features/feedback/ExperienceFeedbackForm';

export default function FeedbackPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <header className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-headline font-bold text-foreground mb-2">
          Website & Experience Feedback
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Tell us about your experience using our website. Your feedback is vital for our improvement.
        </p>
      </header>
      <div className="max-w-4xl mx-auto">
        <ExperienceFeedbackForm />
      </div>
    </div>
  );
}
