
'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  overallExperience: z.number().min(1).max(10),
  findability: z.number().min(1).max(10),
  designAppeal: z.number().min(1).max(10),
  infoQuality: z.number().min(1).max(10),
  recommendLikelihood: z.number().min(1).max(10),
  additionalComments: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const ratingDescriptions: { [key: number]: string } = {
  1: "Not at all satisfied",
  2: "Very dissatisfied",
  3: "Dissatisfied",
  4: "Slightly dissatisfied",
  5: "Neutral",
  6: "Slightly satisfied",
  7: "Satisfied",
  8: "Very satisfied",
  9: "Extremely satisfied",
  10: "Perfect!",
};

// Generates a color from red to green based on value from 1 to 10
const getColorForValue = (value: number) => {
  // Hue goes from 0 (red) to 120 (green)
  const hue = (value - 1) * (120 / 9);
  return `hsl(${hue}, 80%, 50%)`;
};


const RatingBox = ({ value, selected, onSelect, onHover }: { value: number; selected: boolean; onSelect: () => void; onHover: (value: number | null) => void }) => {
  const color = getColorForValue(value);

  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={() => onHover(value)}
      onMouseLeave={() => onHover(null)}
      style={{ '--box-color': color } as React.CSSProperties}
      className={cn(
        'h-10 w-10 rounded-md flex items-center justify-center font-bold text-lg text-white transition-all transform hover:scale-110',
        'bg-[var(--box-color)]',
        {
          'ring-2 ring-offset-2 ring-primary': selected,
          'opacity-60 hover:opacity-100': !selected,
        }
      )}
    >
      {value}
    </button>
  );
};

const RatingScale = ({ control, name, label }: { control: any, name: keyof FormValues, label: string }) => {
  const [hoveredValue, setHoveredValue] = useState<number | null>(null);

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <div className="flex justify-between items-center space-x-1 md:space-x-2 p-2 bg-secondary rounded-lg">
              {[...Array(10)].map((_, i) => (
                <RatingBox
                  key={i + 1}
                  value={i + 1}
                  selected={field.value === i + 1}
                  onSelect={() => field.onChange(i + 1)}
                  onHover={setHoveredValue}
                />
              ))}
            </div>
          </FormControl>
          <div className="flex justify-between text-xs text-muted-foreground mt-1 px-1 h-4 transition-opacity duration-200">
            <span className={cn("transition-opacity duration-300", field.value ? 'opacity-0' : 'opacity-100')}>Not Satisfied</span>

            <span className="font-medium text-center">
              {field.value ? (
                <span className="transition-opacity duration-300 opacity-100">
                  {`${field.value}: ${ratingDescriptions[field.value]}`}
                </span>
              ) : (
                <span className={cn("transition-opacity duration-300", hoveredValue ? 'opacity-100' : 'opacity-0')}>
                  {hoveredValue ? `${hoveredValue}: ${ratingDescriptions[hoveredValue]}` : ''}
                </span>
              )}
            </span>

            <span className={cn("transition-opacity duration-300", field.value ? 'opacity-0' : 'opacity-100')}>Very Satisfied</span>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};


import { useFirestore, useAuth } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export function ExperienceFeedbackForm() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const db = useFirestore();
  const auth = useAuth();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      overallExperience: undefined,
      findability: undefined,
      designAppeal: undefined,
      infoQuality: undefined,
      recommendLikelihood: undefined,
      additionalComments: '',
    },
  });

  async function onSubmit(values: FormValues) {
    if (!db) {
      toast({ title: "Error", description: "Database connection failed.", variant: "destructive" });
      return;
    }

    setIsLoading(true);

    try {
      const user = auth?.currentUser;
      await addDoc(collection(db, 'feedback'), {
        ...values,
        userId: user?.uid || 'anonymous',
        userEmail: user?.email || 'anonymous',
        submittedAt: serverTimestamp(),
        type: 'experience'
      });

      // Trigger email notification
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'experience',
          userId: user?.uid || 'anonymous',
          userEmail: user?.email || 'anonymous',
          overallExperience: values.overallExperience,
          findability: values.findability,
          designAppeal: values.designAppeal,
          infoQuality: values.infoQuality,
          recommendLikelihood: values.recommendLikelihood,
          additionalComments: values.additionalComments,
        })
      }).catch(e => console.error("Email notification failed", e));

      toast({
        title: 'Feedback Submitted!',
        description: 'Thank you for sharing your experience with us. It helps us grow!',
      });

      form.reset();
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast({
        title: "Submission Failed",
        description: "There was a problem sending your feedback. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

            <RatingScale control={form.control} name="overallExperience" label="How would you rate your overall experience with FUND HER FUTURE?" />
            <RatingScale control={form.control} name="findability" label="How easy was it to find relevant scholarships?" />
            <RatingScale control={form.control} name="designAppeal" label="How would you rate the design and visual appeal of the website?" />
            <RatingScale control={form.control} name="infoQuality" label="How satisfied are you with the quality of scholarship information provided?" />
            <RatingScale control={form.control} name="recommendLikelihood" label="How likely are you to recommend FUND HER FUTURE to a friend or colleague?" />

            <FormField
              control={form.control}
              name="additionalComments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Any other comments or suggestions?</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Tell us more about your experience or ideas for improvement..."
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Submit Feedback
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
