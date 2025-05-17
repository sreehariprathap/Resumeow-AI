import { useState, useEffect } from "react";
import "./App.css";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusCircle, Copy } from "lucide-react";

type PromptType = "resume" | "coverLetter";
type Template = {
  id: string;
  name: string;
  content: string;
};

function App() {
  const [promptType, setPromptType] = useState<PromptType>("resume");
  const [jobDescription, setJobDescription] = useState("");
  const [resumeContent, setResumeContent] = useState("");
  const [showResumeInput, setShowResumeInput] = useState(false);
  const [hasOptionalInstructions, setHasOptionalInstructions] = useState(false);
  const [optionalInstructions, setOptionalInstructions] = useState("");
  const [resumeTemplates, setResumeTemplates] = useState<Template[]>([]);
  const [coverLetterTemplates, setCoverLetterTemplates] = useState<Template[]>(
    []
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [showAddTemplateDialog, setShowAddTemplateDialog] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateContent, setNewTemplateContent] = useState("");
  const [generatedPrompt, setGeneratedPrompt] = useState("");

  // Get templates from localStorage on initial load
  useEffect(() => {
    const savedResumeTemplates = localStorage.getItem("resumeTemplates");
    const savedCoverLetterTemplates = localStorage.getItem(
      "coverLetterTemplates"
    );

    if (savedResumeTemplates) {
      setResumeTemplates(JSON.parse(savedResumeTemplates));
    }

    if (savedCoverLetterTemplates) {
      setCoverLetterTemplates(JSON.parse(savedCoverLetterTemplates));
    }
  }, []);

  // Save templates to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("resumeTemplates", JSON.stringify(resumeTemplates));
  }, [resumeTemplates]);

  useEffect(() => {
    localStorage.setItem(
      "coverLetterTemplates",
      JSON.stringify(coverLetterTemplates)
    );
  }, [coverLetterTemplates]);

  const addTemplate = () => {
    if (!newTemplateName.trim() || !newTemplateContent.trim()) return;

    const newTemplate: Template = {
      id: Date.now().toString(),
      name: newTemplateName,
      content: newTemplateContent,
    };

    if (promptType === "resume") {
      setResumeTemplates([...resumeTemplates, newTemplate]);
      if (resumeTemplates.length === 0) {
        setSelectedTemplateId(newTemplate.id);
      }
    } else {
      setCoverLetterTemplates([...coverLetterTemplates, newTemplate]);
      if (coverLetterTemplates.length === 0) {
        setSelectedTemplateId(newTemplate.id);
      }
    }
    setNewTemplateName("");
    setNewTemplateContent("");
    setShowAddTemplateDialog(false);
  };

  const generateResumePrompt = () => {
    if (!jobDescription || !selectedTemplateId) return;

    const resumeTemplate = resumeTemplates.find(
      (t) => t.id === selectedTemplateId
    );
    const resumeBody =
      showResumeInput && resumeContent.trim()
        ? resumeContent.trim()
        : resumeTemplate?.content || "-- YOUR RESUME GOES HERE --";

    const tailoringInstructions = `
Assume you are resume tailoring expert with 10 years of experience in crafting ATS Friendly resumes, that beats the ATS and makes it interesting for human recruiters.
Based on the above job description, tailor the following resume in such a way that:
- we have more than 90% keyword matching for ATS (all relevant skills must be present in resume)
- sound simple and appealing for human recruiters (they should feel like I will be a good match)
- resume looks sane and not over exaggerated
- summary should not exceed three lines
- add relevant skills (keep the skills count same by removing less relevant if any, make sure all hard and soft skills are added)
- stick to the same pattern and format
- don't mention the company name in summary
- modify the experience bullet points to incorporate major skills required
- do not modify the projects but tailor description based on the job requirement
- please don't modify the resume directly, but tell me how I can modify by making small changes and making it a good matching resume
- if the location is in Canada, change my location to that place 
- I recommend having the exact title of the job for which you're applying in your resume
- match the skills in your resume to the exact spelling in the job description
- prioritize skills that appear most frequently in the job description
- showcase the soft skills required for this job in the soft skills category in skills section
- if the required experience is more than 7 years, put 5+ years as experience
- if the required experience is more than 5 years, put 4+ years as experience
- if the required experience is 4 years, put 4 years as experience
- if it is for a junior level and with experience from 0–5 years, put 3+ years as experience
`.trim();

    let finalPrompt = `
Job Description:
${jobDescription.trim()}

${tailoringInstructions}

Resume:
${resumeBody}
`.trim();

    // Optional instructions (if provided)
    if (hasOptionalInstructions && optionalInstructions.trim()) {
      finalPrompt += `

Additional Instructions:
${optionalInstructions.trim()}`;
    }

    setGeneratedPrompt(finalPrompt);
  };

  const generateCoverLetterPrompt = () => {
    if (!jobDescription || !selectedTemplateId) return

    const coverTemplate = coverLetterTemplates.find(t => t.id === selectedTemplateId)
    const resumeBody = showResumeInput && resumeContent.trim()
      ? resumeContent.trim()
      : coverTemplate?.content || '-- YOUR RESUME GOES HERE --'

    const coverPrompt = `
Write a personalized, engaging cover letter for the job below using the resume and additional instructions provided. Follow a semi-formal tone (not too corporate, not too casual), avoid em dashes, and structure the letter based on the format and principles outlined below.

1. Job Description:
${jobDescription.trim()}

2. Resume:
${resumeBody}

3. Optional Instructions (if any):
${hasOptionalInstructions && optionalInstructions.trim() ? optionalInstructions.trim() : 'N/A'}

- try to mention portfolio, where there are a bunch of work that you have done, and github (don't give links or mention project names)
- mention willingness to move and make friends
- if I am lacking any specific skills, mention similar things that are almost good that will help me pick up the missing skills as I am a very good learner
- do not use long dashes em dashes at all

🧩 Instructions for AI (based on image analysis):

Start with at least two of the following: who I am, what I want, and what I believe in.
Use a clear transition that explains past achievements with measurable impact.

Include a summary statement that’s specific and quantified. Avoid vague words like “helped” or “worked on” unless followed by specifics.
Match your language to the job description (mirror terms and phrasing).

Use this structure:
Intro Statement: Who you are + what you want + belief if relevant.
Transition: Summary of key achievement(s) with metrics if possible.
Body Paragraphs:

Pick 2–3 themes (e.g., curiosity, leading people, taking initiative).
Follow this 4-part format for each:
Theme
Context
What did you do?
Why it matters (outcome or growth)

Why this company: Show alignment with their mission, product, or values.
Conclusion: Wrap up with enthusiasm, availability, and next steps.

End with a friendly sign-off (e.g., "Thanks, [Your Name]")
`.trim()

    setGeneratedPrompt(coverPrompt)
  }


  const copyPrompt = () => {
    navigator.clipboard
      .writeText(generatedPrompt)
      .then(() => {
        alert("Prompt copied to clipboard!");
      })
      .catch((err) => {
        console.error("Failed to copy: ", err);
      });
  };

  const handleTypeChange = (value: string) => {
    setPromptType(value as PromptType);
    setSelectedTemplateId("");
  };

  const currentTemplates =
    promptType === "resume" ? resumeTemplates : coverLetterTemplates;

  return (
    <div className="w-[400px] h-[600px] overflow-auto p-2">
      <Card className="w-full shadow-none border-0">
        <CardHeader className="px-4 py-3">
          <CardTitle className="text-lg">Prompt Generator</CardTitle>
          <CardDescription className="text-xs">
            Generate tailored prompts for resumes and cover letters
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 px-4 py-3">
          {/* Prompt Type Selection */}
          <div className="space-y-1">
            <label className="text-xs font-medium">Choose Prompt Type:</label>
            <RadioGroup
              value={promptType}
              onValueChange={handleTypeChange}
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="resume" id="resume" />
                <label htmlFor="resume" className="text-sm">
                  Resume
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="coverLetter" id="coverLetter" />
                <label htmlFor="coverLetter" className="text-sm">
                  Cover Letter
                </label>
              </div>
            </RadioGroup>
          </div>{" "}
          {/* Job Description */}
          <div className="space-y-1">
            <label className="text-xs font-medium">Job Description:</label>
            <div className="h-28 overflow-y-auto border rounded-md">
              <Textarea
                placeholder="Paste the job description here"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="text-sm w-full h-full resize-none border-0"
              />
            </div>
          </div>
          {/* Resume Content Checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="showResume"
              checked={showResumeInput}
              onCheckedChange={(checked) =>
                setShowResumeInput(checked === true)
              }
              className="h-3 w-3"
            />
            <label htmlFor="showResume" className="text-xs font-medium">
              Show resume input
            </label>
          </div>
          {/* Resume Content (conditional) */}
          {showResumeInput && (
            <div className="space-y-1">
              <label className="text-xs font-medium">Resume Content:</label>
              <div className="h-28 overflow-y-auto border rounded-md">
                <Textarea
                  placeholder="Paste your resume content here"
                  value={resumeContent}
                  onChange={(e) => setResumeContent(e.target.value)}
                  className="text-sm w-full h-full resize-none border-0"
                />
              </div>
            </div>
          )}
          {/* Template Selection */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-xs font-medium">
                {promptType === "resume"
                  ? "Resume Template:"
                  : "Cover Letter Template:"}
              </label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddTemplateDialog(true)}
                className="flex items-center gap-1 h-6 px-2"
              >
                <PlusCircle className="h-3 w-3" />
                <span className="text-xs">Add Template</span>
              </Button>
            </div>

            {currentTemplates.length > 0 ? (
              <Select
                value={selectedTemplateId}
                onValueChange={setSelectedTemplateId}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {currentTemplates.map((template) => (
                    <SelectItem
                      key={template.id}
                      value={template.id}
                      className="text-sm"
                    >
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-xs text-muted-foreground">
                No templates available. Click the + button to add one.
              </p>
            )}
          </div>
          {/* Optional Instructions */}
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="instructions"
                checked={hasOptionalInstructions}
                onCheckedChange={(checked) =>
                  setHasOptionalInstructions(checked === true)
                }
                className="h-3 w-3"
              />
              <label htmlFor="instructions" className="text-xs font-medium">
                Include optional instructions
              </label>
            </div>
            {hasOptionalInstructions && (
              <div className="h-20 overflow-y-auto border rounded-md">
                <Textarea
                  placeholder="Add any optional instructions here"
                  value={optionalInstructions}
                  onChange={(e) => setOptionalInstructions(e.target.value)}
                  className="text-sm w-full h-full resize-none border-0"
                />
              </div>
            )}
          </div>
          {/* Generate Prompt Button */}
          <Button
            onClick={() => {
              if (promptType === 'resume') {
                generateResumePrompt()
              } else {
                generateCoverLetterPrompt()
              }
            }}
            className="w-full h-8 text-sm"
          >
            Generate Prompt
          </Button>
          {/* Generated Prompt */}
          {generatedPrompt && (
            <div className="space-y-1 pt-2">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium">Generated Prompt:</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyPrompt}
                  className="flex items-center gap-1 h-6 px-2"
                >
                  <Copy className="h-3 w-3" />
                  <span className="text-xs">Copy</span>
                </Button>
              </div>{" "}
              <div className="border rounded-md bg-muted/20 h-32">
                <div className="h-full overflow-y-auto px-2 py-1">
                  <pre className="text-xs whitespace-pre-wrap">
                    {generatedPrompt}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>{" "}
      {/* Add Template Dialog */}
      {showAddTemplateDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-[350px] max-h-[400px] overflow-hidden shadow-md">
            <CardHeader className="px-4 py-2">
              <CardTitle className="text-base">Add New Template</CardTitle>
              <CardDescription className="text-xs">
                Create a new{" "}
                {promptType === "resume" ? "resume" : "cover letter"} template
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 px-4 py-2">
              <div className="space-y-1">
                <label className="text-xs font-medium">Template Name:</label>
                <Input
                  placeholder="Enter template name"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>{" "}
              <div className="space-y-1">
                <label className="text-xs font-medium">Template Content:</label>
                <div className="h-40 overflow-y-auto border rounded-md">
                  <Textarea
                    placeholder="Enter template content"
                    value={newTemplateContent}
                    onChange={(e) => setNewTemplateContent(e.target.value)}
                    className="text-sm w-full h-full resize-none border-0"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end space-x-2 px-4 py-3">
              <Button
                variant="outline"
                onClick={() => setShowAddTemplateDialog(false)}
                className="h-7 text-xs"
              >
                Cancel
              </Button>
              <Button onClick={addTemplate} className="h-7 text-xs">
                Save Template
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}

export default App;
