'use client';

import { useState } from 'react';
import { Sparkles, AlertCircle, CheckCircle2, XCircle, RefreshCw, UserX, TrendingUp, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface CheckOddsWidgetProps {
  scholarshipTitle: string;
  eligibilityData: Record<string, any>;
  userProfile: Record<string, any>;
  /** When true, renders inline (no wrapping Card) — for embedding in the Apply page sidebar */
  inline?: boolean;
}

interface OddsResult {
  matchPercentage: number;
  isEligible: boolean;
  rejectionRisks: string[];
  strengths?: string[];
  recommendation?: string;
}

export function CheckOddsWidget({
  scholarshipTitle,
  eligibilityData,
  userProfile,
  inline = false,
}: CheckOddsWidgetProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OddsResult | null>(null);
  const [error, setError] = useState('');

  const checkOdds = async () => {
    const profileKeys = Object.keys(userProfile || {}).filter(k => userProfile[k] != null && userProfile[k] !== '');
    if (profileKeys.length === 0) {
      setError('Your profile is incomplete. Please fill in your details in Settings before checking eligibility.');
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
        // Show the API's error message (no duplication)
        throw new Error(data?.error || 'Analysis failed. Please try again.');
      }

      setResult(data as OddsResult);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (pct: number) => {
    if (pct >= 75) return 'text-emerald-600 dark:text-emerald-400';
    if (pct >= 50) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getProgressClass = (pct: number) => {
    if (pct >= 75) return '[&>div]:bg-emerald-500';
    if (pct >= 50) return '[&>div]:bg-amber-500';
    return '[&>div]:bg-red-500';
  };

  const getScoreLabel = (pct: number) => {
    if (pct >= 85) return { label: 'Excellent Match', variant: 'default' as const };
    if (pct >= 70) return { label: 'Good Match', variant: 'secondary' as const };
    if (pct >= 50) return { label: 'Partial Match', variant: 'outline' as const };
    return { label: 'Low Match', variant: 'destructive' as const };
  };

  // ── Initial CTA ─────────────────────────────────────────────────────────────
  if (!result && !loading && !error) {
    if (inline) {
      return (
        <Button onClick={checkOdds} className="w-full gap-2 bg-gradient-to-r from-theme-600 to-primary hover:from-theme-700 hover:to-primary/90 text-white shadow-md shadow-primary/20">
          <Sparkles className="h-4 w-4" />
          Check My Eligibility
        </Button>
      );
    }
    return (
      <Button onClick={checkOdds} variant="secondary" size="lg" className="gap-2 w-full sm:w-auto">
        <Sparkles className="h-4 w-4 text-theme-500" />
        Check My Odds
      </Button>
    );
  }

  const content = (
    <div className="space-y-4">
      {/* Loading */}
      {loading && (
        <div className="space-y-3 py-2">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <div className="h-4 w-4 rounded-full border-2 border-theme-500 border-t-transparent animate-spin shrink-0" />
            Analysing your profile against <strong className="text-foreground">{scholarshipTitle}</strong>...
          </div>
          <Progress value={undefined} className="h-1.5 animate-pulse" />
          <p className="text-xs text-muted-foreground">Comparing eligibility criteria, field of study, location, and more...</p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">Analysis Failed</p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{error}</p>
            </div>
          </div>
          <Button onClick={checkOdds} variant="outline" size="sm" className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" /> Try Again
          </Button>
        </div>
      )}

      {/* Result */}
      {!loading && result && (
        <div className="space-y-4">
          {/* Score Ring */}
          <div className="flex items-center gap-4">
            <div className="relative flex items-center justify-center w-20 h-20 shrink-0">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted/30" />
                <circle
                  cx="18" cy="18" r="15.9" fill="none" strokeWidth="3"
                  strokeDasharray={`${result.matchPercentage} ${100 - result.matchPercentage}`}
                  strokeLinecap="round"
                  className={result.matchPercentage >= 75 ? 'text-emerald-500' : result.matchPercentage >= 50 ? 'text-amber-500' : 'text-red-500'}
                  stroke="currentColor"
                />
              </svg>
              <span className={cn('absolute text-xl font-bold tabular-nums', getScoreColor(result.matchPercentage))}>
                {result.matchPercentage}%
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge
                  variant={getScoreLabel(result.matchPercentage).variant}
                  className={cn('text-[10px] font-bold', result.matchPercentage >= 75 && 'bg-emerald-500 hover:bg-emerald-600 text-white border-0')}
                >
                  {getScoreLabel(result.matchPercentage).label}
                </Badge>
                {result.isEligible ? (
                  <Badge variant="outline" className="text-[10px] border-emerald-400 text-emerald-600 dark:text-emerald-400 gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Eligible
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] border-red-400 text-red-600 dark:text-red-400 gap-1">
                    <XCircle className="h-3 w-3" /> Not Eligible
                  </Badge>
                )}
              </div>
              <Progress value={result.matchPercentage} className={cn('h-2 mt-2', getProgressClass(result.matchPercentage))} />
            </div>
          </div>

          {/* Recommendation */}
          {result.recommendation && (
            <div className="flex items-start gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <ArrowRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-foreground font-medium">{result.recommendation}</p>
            </div>
          )}

          {/* Strengths */}
          {result.strengths && result.strengths.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 uppercase tracking-wide">
                <TrendingUp className="h-3.5 w-3.5" /> Your Strengths
              </p>
              <ul className="space-y-1.5">
                {result.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Rejection Risks */}
          {result.rejectionRisks && result.rejectionRisks.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-red-700 dark:text-red-400 flex items-center gap-1.5 uppercase tracking-wide">
                <AlertCircle className="h-3.5 w-3.5" /> Risks & Gaps
              </p>
              <ul className="space-y-1.5">
                {result.rejectionRisks.map((risk, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                    <span>{risk}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Re-analyse */}
          <Button onClick={checkOdds} variant="ghost" size="sm" className="w-full gap-2 text-xs text-muted-foreground hover:text-foreground">
            <RefreshCw className="h-3 w-3" /> Re-analyse
          </Button>
        </div>
      )}
    </div>
  );

  if (inline) return content;

  return (
    <Card className="w-full mt-6 bg-muted/50 border-theme-200 dark:border-theme-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-theme-500" />
          AI Eligibility Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
