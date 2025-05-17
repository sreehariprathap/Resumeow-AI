import { useEffect, useState } from "react";

export type Template = {
  id: string;
  name: string;
  content: string;
};

export function useTemplates() {
  const [resumeTemplates, setResumeTemplates] = useState<Template[]>([]);
  const [coverLetterTemplates, setCoverLetterTemplates] = useState<Template[]>([]);

  useEffect(() => {
    const resumeData = localStorage.getItem("resumeTemplates");
    const coverData = localStorage.getItem("coverLetterTemplates");

    if (resumeData) setResumeTemplates(JSON.parse(resumeData));
    if (coverData) setCoverLetterTemplates(JSON.parse(coverData));
  }, []);

  useEffect(() => {
    localStorage.setItem("resumeTemplates", JSON.stringify(resumeTemplates));
  }, [resumeTemplates]);

  useEffect(() => {
    localStorage.setItem("coverLetterTemplates", JSON.stringify(coverLetterTemplates));
  }, [coverLetterTemplates]);

  const addTemplate = (type: "resume" | "coverLetter", template: Template) => {
    if (type === "resume") {
      setResumeTemplates((prev) => [...prev, template]);
    } else {
      setCoverLetterTemplates((prev) => [...prev, template]);
    }
  };

  return {
    resumeTemplates,
    coverLetterTemplates,
    addTemplate,
  };
}
