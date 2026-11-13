// Saved templates: a result worth reusing, with the parts that change marked as
// {{variables}}. The variables are read from the content itself rather than stored
// beside it, so a template can never drift out of step with its own placeholders.

export const TEMPLATE_VARIABLE = /\{\{\s*([^{}\n]{1,60}?)\s*\}\}/g;
export const MAX_TEMPLATE_VARIABLES = 20;

/** Every distinct {{variable}} in a template, in the order it first appears. */
export function templateVariables(content: string): string[] {
  const found: string[] = [];
  for (const match of content.matchAll(TEMPLATE_VARIABLE)) {
    const name = match[1].trim();
    if (name && !found.includes(name)) found.push(name);
    if (found.length >= MAX_TEMPLATE_VARIABLES) break;
  }
  return found;
}

/**
 * Fills a template. A variable with no value keeps its placeholder, so an
 * unfinished template is obvious on the page instead of leaving a silent gap.
 */
export function applyTemplate(content: string, values: Record<string, string>): string {
  return content.replace(TEMPLATE_VARIABLE, (placeholder, rawName: string) => {
    const value = values[rawName.trim()];
    return value === undefined || value === '' ? placeholder : value;
  });
}

/** A template is ready to use when every variable it declares has a value. */
export function missingVariables(content: string, values: Record<string, string>): string[] {
  return templateVariables(content).filter(name => !values[name]?.trim());
}
