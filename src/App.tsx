import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useSelectedTemplate } from "./hooks/useSelectedTemplate";
import { useActivePrompts } from "./hooks/useActivePrompts";
import { useFastCompile } from "./hooks/useFastCompile";
import { useATSInstructions } from "./hooks/useATSInstructions";
import { JobDescriptionInput } from "./components/JobDescriptionInput";
import { ResumeInput } from "./components/ResumeInput";
import { PromptDisplay } from "./components/PromptDisplay";
import { OptionalInstructions } from "./components/OptionalInstructions";
import { TemplateSelector } from "./components/TemplateSelector";
import { PromptTypeSelector } from "./components/PromptTypeSelector";
import { SettingsDialog } from "./components/SettingsDialog";
import { TemplateManagementDialog } from "./components/TemplateManagementDialog";
import { ResumeLaTeXGenerator } from "./components/ResumeLaTeXGenerator";
import { CoverLetterGenerator } from "./components/CoverLetterGenerator";
import { ATSInsightsTracker } from "./components/ATSInsightsTracker";
import { GoogleAuthButton } from "./components/GoogleAuthButton";
import { PromptTemplateSelector } from "./components/PromptTemplateSelector";
import { OnboardingWizard } from "./components/OnboardingWizard";
import { SyncStatusIndicator } from "./components/SyncStatus";
import { useTemplates } from "./hooks/useTemplates";
import { usePromptGenerator } from "./hooks/usePromptGenerator";
import { useAIProvider } from "./lib/aiProviderContext";
import { useAuth } from "./lib/authContext";
import { useOnboarding } from "./lib/onboardingContext";
import { Card, CardContent, CardHeader, CardAction } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Label } from "./components/ui/label";
import { Checkbox } from "./components/ui/checkbox";
import { Switch } from "./components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./components/ui/dialog";
import { Badge } from "./components/ui/badge";
import { Settings, Trash2, Bot, Sparkles, FolderOpen, Zap } from "lucide-react";
import { toast } from "sonner";
import type { PromptType, Template, CustomPrompt } from "./types";
import { CombinedATSAnalysis } from "./components/CombinedATSAnalysis";
import { useAIService, type ATSScore } from "./hooks/useAIService";
import { useApplicationTracker } from "./hooks/useApplicationTracker";
import { getSavedResumes } from "./lib/firebaseWeb";

