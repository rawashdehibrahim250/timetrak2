/**
 * Project patterns to match in descriptions
 */
const projectPatterns = [
  { pattern: /\b(website|web site|web development|frontend|front-end)\b/i, project: 'Website Development' },
  { pattern: /\b(mobile app|ios|android|react native)\b/i, project: 'Mobile App' },
  { pattern: /\b(database|db|sql|postgres|supabase)\b/i, project: 'Database' },
  { pattern: /\b(api|backend|back-end|server)\b/i, project: 'Backend' },
  { pattern: /\b(meeting|call|discussion|planning)\b/i, project: 'Meetings' },
  { pattern: /\b(design|ui|ux|figma|sketch)\b/i, project: 'Design' },
  { pattern: /\b(test|testing|qa|quality assurance)\b/i, project: 'Testing' },
  { pattern: /\b(documentation|docs|readme)\b/i, project: 'Documentation' },
  { pattern: /\b(research|learning|study)\b/i, project: 'Research' },
  { pattern: /\b(bug|fix|issue|problem)\b/i, project: 'Bug Fixes' },
];

/**
 * Suggest a project based on the description text
 * @param description The time entry description
 * @returns Suggested project name or null if no match
 */
export const suggestProject = (description: string): string | null => {
  if (!description) return null;
  
  for (const { pattern, project } of projectPatterns) {
    if (pattern.test(description)) {
      return project;
    }
  }
  
  return null;
};

/**
 * Get all available project names
 * @returns Array of project names
 */
export const getAvailableProjects = (): string[] => {
  return projectPatterns.map(p => p.project);
};

/**
 * Check if a project name is valid
 * @param project The project name to check
 * @returns True if the project is in the predefined list
 */
export const isValidProject = (project: string): boolean => {
  return getAvailableProjects().includes(project);
}; 