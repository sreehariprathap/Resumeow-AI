import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2 } from 'lucide-react';
import { RESUME_TEMPLATES } from '@/lib/templateRegistry';
import type { ResumeTemplate } from '@/lib/templateRegistry';

interface TemplatePickerStepProps {
  selectedId: string | null;
  onSelect: (template: ResumeTemplate) => void;
  onNext: () => void;
  onBack: () => void;
  isGenerating?: boolean;
}

export function TemplatePickerStep({
  selectedId,
  onSelect,
  onNext,
  onBack,
  isGenerating = false,
}: TemplatePickerStepProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Choose a template</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Your content will be placed into this structure. Only your provided details will be used.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {RESUME_TEMPLATES.map((t) => {
          const isSelected = selectedId === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelect(t)}
              onMouseEnter={() => setHovered(t.id)}
              onMouseLeave={() => setHovered(null)}
              className={`relative rounded-lg border-2 overflow-hidden transition-all text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                isSelected
                  ? 'border-primary shadow-md'
                  : hovered === t.id
                  ? 'border-muted-foreground/40'
                  : 'border-border'
              }`}
            >
              <img
                src={t.previewUrl}
                alt={t.label}
                className="w-full aspect-[3/4] object-cover object-top bg-muted"
              />
              <div className="p-2 text-xs font-medium text-center truncate">{t.label}</div>
              {isSelected && (
                <div className="absolute top-2 right-2 bg-primary rounded-full p-0.5 text-primary-foreground">
                  <CheckCircle className="h-4 w-4" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onBack} disabled={isGenerating} className="flex-1">
          Back
        </Button>
        <Button onClick={onNext} disabled={!selectedId || isGenerating} className="flex-1 gap-2">
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Generating…
            </>
          ) : (
            'Generate Resume'
          )}
        </Button>
      </div>
    </div>
  );
}