function App() {
  const { currentUser } = useAuth();
  const { resumeTemplates,
    coverLetterTemplates,
    customPrompts,
    addTemplate,
    deleteTemplate,
    updateTemplate,    addCustomPrompt,
    updateCustomPrompt,
    deleteCustomPrompt,
    getActivePrompt,
    setActivePrompt,
    clearAllData
  } = useTemplates();
  const { generateResumePrompt, generateCoverLetterPrompt } = usePromptGenerator({
    resumeTemplates,
    coverLetterTemplates,
    getActivePrompt,
  });
  const { selectedModel } = useAIProvider();
  const { showOnboarding, completeOnboarding, startOnboarding, hasCompletedOnboarding } = useOnboarding();
  const [searchParams, setSearchParams] = useSearchParams();

  // Load saved resumes to act as the single source of truth for "Saved Resume:"
  const [savedResumesAsTemplates, setSavedResumesAsTemplates] = useState<Template[]>([]);
  useEffect(() => {
    if (currentUser) {
      getSavedResumes(currentUser.uid)
        .then(resumes => {
          setSavedResumesAsTemplates(resumes.map(r => ({
            id: r.id,
            name: r.name,
            resumeLatex: r.latex
          })));
        })
        .catch(console.error);
    } else {
      setSavedResumesAsTemplates([]);
    }
  }, [currentUser]);

  const effectiveResumeTemplates = savedResumesAsTemplates.length > 0 ? savedResumesAsTemplates : resumeTemplates;

  // We need to re-initialize prompt generator with effectiveResumeTemplates
  const { generateResumePrompt: generateResumePromptEffective } = usePromptGenerator({
    resumeTemplates: effectiveResumeTemplates,
    coverLetterTemplates,
    getActivePrompt,
  });

  useEffect(() => {
    if (searchParams.get('onboarding') === 'true') {
      startOnboarding();
      setSearchParams({});
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps
  const { extractJobDetails } = useAIService();
  const { addApplication, updateScores } = useApplicationTracker();
  // Holds the ID of the most recently tracked application so ATS/fit scores can be linked back
  const lastTrackedIdRef = useRef<string | null>(null);
  const [promptType, setPromptType] = useState<PromptType>("resume");
  const [resumeContent, setResumeContent] = useState("");
  const [coverLetterTemplate, setCoverLetterTemplate] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [useTemporaryResume, setUseTemporaryResume] = useState(false);
  const [generateLatex, setGenerateLatex] = useState<boolean>(true);
  const [originalResumeContent, setOriginalResumeContent] = useState("");
  const [generatedResumeLatex, setGeneratedResumeLatex] = useState<string>("");
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTemplateManagementOpen, setIsTemplateManagementOpen] = useState(false);
  const [initialATSScore, setInitialATSScore] = useState<{
    overall: number;
    keywordMatch: number;
    skillsAlignment: number;
    experienceMatch: number;
    formatCompliance: number;
    feedback: string[];
    missingKeywords: string[];
    recommendations: string[];
  } | null>(null);

  const {
    selectedTemplateId, setSelectedTemplateId,
    selectedCoverLetterTemplateId, setSelectedCoverLetterTemplateId,
  } = useSelectedTemplate(currentUser);

  const { activePrompts, setActivePrompts } = useActivePrompts(currentUser);

  const {
    setAtsSuggestions,
    hasOptionalInstructions, setHasOptionalInstructions,
    optionalInstructions, setOptionalInstructions,
    handleMissingKeywords,
  } = useATSInstructions();

  const {
    fastCompile, setFastCompile,
    fastCompileATS, handleToggleFastCompileATS,
    fastSettingsOpen, setFastSettingsOpen,
    fastAtsComplete, setFastAtsComplete,
    isCompiling, setIsCompiling,
  } = useFastCompile(jobDescription);

  // Reset ATS tracking when job description changes
  useEffect(() => {
    if (jobDescription && !originalResumeContent && resumeContent) {
      setOriginalResumeContent(resumeContent);
    }
  }, [jobDescription, originalResumeContent, resumeContent]);

  const handleInitialATSAnalysis = useCallback((score: ATSScore) => {
    setInitialATSScore(score);
    // Link ATS score back to the tracked application if one exists
    if (lastTrackedIdRef.current) {
      updateScores(lastTrackedIdRef.current, score.overall);
    }
  }, [updateScores]);

  // Fire-and-forget: extract job details and create a tracker entry in the background
  const trackPromptGeneration = useCallback((type: PromptType) => {
    if (!jobDescription) return;
    extractJobDetails(jobDescription)
      .then(details => {
        const id = addApplication({
          company: details.company,
          role: details.role,
          location: details.location,
          promptType: type,
          skills: details.skills,
        });
        lastTrackedIdRef.current = id;
      })
      .catch(() => { /* non-critical, silently skip */ });
  }, [jobDescription, extractJobDetails, addApplication]);

  const handleLatexGenerated = useCallback((latex: string) => {
    setGeneratedResumeLatex(latex);
    setIsCompiling(false);
  }, []);

  const handleSetActivePrompt = useCallback((type: PromptType, promptId: string) => {
    setActivePrompt(type, promptId);
    setActivePrompts(prev => ({
      ...prev,
      [type]: promptId
    }));
  }, [setActivePrompt]);

  const handleGeneratePrompt = () => {
    if (!jobDescription) return;

    // Fast Compile logic for resume
    if (fastCompile && promptType === 'resume') {
      // Use first valid template if no selection exists
      const templateIdToUse = (selectedTemplateId && selectedTemplateId !== 'no-selection') ? 
          selectedTemplateId : 
          (effectiveResumeTemplates.length > 0 ? effectiveResumeTemplates[0].id : "");

      if (!templateIdToUse) {
        toast.error("No resume template available. Please add a template first.");
        return;
      }

      // Get active prompt or use default
      const activePrompt = getActivePrompt('resume');
      if (!activePrompt) {
        toast.error("No resume prompt template available. Please configure in settings.");
        return;
      }

      // Use template's LaTeX content as resume
      const resumeTemplate = effectiveResumeTemplates.find(t => t.id === templateIdToUse);
      const resumeToUse = resumeTemplate?.resumeLatex || "";

      // Fold in the ATS job-scan insights (missing keywords + suggestions) so the
      // compiled resume is actually tailored to the analysis.
      const atsInstructions = hasOptionalInstructions && optionalInstructions
        ? `${optionalInstructions}\n\n`
        : "";

      const prompt = generateResumePromptEffective({
        jobDescription,
        resumeContent: resumeToUse,
        templateId: templateIdToUse,
        showResumeInput: true,
        optionalInstructions: `${atsInstructions}Return the output as pure LaTeX code.`
      });

      setGeneratedPrompt(prompt);
      if (!prompt.startsWith("Error:")) {
        setGeneratedResumeLatex("");
        setIsCompiling(true);
        toast.success("Compiling your tailored LaTeX resume…");
        trackPromptGeneration('resume');
      }
      return;
    }

    // Normal flow continues...
    // Get the selected resume template (shared for both resume and cover letter types)
    const resumeTemplate = effectiveResumeTemplates.find(t => t.id === selectedTemplateId);
    // Use the temporary resume text if selected, otherwise use the LaTeX template from the selected resume
    const resumeToUse = useTemporaryResume ? resumeContent : (resumeTemplate?.resumeLatex || resumeContent);

    if (promptType === 'resume') {
      if (selectedTemplateId && selectedTemplateId !== "no-selection" && activePrompts.resume && activePrompts.resume !== "placeholder") {
        const prompt = generateResumePrompt({
          jobDescription,
          resumeContent: resumeToUse,
          templateId: selectedTemplateId,
          showResumeInput: true,
          optionalInstructions: hasOptionalInstructions ? optionalInstructions : undefined
        });
        setGeneratedPrompt(prompt);

        if (!prompt.startsWith("Error:")) {
          toast.success("Resume prompt generated successfully!");
          trackPromptGeneration('resume');
        }
      } else {
        toast.error("Please select a resume template and prompt template.");
      }
    } else if (promptType === 'coverLetter') {
      // For cover letters, we only need a template ID if we're generating LaTeX
      const needsCoverLetterTemplateId = generateLatex;
      const needsActivePrompt = !!activePrompts.coverLetter && activePrompts.coverLetter !== "placeholder";

      if (!needsActivePrompt) {
        toast.error("Please select a cover letter prompt template.");
        return;
      }

      if (!needsCoverLetterTemplateId || (selectedCoverLetterTemplateId && selectedCoverLetterTemplateId !== "no-selection")) {
        // Get the selected cover letter template
        const coverTemplate = coverLetterTemplates.find(t => t.id === selectedCoverLetterTemplateId);
        // Use the provided cover letter template or the one from the selected template if we're generating LaTeX
        const coverLetterTemplateToUse = generateLatex ? (coverLetterTemplate || coverTemplate?.coverLetterTemplate || "") : "";

        // Add LaTeX instruction if the checkbox is checked
        let additionalInstructions = hasOptionalInstructions ? optionalInstructions : "";
        if (generateLatex) {
          if (additionalInstructions) {
            additionalInstructions += "\n\nReturn the output as pure LaTeX code.";
          } else {
            additionalInstructions = "Return the output as pure LaTeX code.";
          }
        }

        const prompt = generateCoverLetterPrompt({
          jobDescription,
          resumeContent: resumeToUse,  // Using the same resume as resume section
          templateId: selectedCoverLetterTemplateId,
          showResumeInput: true,
          optionalInstructions: additionalInstructions || undefined,
          coverLetterTemplate: coverLetterTemplateToUse
        });
        setGeneratedPrompt(prompt);

        if (!prompt.startsWith("Error:")) {
          toast.success("Cover letter prompt generated successfully!");
          trackPromptGeneration('coverLetter');
        }
      } else {
        toast.error("Please select a cover letter template for LaTeX generation.");
      }
    }
  };

  const copyPrompt = () => {
    navigator.clipboard
      .writeText(generatedPrompt)
      .then(() => toast.success("Prompt copied to clipboard!"))
      .catch((err) => {
        console.error("Failed to copy: ", err);
        toast.error("Failed to copy prompt to clipboard");
      });
  };
  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId || "no-selection");

    // Load resume content if available in the template
    const template = effectiveResumeTemplates.find(t => t.id === templateId);
    if (template?.resumeLatex) {
      // Store original content for ATS comparison
      if (!originalResumeContent) {
        setOriginalResumeContent(template.resumeLatex);
      }
      setResumeContent(template.resumeLatex);
    }
  };

  const handleCoverLetterTemplateChange = (templateId: string) => {
    setSelectedCoverLetterTemplateId(templateId || "no-selection");

    // Load cover letter template if available
    const template = coverLetterTemplates.find(t => t.id === templateId);
    console.log("Selected cover letter template:", template);

    if (template?.coverLetterTemplate) {
      console.log("Found cover letter LaTeX content:", template.coverLetterTemplate.substring(0, 100) + "...");
      setCoverLetterTemplate(template.coverLetterTemplate);
      toast.success("LaTeX cover letter template loaded successfully!");
    } else {
      console.log("No coverLetterTemplate found in the selected template");
      toast.info("No LaTeX content found in the selected cover letter template.");
    }
  };

  const handleAddTemplate = (template: Template) => {
    addTemplate(promptType, template);
    toast.success(`${promptType === 'resume' ? 'Resume' : 'Cover letter'} template added successfully!`);
  };

  const handlePromptTypeChange = useCallback((value: string) => {
    setPromptType(value as PromptType);
  }, []);
  const handlePromptSelect = useCallback((promptId: string) => {
    // Don't set placeholder as the active prompt
    if (promptId !== "placeholder") {
      handleSetActivePrompt(promptType, promptId);
    }
  }, [handleSetActivePrompt, promptType]);

  const handleAddCustomPrompt = (prompt: CustomPrompt) => {
    addCustomPrompt(prompt);
    toast.success("Custom prompt added successfully!");
  };

  const handleUpdateCustomPrompt = (promptId: string, prompt: CustomPrompt) => {
    updateCustomPrompt(promptId, prompt);
    toast.success("Custom prompt updated successfully!");
  };

  const handleDeleteCustomPrompt = (promptId: string) => {
    deleteCustomPrompt(promptId);
    toast.success("Custom prompt deleted successfully!");
  }; const handleClearAll = () => {
    // Reset all working state (but preserve saved templates)
    setJobDescription("");
    setResumeContent("");
    setCoverLetterTemplate("");
    setHasOptionalInstructions(false);
    setOptionalInstructions("");
    setUseTemporaryResume(false);
    setGenerateLatex(true);
    setFastCompile(false);
    setOriginalResumeContent("");
    setAtsSuggestions([]);
    setInitialATSScore(null);
    setAtsSuggestions([]);
    setGeneratedResumeLatex("");
    setSelectedTemplateId("no-selection");
    setSelectedCoverLetterTemplateId("no-selection");
    setGeneratedPrompt("");

    // Reset active prompts
    setActivePrompts({
      resume: '',
      coverLetter: ''
    });    // Clear localStorage selections (but preserve saved templates)
    if (currentUser) {
      const userKey = `user_${currentUser.uid}`;
      localStorage.removeItem(`${userKey}_selectedTemplateId`);
      localStorage.removeItem(`${userKey}_selectedCoverLetterTemplateId`);
      localStorage.removeItem(`${userKey}_activePrompt_resume`);
      localStorage.removeItem(`${userKey}_activePrompt_coverLetter`);
    }
    
    // Also clear legacy non-user-isolated keys for cleanup
    localStorage.removeItem("selectedTemplateId");
    localStorage.removeItem("selectedCoverLetterTemplateId");
    localStorage.removeItem("activePrompt_resume");
    localStorage.removeItem("activePrompt_coverLetter");

    toast.success("All working data has been cleared!");
  };

  return (
    <div className="overflow-auto">
      {/* Onboarding Wizard */}
      {showOnboarding && (
        <OnboardingWizard onComplete={completeOnboarding} />
      )}
        <div className="p-2">
        {/* AI Provider Status Display */}        
        <div className="mb-2 flex items-center justify-between">
          <Badge variant="outline" className="flex items-center gap-1 w-fit">
            <Bot className="h-3 w-3" />
            <span className="text-xs">AI Model:</span>
            <span className="text-xs font-medium">{selectedModel.name}</span>
            <Sparkles className="h-3 w-3" />
          </Badge>
          <SyncStatusIndicator />
        </div>
        
        <Card className="w-full shadow-none border-0">
          <CardHeader className="px-4 py-3">
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <div className="flex gap-2">                <CardAction>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsTemplateManagementOpen(true)}
                    className="h-8 w-8 p-0"
                    title="Manage templates"
                  >
                    <FolderOpen className="h-4 w-4" />
                    <span className="sr-only">Manage Templates</span>
                  </Button>
                </CardAction>
                <CardAction>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsSettingsOpen(true)}
                    className="h-8 w-8 p-0"
                    title="Settings"
                  >
                    <Settings className="h-4 w-4" />
                    <span className="sr-only">Settings</span>
                  </Button>
                </CardAction>
                <CardAction>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAll}
                    className="flex items-center gap-1 text-red-500 hover:text-red-600 hover:bg-red-50"
                    title="Clear all data"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="text-xs sr-only">Clear All</span>
                  </Button>
                </CardAction>
              </div>
              <GoogleAuthButton />
            </div>
          </div>
        </CardHeader><CardContent className="space-y-4 px-4 py-3">
            <PromptTypeSelector
              promptType={promptType}
              onChange={handlePromptTypeChange}
            />

            {/* Fast Compile Mode — paste a JD and compile using your saved defaults */}
            {promptType === 'resume' && hasCompletedOnboarding && (
              <div
                className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                  fastCompile
                    ? 'border-amber-400/60 bg-amber-50 dark:bg-amber-950/20'
                    : 'border-border bg-muted/30 hover:border-amber-300/50'
                }`}
              >
                <div
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors ${
                    fastCompile ? 'bg-amber-400 text-white' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <Zap className="h-4 w-4" />
                </div>
                <div className="flex-1 space-y-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="fastCompile" className="cursor-pointer text-sm font-semibold">
                      Fast Compile Mode
                    </Label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setFastSettingsOpen(true)}
                        className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
                        title="Fast Compile settings"
                      >
                        <Settings className="h-3.5 w-3.5" />
                      </button>
                      <Switch
                        id="fastCompile"
                        checked={fastCompile}
                        onCheckedChange={(checked) => setFastCompile(checked as boolean)}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {fastCompile
                      ? 'Just paste the job description and hit Compile — we use your saved resume and default prompt.'
                      : 'Turn on to skip the manual steps: paste a job description and compile in one click.'}
                  </p>
                </div>
              </div>
            )}
            <JobDescriptionInput
              jobDescription={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />

            {/* Fast Compile job scan — ATS analysis + insights before compiling */}
            {fastCompile && promptType === 'resume' && fastCompileATS && jobDescription && (() => {
              const fastTemplate = effectiveResumeTemplates.find(t => t.id === selectedTemplateId && selectedTemplateId !== 'no-selection') ?? effectiveResumeTemplates[0];
              const fastResume = fastTemplate?.resumeLatex || "";
              if (!fastResume) {
                return (
                  <p className="text-xs text-muted-foreground">
                    Add a saved resume template to run the ATS job scan, or turn off ATS analysis in Fast Compile settings.
                  </p>
                );
              }
              return (
                <CombinedATSAnalysis
                  jobDescription={jobDescription}
                  resumeContent={fastResume}
                  onAnalysisComplete={(score) => { handleInitialATSAnalysis(score); setFastAtsComplete(true); }}
                  onMissingKeywords={handleMissingKeywords}
                  onSuggestionsChange={setAtsSuggestions}
                />
              );
            })()}

            {/* Hide these sections when Fast Compile is enabled for resume */}
            {!(fastCompile && promptType === 'resume') && (
              <>
                {/* Display prompt template selector based on prompt type */}
                <PromptTemplateSelector
                  type={promptType}
                  prompts={customPrompts}
                  selectedPromptId={activePrompts[promptType] || ""}
                  onSelectPrompt={handlePromptSelect}
                  label={`${promptType === 'resume' ? 'Resume' : 'Cover Letter'} Prompt Template:`}
                />

                {/* Shared resume selector for both resume and cover letter types */}
                <TemplateSelector
                  templates={effectiveResumeTemplates}
                  selectedTemplateId={selectedTemplateId}
                  onSelectTemplate={handleTemplateChange}
                  onAddTemplate={handleAddTemplate}
                  onLoadTemplate={(resumeLatex) => setResumeContent(resumeLatex)}
                  promptType="resume"
                  label="Saved Resume:"
                />
              </>
            )}

            {/* Only show cover letter template selector when in cover letter mode */}
            {promptType === 'coverLetter' && (
              <>
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="generateLatex"
                      checked={generateLatex}
                      onCheckedChange={(checked) => setGenerateLatex(checked as boolean)}
                    />
                    <Label htmlFor="generateLatex" className="text-xs cursor-pointer">
                      Generate .tex LaTeX output
                    </Label>
                  </div>
                  <p className="text-xs text-gray-500 ml-5">
                    {generateLatex
                      ? "Cover letter will be returned as LaTeX code format"
                      : "Cover letter will be returned as plain text"}
                  </p>
                </div>

                {generateLatex && (
                  <TemplateSelector
                    templates={coverLetterTemplates}
                    selectedTemplateId={selectedCoverLetterTemplateId}
                    onSelectTemplate={handleCoverLetterTemplateChange}
                    onAddTemplate={handleAddTemplate}
                    onLoadTemplate={(coverLetterTemplate) => setCoverLetterTemplate(coverLetterTemplate)}
                    promptType="coverLetter"
                    label="Cover Letter Template:"
                  />
                )}
              </>
            )}          
            {!(fastCompile && promptType === 'resume') && (
              <>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="useTemporaryResume"
                    checked={useTemporaryResume}
                    onCheckedChange={(checked) => setUseTemporaryResume(checked as boolean)}
                  />
                  <Label htmlFor="useTemporaryResume" className="text-xs cursor-pointer">
                    Use temporary resume text
                  </Label>
                </div>          <ResumeInput
                  resumeContent={resumeContent}
                  onChange={(e) => {
                    // Store original content if not already set
                    if (!originalResumeContent && resumeContent && resumeContent !== e.target.value) {
                      setOriginalResumeContent(resumeContent);
                    }
                    setResumeContent(e.target.value);
                  }}
                  visible={useTemporaryResume} />                {/* Combined ATS Analysis & Suggestions - single API call for both scoring and suggestions */}
                {promptType === 'resume' && jobDescription && resumeContent && (
                  <CombinedATSAnalysis
                    jobDescription={jobDescription}
                    resumeContent={resumeContent}
                    onAnalysisComplete={handleInitialATSAnalysis}
                    onMissingKeywords={handleMissingKeywords}
                    onSuggestionsChange={setAtsSuggestions}
                    disabled={!selectedTemplateId || selectedTemplateId === "no-selection"}
                  />
                )}

                <OptionalInstructions
                  hasInstructions={hasOptionalInstructions}
                  instructions={optionalInstructions}
                  onToggleInstructions={setHasOptionalInstructions}
                  onInstructionsChange={(e) => setOptionalInstructions(e.target.value)}
                />
              </>
            )}          <Button
              onClick={handleGeneratePrompt}
              className="w-full h-8 text-sm"
              disabled={
                !jobDescription ||
                (fastCompile && promptType === 'resume' ?
                  // Fast Compile mode for resume — block while compiling, and (if
                  // enabled) until the ATS job scan has finished.
                  (isCompiling || (fastCompileATS && !fastAtsComplete)) :
                  // Normal mode - need all the usual requirements
                  (!activePrompts[promptType] || activePrompts[promptType] === "placeholder" ||
                    (promptType === 'resume' && (!selectedTemplateId || selectedTemplateId === "no-selection")) ||
                    (promptType === 'coverLetter' && generateLatex && (!selectedCoverLetterTemplateId || selectedCoverLetterTemplateId === "no-selection")))
                )
              }
            >
              {fastCompile && promptType === 'resume'
                ? (isCompiling
                    ? 'Compiling…'
                    : (fastCompileATS && !fastAtsComplete ? 'Run job scan to enable Compile' : 'Compile'))
                : `Generate ${promptType === 'resume' ? 'Resume' : 'Cover Letter'} Prompt`
              }
            </Button>

            {generatedPrompt && (
              <PromptDisplay prompt={generatedPrompt} onCopy={copyPrompt} />
            )}          {promptType === 'resume' && (
              // Show for fast compile mode when we have job description, or normal mode when we have all requirements
              (fastCompile && jobDescription) ||
              (!fastCompile && jobDescription && resumeContent && selectedTemplateId && selectedTemplateId !== "no-selection")
            ) && (
                <ResumeLaTeXGenerator
                  generatedPrompt={generatedPrompt}
                  autoGenerate={fastCompile && !!generatedPrompt}
                  onLatexGenerated={handleLatexGenerated}
                  onGeneratingChange={fastCompile ? setIsCompiling : undefined}
                />
              )}          {promptType === 'coverLetter' && generatedPrompt && (
                <CoverLetterGenerator
                  generatedPrompt={generatedPrompt}
                  generateLatex={generateLatex}
                />
              )}          {/* ATS Insights Tracker - show when we have job description and generated LaTeX resume */}
            {promptType === 'resume' && jobDescription && originalResumeContent && generatedResumeLatex && (
              <ATSInsightsTracker
                jobDescription={jobDescription}
                originalResume={originalResumeContent}
                tailoredResume={generatedResumeLatex}
                autoAnalyze={true}
                initialScore={initialATSScore}
              />
            )}

            <div className="mt-4">
              <GoogleAuthButton />
            </div>
          </CardContent>
        </Card>
      </div>      <SettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        customPrompts={customPrompts}
        resumeTemplates={effectiveResumeTemplates}
        coverLetterTemplates={coverLetterTemplates}
        activePrompts={activePrompts}
        onAddCustomPrompt={handleAddCustomPrompt}
        onUpdateCustomPrompt={handleUpdateCustomPrompt}
        onDeleteCustomPrompt={handleDeleteCustomPrompt}
        onSetActivePrompt={handleSetActivePrompt}
        clearAllData={clearAllData}
      />
      
      <TemplateManagementDialog
        isOpen={isTemplateManagementOpen}
        onClose={() => setIsTemplateManagementOpen(false)}
        resumeTemplates={effectiveResumeTemplates}
        coverLetterTemplates={coverLetterTemplates}
        onUpdateTemplate={updateTemplate}
        onDeleteTemplate={deleteTemplate}
        onAddTemplate={addTemplate}
      />

      <Dialog open={fastSettingsOpen} onOpenChange={setFastSettingsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Fast Compile settings</DialogTitle>
            <DialogDescription>
              Control what happens when you compile a resume from just a job description.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-start gap-3 rounded-lg border p-3">
            <Checkbox
              id="fastCompileATS"
              checked={fastCompileATS}
              onCheckedChange={(checked) => handleToggleFastCompileATS(checked as boolean)}
              className="mt-0.5"
            />
            <div className="space-y-1">
              <Label htmlFor="fastCompileATS" className="cursor-pointer text-sm font-medium">
                Run ATS analysis before compiling
              </Label>
              <p className="text-xs text-muted-foreground">
                Scans your resume against the job description for an ATS score, missing keywords and
                insights. Compile stays disabled until the scan finishes, and its results are fed into
                the compiled resume.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default App;
