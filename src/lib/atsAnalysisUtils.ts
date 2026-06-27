import type { ATSSuggestion } from '@/hooks/useAIService';

const SKILL_PATTERN = /\b(?:python|javascript|react|node\.js|sql|aws|docker|kubernetes|git|agile|scrum|java|c\+\+|html|css|machine learning|data analysis|project management|leadership|communication|teamwork|problem solving|analytical|technical|programming|development|software|database|cloud|api|framework|library|testing|debugging|optimization)\b/gi;

function hasKeySkillsSuggestion(suggestions: ATSSuggestion[]): boolean {
  return suggestions.some(s =>
    s.suggestion.toLowerCase().includes('key skills') ||
    s.suggestion.toLowerCase().includes('essential skills') ||
    (s.suggestion.toLowerCase().includes('incorporate') && s.suggestion.toLowerCase().includes('skills')) ||
    (s.category.toLowerCase() === 'skills & technologies' && s.suggestion.toLowerCase().includes('add'))
  );
}

export function ensureKeySkillsSuggestion(
  suggestions: ATSSuggestion[],
  jobDescription: string
): ATSSuggestion[] {
  if (hasKeySkillsSuggestion(suggestions)) return suggestions;

  const skillKeywords = jobDescription.toLowerCase().match(SKILL_PATTERN) ?? [];
  const uniqueSkills = [...new Set(skillKeywords)].slice(0, 5);
  const skillsText = uniqueSkills.length > 0
    ? `key skills (such as ${uniqueSkills.join(', ')}) `
    : 'key skills ';

  const keySkillsSuggestion: ATSSuggestion = {
    id: 'key-skills-natural',
    category: 'Skills & Technologies',
    suggestion: `Add all ${skillsText}from the job description naturally throughout your resume, particularly in the skills section, experience descriptions, and summary to improve keyword matching and ATS compatibility.`,
    impact: 'high',
    selected: true,
  };

  return [keySkillsSuggestion, ...suggestions];
}
