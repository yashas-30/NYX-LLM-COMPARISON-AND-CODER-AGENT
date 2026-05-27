// src/features/chat-agent/promptBuilders.ts

export interface ChatContext {
  userName?: string;
  conversationTone: 'casual' | 'professional' | 'technical';
  detectedLanguage: string;
  topicDomain?: string;
  previousMessages: number;
}

export function buildChatSystemPrompt(
  modelId: string,
  context: ChatContext
): string {
  const parts: string[] = [];

  // Core identity
  parts.push(`You are NYX, an intelligent AI assistant.`);

  // Personality based on tone
  switch (context.conversationTone) {
    case 'casual':
      parts.push(`Personality: Warm, friendly, and conversational. Use natural language, occasional humor, and emojis where appropriate. Avoid overly formal structures.`);
      break;
    case 'professional':
      parts.push(`Personality: Professional, concise, and direct. Use clear structure with bullet points when helpful. Maintain a respectful, business-appropriate tone.`);
      break;
    case 'technical':
      parts.push(`Personality: Precise, technical, and thorough. Use accurate terminology. Provide depth when asked, but keep initial responses concise unless detail is requested.`);
      break;
  }

  // Response style rules
  parts.push(`Response Rules:
- Answer directly without unnecessary preamble
- If unsure, say "I'm not certain about that" rather than guessing
- For complex topics, provide a brief summary first, then offer to elaborate
- Use markdown formatting for readability
- Keep responses under 300 words unless the user asks for detail
- Match the user's language: respond in ${context.detectedLanguage}`);

  // Model-specific optimizations
  if (modelId.includes('deepseek')) {
    parts.push(`Note: You have strong reasoning capabilities. Use step-by-step thinking for complex questions, but keep the reasoning brief and focused.`);
  }

  if (modelId.includes('phi')) {
    parts.push(`Note: You excel at math and logic. For numerical questions, show your work clearly.`);
  }

  return parts.join('\n\n');
}

export function buildChatUserPrompt(
  rawPrompt: string,
  context: ChatContext,
  webSearchResults?: string
): string {
  let prompt = rawPrompt;

  // Add web search context if available
  if (webSearchResults) {
    prompt = `[WEB SEARCH RESULTS]
${webSearchResults}
[END SEARCH]

${prompt}`;
  }

  // Add language hint if non-English detected
  if (context.detectedLanguage.toLowerCase() !== 'english') {
    prompt += `\n\n(Respond in ${context.detectedLanguage})`;
  }

  return prompt;
}
