export function cleanLatexResponse(raw: string): string {
  return raw
    .replace(/^```(?:latex)?\n?/m, '')
    .replace(/\n?```$/m, '')
    .trim();
}
