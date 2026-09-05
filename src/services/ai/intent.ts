export type ConversationLanguage = 'hi' | 'en' | 'hinglish';
export type IntentMode = 'CONVERSATION' | 'QUESTION' | 'ACTION_REQUEST' | 'CLARIFICATION';

export function detectLanguage(prompt: string): ConversationLanguage {
  if (/[^\u0000-\u007f]/.test(prompt) && /[\u0900-\u097f]/.test(prompt)) return 'hi';
  if (/\b(meri|mera|wali|wala|bana|banao|karo|kar|isko|yeh|kholo|premium|kaise|ho|aaj|batao)\b/i.test(prompt)) return 'hinglish';
  return 'en';
}

export function isExplicitAction(prompt: string): boolean {
  return /\b(create|build|make|open|fix|change|update|improve|deploy|research|run|execute|delete|remove|bana|banao|banado|kholo|karo|kar do|premium bana)\b/i.test(prompt);
}

export function classifyIntent(prompt: string): IntentMode {
  const normalized = prompt.toLowerCase().trim();
  const isCasual = /^(hi|hello|hey|good morning|good evening|good night|thank you|thanks|okay|ok|achha|nice|namaste|kaise ho|how are you|what are you doing|tell me something|can you help me|yes|no|haan|nahi|same|continue)\b/i.test(normalized);
  const isAdviceQuestion = /\b(kaise|how)\b.*\b(improve|seo|better|learn|fix)\b/i.test(normalized);
  const isQuestion = /\b(what|why|how|when|where|who|can you|could you|kya|kyun|kaise|kab|kahan|kaun|explain|ideas|help me understand)\b/i.test(normalized) || /[?؟]$/.test(prompt);
  if (isCasual) return 'CONVERSATION';
  if (isAdviceQuestion || (isQuestion && !isExplicitAction(prompt))) return 'QUESTION';
  if (/\b(website|site|web)\b/i.test(prompt) && !/\b(gym|restaurant|salon|portfolio|real estate|agency|ecommerce)\b/i.test(prompt) && isExplicitAction(prompt)) return 'CLARIFICATION';
  return isExplicitAction(prompt) ? 'ACTION_REQUEST' : 'CONVERSATION';
}
