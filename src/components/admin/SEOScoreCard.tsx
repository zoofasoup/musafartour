import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { checkSEO } from "@/lib/seoScoreChecker";

interface SEOScoreCardProps {
  title: string;
  description: string;
  content: string;
  focusKeyword?: string;
}

export const SEOScoreCard = ({ title, description, content, focusKeyword }: SEOScoreCardProps) => {
  const result = checkSEO({ title, description, content, focusKeyword });

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return "bg-green-600";
    if (score >= 60) return "bg-yellow-600";
    return "bg-red-600";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>SEO Score</span>
          <span className={`text-3xl font-bold ${getScoreColor(result.score)}`}>
            {result.score}/100
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={result.score} className="h-3">
          <div className={`h-full ${getProgressColor(result.score)}`} style={{ width: `${result.score}%` }} />
        </Progress>

        <div className="space-y-2">
          {result.checks.map((check, idx) => (
            <div key={idx} className="flex items-start gap-2 text-sm">
              {check.passed ? (
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1">
                <p className="font-medium">{check.name}</p>
                <p className="text-muted-foreground text-xs">{check.message}</p>
              </div>
            </div>
          ))}
        </div>

        {result.score < 80 && (
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Your SEO score can be improved. Address the issues above to increase visibility in search engines.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
