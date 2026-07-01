import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import type { ResumeProfile } from '@/types/resumeProfile';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export async function extractTextFromFile(file: File): Promise<string> {
  if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
    return extractFromPDF(file);
  }
  if (
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    file.name.endsWith('.docx')
  ) {
    return extractFromDOCX(file);
  }
  if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
    return file.text();
  }
  throw new Error('Unsupported file type. Please upload a PDF, DOCX, or TXT file.');
}

async function extractFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items = (content.items || []) as any[];
    let lastY = -1;
    let pageText = '';

    for (let j = 0; j < items.length; j++) {
      const item = items[j];
      if ('str' in item) {
        const y = item.transform[5];
        if (lastY !== -1 && Math.abs(y - lastY) > 5) {
          pageText += '\n';
        }
        pageText += item.str;
        if (item.hasEOL) pageText += '\n';
        lastY = y;
      }
    }
    pages.push(pageText);
  }

  return pages.join('\n\n--- PAGE BREAK ---\n\n');
}

async function extractFromDOCX(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

export interface ParsedResumeData {
  personal: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    location: string;
    linkedin?: string;
    website?: string;
  };
  experiences: ParsedExperience[];
  education: ParsedEducation[];
  projects: ParsedProject[];
  skills: ParsedSkillGroup[];
  certifications: string[];
  summary?: string;
}

interface ParsedExperience {
  id?: string;
  company: string;
  role: string;
  from: string;
  to: string;
  bullets: string[];
}

interface ParsedEducation {
  id?: string;
  school: string;
  degree: string;
  from: string;
  to: string;
  bullets: string[];
}

interface ParsedProject {
  id?: string;
  name: string;
  description: string;
  skills: string[];
}

interface ParsedSkillGroup {
  category: string;
  skills: string[];
}

export async function parseResumeWithAI(
  resumeText: string,
  makeAICall: (prompt: string) => Promise<string>
): Promise<ParsedResumeData> {
  const prompt = `You are an expert resume parser. Extract ALL information from this resume text and return it as structured JSON.

RESUME TEXT:
${resumeText}

CRITICAL INSTRUCTIONS:
1. Extract EVERY bullet point exactly as written — do NOT summarize or shorten them
2. Preserve the original wording of bullet points, just clean up formatting
3. Remove leading bullet chars (•, -, *, –) from the start of each bullet
4. For dates: convert to "YYYY-MM" format if possible (e.g. "Jan 2022" → "2022-01"), or keep as-is if only year given
5. "to" date should be "Present" if currently employed/enrolled
6. Split skills by commas if listed as a comma-separated string
7. If a section is missing or empty, return an empty array
8. For certifications: list each one as a plain string
9. Parse LinkedIn URLs: extract just the URL or profile path

Return ONLY this JSON, no other text:
{
  "personal": {
    "firstName": "",
    "lastName": "",
    "email": "",
    "phone": "",
    "location": "",
    "linkedin": "",
    "website": ""
  },
  "experiences": [
    {
      "company": "",
      "role": "",
      "from": "",
      "to": "",
      "bullets": ["bullet 1 text", "bullet 2 text"]
    }
  ],
  "education": [
    {
      "school": "",
      "degree": "",
      "from": "",
      "to": "",
      "bullets": ["GPA: 3.8", "Dean's List 2021-2022"]
    }
  ],
  "projects": [
    {
      "name": "",
      "description": "",
      "skills": ["React", "Node.js"]
    }
  ],
  "skills": [
    {
      "category": "Languages",
      "skills": ["Python", "TypeScript", "Java"]
    }
  ],
  "certifications": ["AWS Certified Developer", "Google Cloud Associate"],
  "summary": "optional professional summary if present in the resume"
}`;

  const raw = await makeAICall(prompt);

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI returned invalid response — could not extract JSON');

  try {
    const parsed = JSON.parse(jsonMatch[0]) as ParsedResumeData;
    return sanitizeParsedData(parsed);
  } catch {
    throw new Error('Failed to parse AI response as JSON');
  }
}

function sanitizeParsedData(data: ParsedResumeData): ParsedResumeData {
  return {
    ...data,
    personal: data.personal ?? {
      firstName: '', lastName: '', email: '', phone: '', location: '',
    },
    experiences: (data.experiences || []).map((e, i) => ({
      ...e,
      id: `exp-${i}-${Date.now()}`,
      bullets: Array.isArray(e.bullets) ? e.bullets.filter((b) => b.trim()) : [],
    })),
    education: (data.education || []).map((e, i) => ({
      ...e,
      id: `edu-${i}-${Date.now()}`,
      bullets: Array.isArray(e.bullets) ? e.bullets.filter((b) => b.trim()) : [],
    })),
    projects: (data.projects || []).map((p, i) => ({
      ...p,
      id: `proj-${i}-${Date.now()}`,
      skills: Array.isArray(p.skills) ? p.skills : [],
    })),
    skills: (data.skills || []).filter((sg) => sg.category && sg.skills?.length > 0),
    certifications: (data.certifications || []).filter((c) => c.trim()),
  };
}

export function mapParsedToProfile(parsed: ParsedResumeData): Partial<ResumeProfile> {
  return {
    firstName: parsed.personal.firstName,
    lastName: parsed.personal.lastName,
    email: parsed.personal.email,
    phone: parsed.personal.phone,
    location: parsed.personal.location,
    linkedin: parsed.personal.linkedin ?? '',
    website: parsed.personal.website ?? '',
    experiences: parsed.experiences.map((e) => ({
      id: e.id ?? crypto.randomUUID(),
      company: e.company,
      role: e.role,
      from: e.from,
      to: e.to,
      bullets: e.bullets,
    })),
    education: parsed.education.map((e) => ({
      id: e.id ?? crypto.randomUUID(),
      school: e.school,
      degree: e.degree,
      from: e.from,
      to: e.to,
      bullets: e.bullets,
    })),
    projects: parsed.projects.map((p) => ({
      id: p.id ?? crypto.randomUUID(),
      name: p.name,
      description: p.description,
      skills: p.skills,
    })),
    skills: parsed.skills,
    certifications: parsed.certifications,
    summary: parsed.summary,
  };
}
