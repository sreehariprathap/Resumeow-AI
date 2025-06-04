import { useState } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { 
  Sparkles, 
  Bot, 
  ChevronLeft, 
  Key, 
  Zap, 
  FileText, 
  Target,
  Settings,
  Users,
  Star,
  ArrowRight,
  Clock,
  Shield
} from 'lucide-react';
import { useOnboarding } from '@/lib/onboardingContext';
import { useAIProvider } from '@/lib/aiProviderContext';
import { AIProviderSelector } from './AIProviderSelector';
import { toast } from 'sonner';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<{ onNext: () => void; onSkip: () => void }>;
}

// Welcome Step Component
const WelcomeStep = ({ onNext }: { onNext: () => void; onSkip: () => void }) => (
  <div className="text-center space-y-6">
    <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
      <Sparkles className="h-10 w-10 text-white" />
    </div>
    
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Welcome to Prompter!</h2>
      <p className="text-muted-foreground max-w-md mx-auto">
        Your AI-powered resume and cover letter assistant. Let's get you set up in just a few steps.
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
      <Card className="border-dashed">
        <CardContent className="pt-6 text-center">
          <Target className="h-8 w-8 mx-auto text-blue-500 mb-2" />
          <h3 className="font-semibold text-sm">AI-Optimized</h3>
          <p className="text-xs text-muted-foreground">Generate tailored prompts for any job</p>
        </CardContent>
      </Card>
      
      <Card className="border-dashed">
        <CardContent className="pt-6 text-center">
          <Zap className="h-8 w-8 mx-auto text-green-500 mb-2" />
          <h3 className="font-semibold text-sm">Lightning Fast</h3>
          <p className="text-xs text-muted-foreground">Create perfect prompts in seconds</p>
        </CardContent>
      </Card>
      
      <Card className="border-dashed">
        <CardContent className="pt-6 text-center">
          <Shield className="h-8 w-8 mx-auto text-purple-500 mb-2" />
          <h3 className="font-semibold text-sm">Secure & Private</h3>
          <p className="text-xs text-muted-foreground">Your data stays safe and private</p>
        </CardContent>
      </Card>
    </div>

    <Button onClick={onNext} className="w-full max-w-xs mx-auto flex items-center gap-2">
      Get Started <ArrowRight className="h-4 w-4" />
    </Button>
  </div>
);

// API Setup Step Component
const APISetupStep = ({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) => {
  const { openRouterApiKey, setOpenRouterApiKey, geminiApiKey, setGeminiApiKey } = useAIProvider();
  const [localOpenRouterKey, setLocalOpenRouterKey] = useState(openRouterApiKey);
  const [localGeminiKey, setLocalGeminiKey] = useState(geminiApiKey);

  const handleSaveAndNext = async () => {
    try {
      if (localOpenRouterKey !== openRouterApiKey) {
        await setOpenRouterApiKey(localOpenRouterKey);
      }
      if (localGeminiKey !== geminiApiKey) {
        await setGeminiApiKey(localGeminiKey);
      }
      
      if (localOpenRouterKey || localGeminiKey) {
        toast.success("API keys saved successfully!");
      }
      
      onNext();
    } catch (error) {
      console.error("Error saving API keys:", error);
      toast.error("Error saving API keys. Please try again.");
    }
  };

  const canProceed = localOpenRouterKey.trim() || localGeminiKey.trim();

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center">
          <Key className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-xl font-bold">Set Up AI Integration</h2>
        <p className="text-muted-foreground text-sm">
          Connect your AI provider to start generating optimized prompts
        </p>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-0">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-base">OpenRouter (Recommended)</CardTitle>
              <Badge variant="secondary" className="text-xs">Free Tier</Badge>
            </div>
            <CardDescription className="text-xs">
              Access to DeepSeek R1 and other powerful models
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2 flex flex-col gap-1">
              <Label htmlFor="openrouter-key" className="text-xs">API Key</Label>
              <Input
                id="openrouter-key"
                type="password"
                value={localOpenRouterKey}
                onChange={(e) => setLocalOpenRouterKey(e.target.value)}
                placeholder="Enter your OpenRouter API key"
                className="text-xs"
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Get your free API key at openrouter.ai</span>
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-xs text-muted-foreground">OR</div>

        <Card>
          <CardHeader className="pb-0">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              <CardTitle className="text-base">Google Gemini</CardTitle>
              <Badge variant="secondary" className="text-xs">Alternative</Badge>
            </div>
            <CardDescription className="text-xs">
              Use Google's Gemini AI models
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2 flex flex-col gap-1">
              <Label htmlFor="gemini-key" className="text-xs">API Key</Label>
              <Input
                id="gemini-key"
                type="password"
                value={localGeminiKey}
                onChange={(e) => setLocalGeminiKey(e.target.value)}
                placeholder="Enter your Google API key"
                className="text-xs"
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Get your API key at console.cloud.google.com</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-white text-xs font-bold">💡</span>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Don't have an API key yet?
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              You can skip this step and set it up later in Settings. However, you'll need an API key to generate AI-powered prompts.
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onSkip} className="flex-1">
          Skip for Now
        </Button>
        <Button 
          onClick={handleSaveAndNext} 
          className="flex-1"
          disabled={!canProceed}
        >
          {canProceed ? "Save & Continue" : "Enter API Key to Continue"}
        </Button>
      </div>
    </div>
  );
};

