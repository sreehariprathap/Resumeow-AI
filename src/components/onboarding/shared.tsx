import type React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, CheckCircle, Pencil } from 'lucide-react';

export const AutofillBadge = () => (
  <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 px-3 py-1.5 rounded-full mb-4">
    <CheckCircle className="h-3.5 w-3.5" />
    Auto-filled from your resume — review and edit as needed
  </div>
);

export interface StepNavProps {
  onBack: () => void;
  onNext: () => void;
  canNext: boolean;
  nextLabel?: string;
  onSkip?: () => void;
}

export const StepNav = ({ onBack, onNext, canNext, nextLabel = 'Continue', onSkip }: StepNavProps) => (
  <div className="space-y-1 pt-2">
    <div className="flex gap-3">
      <Button variant="ghost" onClick={onBack} className="gap-1">
        <ChevronLeft className="h-4 w-4" /> Back
      </Button>
      <Button className="flex-1 gap-1" onClick={onNext} disabled={!canNext}>
        {nextLabel} <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
    {onSkip && (
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onSkip}
          className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline mt-2"
        >
          Skip for now →
        </button>
      </div>
    )}
  </div>
);

export interface ReviewCardProps {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}

export const ReviewCard = ({ title, onEdit, children }: ReviewCardProps) => (
  <Card>
    <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Button
        variant="ghost"
        size="sm"
        onClick={onEdit}
        className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground shrink-0"
      >
        <Pencil className="h-3 w-3" /> Edit
      </Button>
    </CardHeader>
    <CardContent className="pt-0">{children}</CardContent>
  </Card>
);
