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
  {
    id: 'iiit_vadodara',
    label: 'IIIT Vadodara',
    previewUrl: '/templates/iiit_vadodara/iiit_vadodara.jpg',
    texUrl: '/templates/iiit_vadodara/iiit_vadodara.tex',
  },
  {
    id: 'jing_wang',
    label: 'Jing Wang',
    previewUrl: '/templates/jing_wang/jing_wang.jpg',
    texUrl: '/templates/jing_wang/jing_wang.tex',
  },
  {
    id: 'northeastern',
    label: 'Northeastern',
    previewUrl: '/templates/northeastern/northeastern.jpg',
    texUrl: '/templates/northeastern/northeastern.tex',
  },
  {
    id: 'sakshi',
    label: 'Sakshi',
    previewUrl: '/templates/sakshi/sakshi.jpg',
    texUrl: '/templates/sakshi/sakshi.tex',
  },
  {
    id: 'kieren',
    label: 'Kieren',
    previewUrl: '/templates/kieren/kieren.jpg',
    texUrl: '/templates/kieren/kieren.tex',
  },
];

export async function fetchTemplateTex(texUrl: string): Promise<string> {
  const res = await fetch(texUrl);
  if (!res.ok) throw new Error(`Failed to load template: ${texUrl}`);
  return res.text();
}
