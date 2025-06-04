import { useEffect, useState, useCallback } from "react";
import { JobDescriptionInput } from "./components/JobDescriptionInput";
import { ResumeInput } from "./components/ResumeInput";
import { PromptDisplay } from "./components/PromptDisplay";
import { OptionalInstructions } from "./components/OptionalInstructions";
import { TemplateSelector } from "./components/TemplateSelector";
import { PromptTypeSelector } from "./components/PromptTypeSelector";
import { SettingsDialog } from "./components/SettingsDialog";
import { ResumeLaTeXGenerator } from "./components/ResumeLaTeXGenerator";
import { CoverLetterGenerator } from "./components/CoverLetterGenerator";
import { ATSInsightsTracker } from "./components/ATSInsightsTracker";
import { GoogleAuthButton } from "./components/GoogleAuthButton";
import { PromptTemplateSelector } from "./components/PromptTemplateSelector";
import { OnboardingWizard } from "./components/OnboardingWizard";
import { useTemplates } from "./hooks/useTemplates";
import { usePromptGenerator } from "./hooks/usePromptGenerator";
import { useAIProvider } from "./lib/aiProviderContext";
import { useAuth } from "./lib/authContext";
import { useOnboarding } from "./lib/onboardingContext";
import { Card, CardContent, CardHeader, CardAction } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Label } from "./components/ui/label";
import { Checkbox } from "./components/ui/checkbox";
import { Badge } from "./components/ui/badge";
import { Settings, Trash2, Bot, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { CustomPrompt, Template, PromptType } from "./types";
import { CombinedATSAnalysis } from "./components/CombinedATSAnalysis";

interface ATSScore {
  overall: number;
  keywordMatch: number;
  skillsAlignment: number;
  experienceMatch: number;
  formatCompliance: number;
  feedback: string[];
  missingKeywords: string[];
  recommendations: string[];
}

function App() {
  const { currentUser } = useAuth();
  const { resumeTemplates,
    coverLetterTemplates,
    customPrompts,
    addTemplate,
    addCustomPrompt,
    updateCustomPrompt,
    deleteCustomPrompt,
    setActivePrompt,
    getActivePrompt,
    resetTemplates  } = useTemplates();
  const { generateResumePrompt, generateCoverLetterPrompt } = usePromptGenerator();
  const { selectedModel } = useAIProvider();
  const { showOnboarding, completeOnboarding } = useOnboarding();
  const [promptType, setPromptType] = useState<PromptType>('resume');
  const [jobDescription, setJobDescription] = useState("");
  const [resumeContent, setResumeContent] = useState("");
  const [coverLetterTemplate, setCoverLetterTemplate] = useState("");
  const [hasOptionalInstructions, setHasOptionalInstructions] = useState(false);
  const [optionalInstructions, setOptionalInstructions] = useState("");
  const [useTemporaryResume, setUseTemporaryResume] = useState(false); const [generateLatex, setGenerateLatex] = useState<boolean>(true); const [fastCompile, setFastCompile] = useState(false); const [originalResumeContent, setOriginalResumeContent] = useState("");
  const [atsSuggestions, setAtsSuggestions] = useState<string[]>([]);
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
  const [missingKeywords, setMissingKeywords] = useState<string[]>([]);
  const [generatedResumeLatex, setGeneratedResumeLatex] = useState<string>("");  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(() => {
    if (!currentUser) return "no-selection";
    const userKey = `user_${currentUser.uid}`;
    const saved = localStorage.getItem(`${userKey}_selectedTemplateId`);
    return saved && saved !== "" ? saved : "no-selection";
  });
  const [selectedCoverLetterTemplateId, setSelectedCoverLetterTemplateId] = useState<string>(() => {
    if (!currentUser) return "no-selection";
    const userKey = `user_${currentUser.uid}`;
    const saved = localStorage.getItem(`${userKey}_selectedCoverLetterTemplateId`);
    return saved && saved !== "" ? saved : "no-selection";
  });
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);  const [activePrompts, setActivePrompts] = useState<Record<PromptType, string>>(() => {
    if (!currentUser) return { resume: '', coverLetter: '' };
    const userKey = `user_${currentUser.uid}`;
    return {
      resume: localStorage.getItem(`${userKey}_activePrompt_resume`) || '',
      coverLetter: localStorage.getItem(`${userKey}_activePrompt_coverLetter`) || ''
    };
  });
  // Persist user preferences
  useEffect(() => {
    if (!currentUser) return;
    const userKey = `user_${currentUser.uid}`;
    // Only save valid template IDs
    if (selectedTemplateId && selectedTemplateId !== "no-selection") {
      localStorage.setItem(`${userKey}_selectedTemplateId`, selectedTemplateId);
    }
  }, [currentUser, selectedTemplateId]);

  useEffect(() => {
    if (!currentUser) return;
    const userKey = `user_${currentUser.uid}`;
    // Only save valid template IDs
    if (selectedCoverLetterTemplateId && selectedCoverLetterTemplateId !== "no-selection") {
      localStorage.setItem(`${userKey}_selectedCoverLetterTemplateId`, selectedCoverLetterTemplateId);
    }  }, [currentUser, selectedCoverLetterTemplateId]);
  // Handle user changes - reset state when user changes
  useEffect(() => {
    if (currentUser) {
      // User logged in - load their saved preferences
      const userKey = `user_${currentUser.uid}`;
      const savedTemplateId = localStorage.getItem(`${userKey}_selectedTemplateId`);
      const savedCoverLetterTemplateId = localStorage.getItem(`${userKey}_selectedCoverLetterTemplateId`);
      const savedResumePrompt = localStorage.getItem(`${userKey}_activePrompt_resume`);
      const savedCoverLetterPrompt = localStorage.getItem(`${userKey}_activePrompt_coverLetter`);
      
      setSelectedTemplateId(savedTemplateId && savedTemplateId !== "" ? savedTemplateId : "no-selection");
      setSelectedCoverLetterTemplateId(savedCoverLetterTemplateId && savedCoverLetterTemplateId !== "" ? savedCoverLetterTemplateId : "no-selection");
      setActivePrompts({
        resume: savedResumePrompt || '',
        coverLetter: savedCoverLetterPrompt || ''
      });
    } else {
      // User logged out - reset to defaults
      setSelectedTemplateId("no-selection");
      setSelectedCoverLetterTemplateId("no-selection");
      setActivePrompts({ resume: '', coverLetter: '' });
    }
  }, [currentUser]); // Include full currentUser object

  // Reset ATS tracking when job description changes
  useEffect(() => {
    if (jobDescription && !originalResumeContent && resumeContent) {
      setOriginalResumeContent(resumeContent);
    }
  }, [jobDescription, originalResumeContent, resumeContent]);
  // Auto-update optional instructions when ATS suggestions or missing keywords change
  useEffect(() => {
    const instructionParts: string[] = [];

    // Add missing keywords first
    if (missingKeywords.length > 0) {
      instructionParts.push(`--- Missing Keywords to Include ---\nPlease ensure these important keywords are naturally incorporated into the resume: ${missingKeywords.join(', ')}`);
    }

    // Add ATS suggestions
    if (atsSuggestions.length > 0) {
      instructionParts.push(`--- ATS Improvement Suggestions ---\n${atsSuggestions.join('\n\n')}`);
    }

    if (instructionParts.length > 0) {
      const combinedInstructions = instructionParts.join('\n\n');

      if (hasOptionalInstructions) {
        // If user already has instructions, check if we need to update
        const hasKeywords = optionalInstructions.includes('Missing Keywords to Include');
        const hasSuggestions = optionalInstructions.includes('ATS Improvement Suggestions');

        if (!hasKeywords || !hasSuggestions) {
          setOptionalInstructions(prev => {
            // Remove existing ATS sections and add new combined instructions
            const updated = prev.replace(/--- Missing Keywords to Include ---[\s\S]*?(?=---|$)/g, '')
              .replace(/--- ATS Improvement Suggestions ---[\s\S]*?(?=---|$)/g, '')
              .trim();
            return updated ? `${updated}\n\n${combinedInstructions}` : combinedInstructions;
          });
        }
      } else {
        // Auto-enable optional instructions and set combined instructions
        setHasOptionalInstructions(true);
        setOptionalInstructions(combinedInstructions);
      }
    }
  }, [atsSuggestions, missingKeywords, hasOptionalInstructions, optionalInstructions]);
  const handleInitialATSAnalysis = useCallback((score: ATSScore) => {
    setInitialATSScore(score);
  }, []);

  const handleMissingKeywords = useCallback((keywords: string[]) => {
    setMissingKeywords(keywords);
  }, []);
  const handleLatexGenerated = useCallback((latex: string) => {
    setGeneratedResumeLatex(latex);
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
      // Use last used template or default
      const templateIdToUse = selectedTemplateId !== "no-selection" ? selectedTemplateId :
        (resumeTemplates.length > 0 ? resumeTemplates[0].id : "");

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
      const resumeTemplate = resumeTemplates.find(t => t.id === templateIdToUse);
      const resumeToUse = resumeTemplate?.resumeLatex || "";

      const prompt = generateResumePrompt({
        jobDescription,
        resumeContent: resumeToUse,
        templateId: templateIdToUse,
        showResumeInput: true,
        optionalInstructions: "Return the output as pure LaTeX code."
      });

      setGeneratedPrompt(prompt);
      if (!prompt.startsWith("Error:")) {
        toast.success("Superfast LaTeX resume prompt generated!");
      }
      return;
    }

    // Normal flow continues...
    // Get the selected resume template (shared for both resume and cover letter types)
    const resumeTemplate = resumeTemplates.find(t => t.id === selectedTemplateId);
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
    const template = resumeTemplates.find(t => t.id === templateId);
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
    setMissingKeywords([]);
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
        {/* AI Provider Status Display */}        <div className="mb-2">
          <Badge variant="outline" className="flex items-center gap-1 w-fit">
            <Bot className="h-3 w-3" />
            <span className="text-xs">AI Model:</span>
            <span className="text-xs font-medium">{selectedModel.name}</span>
            <Sparkles className="h-3 w-3" />
          </Badge>
        </div>
        
        <Card className="w-full shadow-none border-0">
          <CardHeader className="px-4 py-3">
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
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

            {/* Fast Compile toggle - only show for resume type */}
            {promptType === 'resume' && (
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="fastCompile"
                    checked={fastCompile}
                    onCheckedChange={(checked) => setFastCompile(checked as boolean)}
                  />
                  <Label htmlFor="fastCompile" className="text-xs cursor-pointer">
                    Fast Compile Mode
                  </Label>
                </div>
                <p className="text-xs text-gray-500 ml-5">
                  {fastCompile
                    ? "One-click: Generate prompt and LaTeX resume automatically"
                    : "Standard mode with manual template selection"}
                </p>
              </div>
            )}
            <JobDescriptionInput
              jobDescription={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />

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
                  templates={resumeTemplates}
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
                  // Fast Compile mode for resume - only need job description
                  false :
                  // Normal mode - need all the usual requirements
                  (!activePrompts[promptType] || activePrompts[promptType] === "placeholder" ||
                    (promptType === 'resume' && (!selectedTemplateId || selectedTemplateId === "no-selection")) ||
                    (promptType === 'coverLetter' && generateLatex && (!selectedCoverLetterTemplateId || selectedCoverLetterTemplateId === "no-selection")))
                )
              }
            >
              {fastCompile && promptType === 'resume'
                ? 'Fast Generate LaTeX Resume'
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
      </div>
      <SettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        customPrompts={customPrompts}
        activePrompts={activePrompts}
        onAddCustomPrompt={handleAddCustomPrompt}
        onUpdateCustomPrompt={handleUpdateCustomPrompt}
        onDeleteCustomPrompt={handleDeleteCustomPrompt}
        onSetActivePrompt={handleSetActivePrompt}
        resetTemplates={resetTemplates}
      />
    </div>
  );
}

export default App;
