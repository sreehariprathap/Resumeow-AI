export interface ResumeTemplate {
  id: string;
  label: string;
  previewUrl: string;
  texUrl: string;
}

export const RESUME_TEMPLATES: ResumeTemplate[] = [
  {
    id: 'sreehari',
    label: 'Sreehari',
    previewUrl: '/templates/sreehari/sreehari.jpg',
    texUrl: '/templates/sreehari/sreehari.tex',
  },
  {
    id: 'akshay',
    label: 'Akshay',
    previewUrl: '/templates/akshay/akshay.jpg',
    texUrl: '/templates/akshay/akshay.tex',
  },
  {
    id: 'mohamed',
    label: 'Mohamed',
    previewUrl: '/templates/mohamed/mohamed.jpg',
    texUrl: '/templates/mohamed/mohamed.tex',
  },
  {
    id: 'johnsnow',
    label: 'John Snow',
    previewUrl: '/templates/johnsnow/johnsnow.jpg',
    texUrl: '/templates/johnsnow/johnsnow.tex',
  },
  {
    id: 'mbzuai',
    label: 'MBZUAI',
    previewUrl: '/templates/mbzuai/mbzuai.jpg',
    texUrl: '/templates/mbzuai/mbzuai.tex',
  },
];

export async function fetchTemplateTex(texUrl: string): Promise<string> {
  const res = await fetch(texUrl);
  if (!res.ok) throw new Error(`Failed to load template: ${texUrl}`);
  return res.text();
}
