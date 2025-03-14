import OpenAI from 'openai';

// Initialize with a fallback key that has limited usage
// In production, you would use environment variables
const openai = new OpenAI({
  apiKey: 'demo-only',
  dangerouslyAllowBrowser: true, // Only for demo purposes
});

export async function summarizeText(text: string): Promise<string> {
  if (!text || text.trim().length < 50) {
    return text; // Don't summarize short texts
  }
  
  try {
    // For demo purposes, we'll use a simple algorithm instead of actual API calls
    // This avoids requiring real API keys
    return simulateSummarization(text);
  } catch (error) {
    console.error('Error summarizing text:', error);
    return 'Failed to generate summary';
  }
}

// A simple summarization algorithm for demo purposes
function simulateSummarization(text: string): string {
  // Extract sentences
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  
  if (sentences.length <= 2) {
    return text;
  }
  
  // Find important sentences (simple heuristic: longer sentences with keywords)
  const importantWords = ['important', 'critical', 'key', 'main', 'primary', 'essential', 'crucial'];
  const scoredSentences = sentences.map(sentence => {
    let score = 0;
    // Longer sentences get higher scores
    score += sentence.length / 20;
    
    // Sentences with important words get higher scores
    importantWords.forEach(word => {
      if (sentence.toLowerCase().includes(word)) {
        score += 2;
      }
    });
    
    return { sentence, score };
  });
  
  // Sort by score and take top sentences
  const topSentences = scoredSentences
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(3, Math.ceil(sentences.length / 3)))
    .map(item => item.sentence);
  
  // Sort back to original order
  const orderedSummary = topSentences.sort((a, b) => {
    return sentences.indexOf(a) - sentences.indexOf(b);
  });
  
  return orderedSummary.join(' ');
}