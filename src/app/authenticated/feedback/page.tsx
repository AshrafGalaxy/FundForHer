'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquarePlus, Bug } from "lucide-react";
import { motion } from "framer-motion";
import { ExperienceFeedbackForm } from '@/features/feedback/ExperienceFeedbackForm';
import { BugReportForm } from '@/features/feedback/BugReportForm';

export default function FeedbackPage() {
  return (
    <div className="container mx-auto px-4 py-8 lg:py-12 max-w-5xl">
      <header className="mb-10 text-center md:text-left">
        <h1 className="text-4xl md:text-5xl font-headline font-bold text-foreground mb-3 tracking-tight">
          Help Us Improve
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Your voice shapes FUND HER FUTURE. Whether you have an idea, loved an experience, or found a pesky bug, we want to hear about it.
        </p>
      </header>

      <Tabs defaultValue="feedback" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-8 bg-muted/50 p-1 rounded-full">
          <TabsTrigger value="feedback" className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <MessageSquarePlus className="w-4 h-4 mr-2" />
            General Feedback
          </TabsTrigger>
          <TabsTrigger value="bug" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm">
            <Bug className="w-4 h-4 mr-2" />
            Report a Bug
          </TabsTrigger>
        </TabsList>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <TabsContent value="feedback" className="mt-0 outline-none">
            <ExperienceFeedbackForm />
          </TabsContent>

          <TabsContent value="bug" className="mt-0 outline-none">
            <Card className="border-border/50 shadow-sm backdrop-blur-sm bg-card/80">
              <CardHeader>
                <CardTitle className="text-2xl font-headline flex items-center gap-2">
                  <Bug className="w-6 h-6 text-destructive" />
                  Squash a Bug
                </CardTitle>
                <CardDescription className="text-base">
                  Did something break or look weird? Let us know so we can fix it immediately.
                </CardDescription>
              </CardHeader>
              <BugReportForm />
            </Card>
          </TabsContent>
        </motion.div>
      </Tabs>
    </div>
  );
}
