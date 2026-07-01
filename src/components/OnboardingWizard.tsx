import { useState, useEffect } from 'react';
import { generateLatexResume } from '@/lib/resumeGenerator';
import { Progress } from './ui/progress';
import { Button } from './ui/button';
import { CheckCircle, Loader2 } from 'lucide-react';
import { useOnboarding } from '@/lib/onboardingContext';
import { useAIService } from '@/hooks/useAIService';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/authContext';
import { saveUserData, getUserData, saveResume } from '@/lib/firebaseWeb';
import { toast } from 'sonner';
import type { ResumeProfile } from '@/types/resumeProfile';
import { resumePromptRaw, coverLetterPromptRaw } from '@/config/prompts.config';
import { DOMAINS } from '@/data/domainRoles';
import { defaultProfile } from '@/lib/onboardingDefaults';
import { AutofillBadge } from './onboarding/shared';
import { ResumeUploadStep } from './onboarding/steps/ResumeUploadStep';
import { WelcomeStep } from './onboarding/steps/WelcomeStep';
import { PersonalInfoStep } from './onboarding/steps/PersonalInfoStep';
import { DomainStep } from './onboarding/steps/DomainStep';
import { TargetRolesStep } from './onboarding/steps/TargetRolesStep';
import { ExperienceStep } from './onboarding/steps/ExperienceStep';
import { EducationStep } from './onboarding/steps/EducationStep';
import { ProjectsStep } from './onboarding/steps/ProjectsStep';
import { CertificationsStep } from './onboarding/steps/CertificationsStep';
import { SkillsStep } from './onboarding/steps/SkillsStep';
import { ExtrasStep } from './onboarding/steps/ExtrasStep';
import { ReviewStep } from './onboarding/steps/ReviewStep';
import { TemplatePickerStep } from './onboarding/steps/TemplatePickerStep';
import { RESUME_TEMPLATES, fetchTemplateTex } from '@/lib/templateRegistry';
import type { ResumeTemplate } from '@/lib/templateRegistry';

const TOTAL_STEPS = 12;

const STEP_LABELS = [
  'Welcome',
  'Personal Info',
  'Domain',
  'Target Roles',
  'Experience',
  'Education',
  'Projects',
  'Certifications',
  'Skills',
  'Extras',
  'Review & Generate',
  'Choose Template',
];

interface OnboardingWizardProps {
  onComplete?: () => void;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { showOnboarding, completeOnboarding, skipOnboarding, resumeProfile: savedProfile, initialStep } = useOnboarding();
  const { callForTask } = useAIService();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(() => ((initialStep ?? 0) > 0 ? initialStep : -1));
  const [profile, setProfile] = useState<Partial<ResumeProfile>>(
    savedProfile ?? defaultProfile()
  );
  const [skippedSteps, setSkippedSteps] = useState<Set<number>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [wasAutofilled, setWasAutofilled] = useState(false);
  const [reviewJump, setReviewJump] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ResumeTemplate>(RESUME_TEMPLATES[0]);

  useEffect(() => {
    setStep((initialStep ?? 0) > 0 ? initialStep : -1);
  }, [initialStep]);

  const updateProfile = (updates: Partial<ResumeProfile>) => {
    setProfile((prev) => ({ ...prev, ...updates }));
  };

  const handleParsedResume = (mapped: Partial<ResumeProfile>) => {
    setProfile((prev) => ({ ...prev, ...mapped }));
    setWasAutofilled(true);
    setStep(0);
    toast.success('Resume auto-filled! Review and edit each section.');
  };

  const saveProgress = async (nextStep: number, patch?: Partial<ResumeProfile>) => {
    if (!currentUser) return;
    const updated = {
      ...profile,
      ...(patch ?? {}),
      currentStep: nextStep,
      lastUpdated: Date.now(),
      skippedSteps: Array.from(skippedSteps),
    };
    setProfile(updated);
    try {
      await saveUserData(currentUser.uid, 'resumeProfile', updated as Record<string, unknown>);
    } catch {
      // non-critical
    }
  };

