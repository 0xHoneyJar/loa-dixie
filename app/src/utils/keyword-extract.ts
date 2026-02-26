/**
 * Shared keyword extraction utility.
 * Used by CollectiveInsightService and MeetingGeometryRouter.
 * @since cycle-013
 */

const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'of', 'to', 'in',
  'for', 'on', 'with', 'at', 'by', 'from', 'and', 'or', 'but', 'not',
  'this', 'that', 'it', 'be', 'has', 'have', 'had', 'do', 'does',
  'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can',
  'shall',
]);

const MIN_KEYWORD_LENGTH = 3;

export function extractKeywords(text: string): string[] {
  const words = text
    .toLowerCase()
    .split(/[\s\W_]+/)
    .filter((w) => w.length >= MIN_KEYWORD_LENGTH && !STOPWORDS.has(w));
  return [...new Set(words)];
}