// Model Selection Step
const ModelSelectionStep = ({ onNext }: { onNext: () => void; onSkip: () => void }) => {
  const { selectedModel, openRouterApiKey, geminiApiKey } = useAIProvider();
  
  const hasAnyApiKey = openRouterApiKey || geminiApiKey;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center">
          <Settings className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-xl font-bold">Choose Your AI Model</h2>
        <p className="text-muted-foreground text-sm">
          Select your preferred AI model for generating prompts
        </p>
      </div>

      {hasAnyApiKey ? (
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <AIProviderSelector className="space-y-3" />
              
              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-medium">Selected Model</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  <strong>{selectedModel.name}</strong> - This will be your default model for all AI operations.
                  You can change this anytime in Settings.
                </p>
              </div>
            </CardContent>
          </Card>

          <Button onClick={onNext} className="w-full">
            Continue with {selectedModel.name}
          </Button>
        </div>
      ) : (
        <div className="text-center space-y-4">
          <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              No API keys configured. You can set up AI integration later in Settings.
            </p>
          </div>
          
          <Button onClick={onNext} variant="outline" className="w-full">
            Continue Without AI Setup
          </Button>
        </div>
      )}
    </div>
  );
};

// Features Overview Step
const FeaturesStep = ({ onNext }: { onNext: () => void; onSkip: () => void }) => {
  const features = [
    {
      icon: Target,
      title: "Smart Prompt Generation",
      description: "Create tailored prompts that optimize your resume and cover letter for specific job postings",
      color: "text-blue-500"
    },
    {
      icon: FileText,
      title: "Template Management",
      description: "Save and organize your resume templates and cover letter formats for quick access",
      color: "text-green-500"
    },
    {
      icon: Zap,
      title: "ATS Optimization",
      description: "Get insights and recommendations to make your documents ATS-friendly",
      color: "text-purple-500"
    },
    {
      icon: Users,
      title: "Multi-Provider AI",
      description: "Automatic failover between OpenRouter and Gemini for reliable AI assistance",
      color: "text-orange-500"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
          <Sparkles className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-xl font-bold">What You Can Do</h2>
        <p className="text-muted-foreground text-sm">
          Discover the powerful features that will help you land your dream job
        </p>
      </div>

      <div className="grid gap-4">
        {features.map((feature, index) => (
          <Card key={index} className="border-l-4 border-l-blue-500">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg bg-muted ${feature.color}`}>
                  <feature.icon className="h-5 w-5" />
                </div>
                <div className="space-y-1 flex-1">
                  <h3 className="font-semibold text-sm">{feature.title}</h3>
                  <p className="text-xs text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="text-center space-y-2">
          <h3 className="font-semibold text-sm">Ready to Get Started?</h3>
          <p className="text-xs text-muted-foreground">
            Start creating optimized prompts for your job applications right away!
          </p>
        </div>
      </div>

      <Button onClick={onNext} className="w-full">
        Start Using Prompter
      </Button>
    </div>
  );
};

interface OnboardingWizardProps {
  onComplete?: () => void;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { showOnboarding, completeOnboarding, skipOnboarding } = useOnboarding();
  const [currentStep, setCurrentStep] = useState(0);

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome',
      description: 'Get started with Prompter',
      component: WelcomeStep
    },
    {
      id: 'api-setup',
      title: 'API Setup',
      description: 'Configure AI integration',
      component: APISetupStep
    },
    {
      id: 'model-selection',
      title: 'AI Model',
      description: 'Choose your preferred model',
      component: ModelSelectionStep
    },
    {
      id: 'features',
      title: 'Features',
      description: 'Discover what you can do',
      component: FeaturesStep
    }
  ];
  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeOnboarding();
      onComplete?.();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    if (currentStep === steps.length - 1) {
      completeOnboarding();
      onComplete?.();
    } else {
      skipOnboarding();
      onComplete?.();
    }
  };

  const CurrentStepComponent = steps[currentStep].component;

  if (!showOnboarding) return null;

  return (
    <Dialog open={showOnboarding} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto pt-10">
        <DialogHeader className="space-y-3">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg">Setup Wizard</DialogTitle>
            <Badge variant="secondary" className="text-xs">
              {currentStep + 1} of {steps.length}
            </Badge>
          </div>
          
          <div className="space-y-2">
            <Progress value={(currentStep + 1) / steps.length * 100} className="h-2" />
            <DialogDescription className="text-xs text-muted-foreground">
              {steps[currentStep].description}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="py-4">
          <CurrentStepComponent onNext={handleNext} onSkip={handleSkip} />
        </div>

        {currentStep > 0 && (
          <div className="flex justify-between pt-4 border-t">
            <Button variant="ghost" onClick={handlePrevious} className="flex items-center gap-2">
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            
            <Button variant="ghost" onClick={handleSkip} className="text-muted-foreground">
              {currentStep === steps.length - 1 ? "Finish" : "Skip Setup"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
