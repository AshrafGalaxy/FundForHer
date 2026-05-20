'use client';

import { useState } from 'react';
import { Sparkles, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CheckOddsWidgetProps {
  scholarshipTitle: string;
  eligibilityData: any;
  userProfile: any;
}

export function CheckOddsWidget({ scholarshipTitle, eligibilityData, userProfile }: CheckOddsWidgetProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    matchPercentage: number;
    isEligible: boolean;
    rejectionRisks: string[];
  } | null>(null);
  const [error, setError] = useState('');

  const checkOdds = async () => {
    if (!userProfile) {
      setError("You must be logged in to check your odds.");
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/ai/check-odds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scholarshipData: eligibilityData,
          userProfile: userProfile,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to analyze odds. Please try again.');
      }
      
      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred during analysis.');
    } finally {
      setLoading(false);
    }
  };

  if (!result && !loading && !error) {
    return (
      <Button onClick={checkOdds} variant="secondary" size="lg" className="gap-2 w-full sm:w-auto">
        <Sparkles className="h-4 w-4 text-theme-500" />
        Check My Odds
      </Button>
    );
  }

  return (
    <Card className="w-full mt-6 bg-muted/50 border-theme-200 dark:border-theme-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-theme-500" /> 
            AI Eligibility Analysis
          </span>
          {loading && <div className="h-4 w-4 rounded-full border-2 border-theme-500 border-t-transparent animate-spin" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-3">
            <Progress value={undefined} className="h-2 animate-pulse bg-secondary" />
            <p className="text-sm text-muted-foreground animate-pulse">
              Analyzing {scholarshipTitle} criteria against your profile...
            </p>
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : result ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">Match Score</span>
              <span className="text-sm font-bold text-theme-600 dark:text-theme-400">
                {result.matchPercentage}%
              </span>
            </div>
            <Progress value={result.matchPercentage} className="h-2" />
            
            <div className="flex items-center gap-2 mt-4">
              {result.isEligible ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              ) : (
                <XCircle className="h-5 w-5 text-destructive" />
              )}
              <span className="font-medium">
                {result.isEligible ? "Likely Eligible" : "Hard Disqualifiers Found"}
              </span>
            </div>

            {result.rejectionRisks && result.rejectionRisks.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-semibold">Rejection Risks & Missing Data:</p>
                <ul className="space-y-2">
                  {result.rejectionRisks.map((risk, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2 bg-background p-3 rounded-md border border-amber-200 dark:border-amber-900">
                      <AlertCircle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {(!result.rejectionRisks || result.rejectionRisks.length === 0) && (
              <Alert className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                <CheckCircle2 className="h-4 w-4" color="currentColor" />
                <AlertDescription>Your profile perfectly matches the known criteria!</AlertDescription>
              </Alert>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
