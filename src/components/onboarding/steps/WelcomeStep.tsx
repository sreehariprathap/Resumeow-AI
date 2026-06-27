import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronRight, FileText, Sparkles } from 'lucide-react';

interface WelcomeStepProps {
  onNext: () => void;
  onUpload: () => void;
  onSkip: () => void;
}

export const WelcomeStep = ({ onNext, onUpload, onSkip }: WelcomeStepProps) => (
  <div className="text-center space-y-8 py-8">
    <div className="mx-auto w-24 h-24 bg-gradient-to-br from-primary to-purple-600 rounded-full flex items-center justify-center">
      <FileText className="h-12 w-12 text-white" />
    </div>
    <div className="space-y-3">
      <h2 className="text-3xl font-bold">Let's build your resume</h2>
      <p className="text-muted-foreground max-w-md mx-auto text-base">
        Upload an existing resume and we'll auto-fill everything with AI, or fill in your details step by step. Either way you'll get a polished LaTeX resume ready to compile on Overleaf.
      </p>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 text-left">
      {[
        { title: 'Guided steps', desc: 'Fill in your info at your own pace, save progress automatically' },
        { title: 'AI-enhanced', desc: 'Bullet points strengthened with action verbs and impact metrics' },
        { title: 'LaTeX output', desc: "Professional Jake's Resume template ready to compile" },
      ].map((f) => (
        <Card key={f.title} className="border">
          <CardContent className="pt-5">
            <p className="font-semibold text-sm">{f.title}</p>
            <p className="text-xs text-muted-foreground mt-1">{f.desc}</p>
          </CardContent>
        </Card>
      ))}
    </div>
    <div className="flex flex-col items-center gap-3">
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <Button size="lg" variant="outline" onClick={onUpload} className="px-8">
          <Sparkles className="mr-2 h-4 w-4" /> Upload a resume
        </Button>
        <Button size="lg" onClick={onNext} className="px-8">
          Fill in manually <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
      <button
        type="button"
        onClick={onSkip}
        className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline mt-1"
      >
        Skip for now →
      </button>
    </div>
  </div>
);
