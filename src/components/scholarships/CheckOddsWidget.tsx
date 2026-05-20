'use client';

import { useState } from 'react';
import { Sparkles, AlertCircle, CheckCircle2, XCircle, RefreshCw, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface CheckOddsWidgetProps {
  scholarshipTitle: string;
  eligibilityData: Record<string, any>;
  userProfile: Record<string, any>;
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
    if (!userProfile || Object.keys(userProfile).filter(k => userProfile[k] != null).length === 0) {
      setError('Your profile is incomplete. Please fill in your details in Settings before checking odds.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/ai/check-odds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scholarshipData: eligibilityData, userProfile }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || data?.detail || 'Analysis failed. Please try again.');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (pct: number) => {
    if (pct >= 75) return 'text-emerald-600 dark:text-emerald-400';
    if (pct >= 50) return 'text-amber-600 dark:text-amber-400';
    return 'text-destructive';
  };

  const getProgressColor = (pct: number) => {
    if (pct >= 75) return '[&>div]:bg-emerald-500';
    if (pct >= 50) return '[&>div]:bg-amber-500';
    return '[&>div]:bg-destructive';
  };

  // Initial CTA state
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
          {!loading && (
            <Button
              variant="ghost"
              size="sm"
              onClick={checkOdds}
              className="text-xs text-muted-foreground h-7 px-2 gap-1"
            >
              <RefreshCw className="h-3 w-3" /> Re-analyse
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">

        {/* Loading state */}
        {loading && (
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="h-4 w-4 rounded-full border-2 border-theme-500 border-t-transparent animate-spin shrink-0" />
              Analysing your profile against <strong className="text-foreground">{scholarshipTitle}</strong>...
            </div>
            <Progress value={undefined} className="h-1.5 animate-pulse" />
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="space-y-3">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Analysis Failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button onClick={checkOdds} variant="outline" size="sm" className="gap-2">
              <RefreshCw className="h-3.5 w-3.5" /> Try Again
            </Button>
          </div>
        )}

        {/* Result state */}
        {!loading && result && (
          <div className="space-y-5">
            {/* Score ring */}
            <div className="flex items-center gap-5">
              <div className="relative flex items-center justify-center w-20 h-20 shrink-0">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted" />
                  <circle
                    cx="18" cy="18" r="15.9" fill="none" strokeWidth="2.5"
                    strokeDasharray={`${result.matchPercentage} ${100 - result.matchPercentage}`}
                    strokeLinecap="round"
                    className={
                      result.matchPercentage >= 75 ? 'text-emerald-500' :
                      result.matchPercentage >= 50 ? 'text-amber-500' : 'text-destructive'
                    }
                    stroke="currentColor"
                  />
                </svg>
                <span className={`absolute text-lg font-bold ${getScoreColor(result.matchPercentage)}`}>
                  {result.matchPercentage}%
                </span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">Match Score</p>
                <div className="flex items-center gap-2 mt-1">
                  {result.isEligible ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive shrink-0" />
                  )}
                  <span className="font-semibold text-base">
                    {result.isEligible ? 'Likely Eligible' : 'Hard Disqualifiers Found'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {result.isEligible
                    ? 'Your profile meets the known baseline criteria.'
                    : 'At least one requirement cannot be verified or is not met.'}
                </p>
              </div>
            </div>

            <Progress
              value={result.matchPercentage}
              className={`h-2 ${getProgressColor(result.matchPercentage)}`}
            />

            {/* Risk list */}
            {result.rejectionRisks && result.rejectionRisks.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  Rejection Risks & Missing Data
                </p>
                <ul className="space-y-2">
                  {result.rejectionRisks.map((risk, idx) => (
                    <li
                      key={idx}
                      className="text-sm text-muted-foreground flex items-start gap-2 bg-background p-3 rounded-lg border border-amber-200 dark:border-amber-900/60"
                    >
                      <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-500 mt-0.5" />
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Perfect match */}
            {(!result.rejectionRisks || result.rejectionRisks.length === 0) && (
              <Alert className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                <CheckCircle2 className="h-4 w-4" color="currentColor" />
                <AlertTitle>Strong Match!</AlertTitle>
                <AlertDescription>
                  Your profile perfectly matches all the known criteria for this scholarship.
                </AlertDescription>
              </Alert>
            )}

            {/* Profile incomplete hint */}
            {result.rejectionRisks?.some(r => r.toLowerCase().includes('not provided') || r.toLowerCase().includes('missing')) && (
              <p className="text-xs text-muted-foreground border-t pt-3">
                💡 <strong>Tip:</strong> Complete your profile in{' '}
                <a href="/authenticated/settings" className="text-primary underline underline-offset-2">
                  Settings
                </a>{' '}
                to improve your match score accuracy.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