  const goNext = async (patch?: Partial<ResumeProfile>) => {
    const next = step + 1;
    await saveProgress(next, patch);
    setStep(next);
    window.scrollTo(0, 0);
  };

  const goBack = () => {
    setStep((s) => Math.max(0, s - 1));
    window.scrollTo(0, 0);
  };

  const handleSkip = async (stepNum: number) => {
    const newSkipped = new Set(skippedSteps);
    newSkipped.add(stepNum);
    setSkippedSteps(newSkipped);
    const next = step + 1;
    if (currentUser) {
      const updated = {
        ...profile,
        currentStep: next,
        lastUpdated: Date.now(),
        skippedSteps: Array.from(newSkipped),
      };
      setProfile(updated as Partial<ResumeProfile>);
      try {
        await saveUserData(currentUser.uid, 'resumeProfile', updated as Record<string, unknown>);
      } catch {
        // non-critical
      }
    }
    setStep(next);
    window.scrollTo(0, 0);
  };

  const handleEditFromReview = (targetStep: number) => {
    setReviewJump(true);
    setStep(targetStep);
    window.scrollTo(0, 0);
  };

  const returnToReview = () => {
    setReviewJump(false);
    setStep(10);
    window.scrollTo(0, 0);
  };

  const injectDynamicPrompts = async (finalProfile: ResumeProfile, coverLetterLatex?: string) => {
    if (!currentUser) return;
    
    // Resolve human-readable domain label
    const domainObj = DOMAINS.find(d => d.id === finalProfile.domain);
    const domainLabel = domainObj ? domainObj.label : (finalProfile.domain || 'general');
    const rolesString = finalProfile.targetRoles?.join(', ') || 'various roles';
    
    const personalization = `\n\nFocus specifically on highlighting my skills for the ${domainLabel} domain, targeting roles such as: ${rolesString}.`;

    const newResumePrompt = {
      id: `custom-resume-${Date.now()}`,
      type: "resume" as const,
      name: "Tailored Resume Prompt",
      content: resumePromptRaw + personalization,
      placeholders: {
        resumePosition: "{RESUME}",
        jobDescriptionPosition: "{JOB_DESCRIPTION}",
      }
    };

    const newCoverLetterPrompt = {
      id: `custom-coverletter-${Date.now()}`,
      type: "coverLetter" as const,
      name: "Tailored Cover Letter Prompt",
      content: coverLetterPromptRaw + personalization,
      placeholders: {
        resumePosition: "{RESUME}",
        jobDescriptionPosition: "{JOB_DESCRIPTION}",
        coverLetterTemplatePosition: "{COVER_LETTER_TEMPLATE}"
      }
    };

    // Fetch existing templates and append/replace
    const existingTemplates = await getUserData(currentUser.uid, 'templates').catch(() => ({})) || {};
    const customPrompts = (existingTemplates as any).customPrompts || [];
    const coverLetterTemplates = (existingTemplates as any).coverLetterTemplates || [];
    
    let updatedCoverLetterTemplates = coverLetterTemplates;
    if (coverLetterLatex) {
      const newCoverLetterTemplate = {
        id: `cl-template-${Date.now()}`,
        name: `${finalProfile.firstName || 'My'} Cover Letter - ${selectedTemplate.label} Style`,
        content: "Based on the following job description:\n\n{JOB_DESCRIPTION}\n\nPlease write a cover letter that matches my resume:\n\n{RESUME}\n\nUse this template as a reference:\n\n{COVER_LETTER_TEMPLATE}",
        coverLetterTemplate: coverLetterLatex,
      };
      updatedCoverLetterTemplates = [...coverLetterTemplates, newCoverLetterTemplate];
    }
    
    // Save back
    const updatedTemplates = {
      ...existingTemplates,
      customPrompts: [...customPrompts, newResumePrompt, newCoverLetterPrompt],
      coverLetterTemplates: updatedCoverLetterTemplates,
      updatedAt: new Date().toISOString()
    };
    
    await saveUserData(currentUser.uid, 'templates', updatedTemplates);
    
    // Set as active prompts in settings
    const existingSettings = await getUserData(currentUser.uid, 'settings').catch(() => ({})) || {};
    const updatedSettings = {
      ...existingSettings,
      activePrompt_resume: newResumePrompt.id,
      activePrompt_coverLetter: newCoverLetterPrompt.id,
      updatedAt: new Date().toISOString()
    };
    await saveUserData(currentUser.uid, 'settings', updatedSettings);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const templateTex = await fetchTemplateTex(selectedTemplate.texUrl);
      const latex = await generateLatexResume(
        profile as ResumeProfile,
        (prompt) => callForTask('resumeLatex', prompt),
        templateTex
      );

      const coverLetterPrompt = `You are an expert cover letter writer. Using the following resume profile, write a generic professional cover letter in pure LaTeX format that matches the stylistic elements (colors, fonts, structure) of the provided LaTeX template.

Resume Profile:
${JSON.stringify(profile, null, 2)}

Template to match style from:
${templateTex}

Return ONLY valid, compilable LaTeX code, nothing else. Do not use markdown formatting block.`;

      let coverLetterLatex = "";
      try {
        coverLetterLatex = await callForTask('resumeLatex', coverLetterPrompt);
        coverLetterLatex = coverLetterLatex.replace(/^```(latex)?\s*/i, '').replace(/```\s*$/i, '');
      } catch (e) {
        console.error("Cover letter generation failed, continuing...", e);
      }

      const finalProfile = {
        ...profile,
        completedAt: Date.now(),
        lastUpdated: Date.now(),
        currentStep: TOTAL_STEPS,
        skippedSteps: Array.from(skippedSteps),
      };

      if (currentUser) {
        await saveUserData(currentUser.uid, 'resumeProfile', finalProfile as Record<string, unknown>);
        await injectDynamicPrompts(finalProfile as ResumeProfile, coverLetterLatex);
        
        const resumeId = await saveResume(currentUser.uid, {
          name: `${profile.firstName || 'My'} ${profile.lastName || 'Resume'} - ${new Date().getFullYear()}`,
          latex,
          templateId: selectedTemplate.id,
          templateLabel: selectedTemplate.label,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        toast.success("Resume generated successfully!");
        completeOnboarding();
        onComplete?.();
        navigate(`/resume?edit=${resumeId}`);
      } else {
        completeOnboarding();
        onComplete?.();
        navigate('/resume');
      }
    } catch (err) {
      console.error(err);
      toast.error('Resume generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSkipToFinish = async () => {
    setIsGenerating(true);
    try {
      const finalProfile = {
        ...profile,
        completedAt: Date.now(),
        lastUpdated: Date.now(),
        currentStep: TOTAL_STEPS,
        skippedSteps: Array.from(skippedSteps),
      };
      if (currentUser) {
        await saveUserData(currentUser.uid, 'resumeProfile', finalProfile as Record<string, unknown>);
        await injectDynamicPrompts(finalProfile as ResumeProfile); // No cover letter generated for skip
        await saveUserData(currentUser.uid, 'onboarding', { completed: true, completedAt: Date.now() });
      }
      completeOnboarding();
      onComplete?.();
      window.location.href = '/';
    } catch (e) {
      console.error('Failed to finish onboarding:', e);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!showOnboarding) return null;

  const progressPct = step <= 0 ? 0 : (step / (TOTAL_STEPS - 1)) * 100;
  const autofillSteps = [1, 4, 5, 6, 7, 8];

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-8 min-h-full">
        {step > 0 && (
          <div className="mb-8 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium flex items-center gap-2">
                {STEP_LABELS[step]}
                {skippedSteps.has(step) && (
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    Skipped
                  </span>
                )}
              </span>
              <span className="text-muted-foreground">Step {step} of {TOTAL_STEPS - 1}</span>
            </div>
            <Progress value={progressPct} className="h-2" />
          </div>
        )}

        {step === 0 && wasAutofilled && (
          <div className="mb-6 flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 px-4 py-2.5 rounded-lg">
            <CheckCircle className="h-4 w-4 shrink-0" />
            Your resume was auto-filled — review and edit below as you go through each step.
          </div>
        )}

        {wasAutofilled && autofillSteps.includes(step) && <AutofillBadge />}

        {step === -1 && (
          <ResumeUploadStep
            onParsed={handleParsedResume}
            onSkip={() => setStep(0)}
          />
        )}

        {step === 0 && (
          <WelcomeStep
            onNext={() => setStep(1)}
            onUpload={() => setStep(-1)}
            onSkip={skipOnboarding}
          />
        )}

        {step === 1 && (
          <PersonalInfoStep
            data={profile}
            onChange={updateProfile}
            onNext={() => goNext()}
            onBack={goBack}
            onSkip={() => handleSkip(1)}
          />
        )}

        {step === 2 && (
          <DomainStep
            data={profile}
            onChange={updateProfile}
            onNext={() => goNext()}
            onBack={goBack}
            onSkip={() => handleSkip(2)}
          />
        )}

        {step === 3 && (
          <TargetRolesStep
            data={profile}
            onChange={updateProfile}
            onNext={() => goNext()}
            onBack={goBack}
            onSkip={() => handleSkip(3)}
          />
        )}

        {step === 4 && (
          <ExperienceStep
            data={profile}
            onChange={updateProfile}
            onNext={() => goNext()}
            onBack={goBack}
            onSkip={() => handleSkip(4)}
          />
        )}

        {step === 5 && (
          <EducationStep
            data={profile}
            onChange={updateProfile}
            onNext={() => goNext()}
            onBack={goBack}
            onSkip={() => handleSkip(5)}
          />
        )}

        {step === 6 && (
          <ProjectsStep
            data={profile}
            onChange={updateProfile}
            onNext={() => goNext()}
            onBack={goBack}
            onSkip={() => handleSkip(6)}
          />
        )}

        {step === 7 && (
          <CertificationsStep
            data={profile}
            onChange={updateProfile}
            onNext={() => goNext()}
            onBack={goBack}
            onSkip={() => handleSkip(7)}
          />
        )}

        {step === 8 && (
          <SkillsStep
            data={profile}
            onChange={updateProfile}
            onNext={() => goNext()}
            onBack={goBack}
            onSkip={() => handleSkip(8)}
          />
        )}

        {step === 9 && (
          <ExtrasStep
            data={profile}
            onChange={updateProfile}
            onNext={() => goNext()}
            onBack={goBack}
            onSkip={() => handleSkip(9)}
          />
        )}

        {step === 10 && (
          <ReviewStep
            data={profile}
            onBack={goBack}
            onGenerate={() => goNext()}
            onSkipToFinish={handleSkipToFinish}
            isGenerating={isGenerating}
            onEditStep={handleEditFromReview}
            skippedSteps={skippedSteps}
          />
        )}

        {step === 11 && (
          <TemplatePickerStep
            selectedId={selectedTemplate.id}
            onSelect={setSelectedTemplate}
            onNext={handleGenerate}
            onBack={goBack}
            isGenerating={isGenerating}
          />
        )}

        {reviewJump && step !== 10 && (
          <div className="mt-6 pt-4 border-t">
            <Button
              variant="outline"
              onClick={returnToReview}
              className="w-full gap-2"
            >
              <CheckCircle className="h-4 w-4" /> Done editing — back to Review
            </Button>
          </div>
        )}

        {isGenerating && step !== 11 && (
          <div className="mt-6 p-4 bg-muted rounded-lg text-center flex items-center justify-center gap-3">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <p className="text-sm font-medium">Generating your resume…</p>
          </div>
        )}
      </div>
    </div>
  );
}
