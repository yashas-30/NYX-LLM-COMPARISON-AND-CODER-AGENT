// src/features/coder-agent/promptBuilders.ts

export interface CodeContext {
  detectedLanguages: string[];
  frameworks: string[];
  complexity: string;
  workspaceFiles?: string[];
  existingCode?: string;
  taskType: 'generate' | 'debug' | 'review' | 'refactor' | 'explain';
}

export function buildCoderSystemPrompt(
  modelId: string,
  context: CodeContext
): string {
  const parts: string[] = [];

  // Core identity
  parts.push(`You are NYX, an expert software engineering AI agent.`);

  // Task-specific instructions
  switch (context.taskType) {
    case 'generate':
      parts.push(`TASK: Write production-ready code.
Rules:
- Write clean, well-commented code
- Follow language-specific best practices and conventions
- Include error handling and edge cases
- Use modern syntax and patterns
- Provide the complete implementation, not just snippets
- If multiple files are needed, clearly mark each file with: === FILE: path/to/file.ext ===
- After code, briefly explain key design decisions`);
      break;

    case 'debug':
      parts.push(`TASK: Debug and fix code.
Rules:
- First, identify the root cause of the error
- Explain the bug clearly before providing the fix
- Provide the corrected code with comments explaining what changed
- Suggest preventive measures to avoid similar bugs`);
      break;

    case 'review':
      parts.push(`TASK: Code review.
Rules:
- Evaluate: correctness, performance, security, readability, maintainability
- Highlight strengths and weaknesses
- Suggest specific improvements with examples
- Rate the code 1-10 with justification`);
      break;

    case 'refactor':
      parts.push(`TASK: Refactor code.
Rules:
- Improve code quality without changing behavior
- Focus on: readability, performance, DRY principles, type safety
- Explain each refactoring decision
- Provide the complete refactored code`);
      break;

    case 'explain':
      parts.push(`TASK: Explain code.
Rules:
- Break down the code line by line or section by section
- Explain the "why" not just the "what"
- Use analogies for complex concepts
- Highlight potential issues or improvements`);
      break;
  }

  // Language-specific hints
  if (context.detectedLanguages.length > 0) {
    parts.push(`Primary language(s): ${context.detectedLanguages.join(', ')}`);

    for (const lang of context.detectedLanguages) {
      switch (lang.toLowerCase()) {
        case 'typescript':
        case 'ts':
          parts.push(`- Use strict TypeScript with explicit types\n- Prefer interfaces over types for object shapes\n- Use async/await, avoid callbacks`);
          break;
        case 'python':
        case 'py':
          parts.push(`- Follow PEP 8 style guide\n- Use type hints (PEP 484)\n- Prefer list comprehensions over map/filter where readable`);
          break;
        case 'rust':
        case 'rs':
          parts.push(`- Handle all Result/Option types explicitly\n- Use ownership correctly, minimize clones\n- Follow Rust API guidelines`);
          break;
      }
    }
  }

  // Framework hints
  if (context.frameworks.length > 0) {
    parts.push(`Frameworks: ${context.frameworks.join(', ')}`);
  }

  // Model-specific optimizations
  if (modelId.includes('qwen') && modelId.includes('coder')) {
    parts.push(`Note: You are a specialized coding model. Prioritize correctness over cleverness.`);
  }

  if (modelId.includes('deepseek')) {
    parts.push(`Note: Use chain-of-thought reasoning for complex algorithms, but keep it concise.`);
  }

  // Output format
  parts.push(`Output Format:
- Use markdown code blocks with language tags
- For multi-file output, use: === FILE: path === followed by code block
- Keep explanations separate from code blocks
- If uncertain about any part, mark it with [UNCERTAIN: description]`);

  return parts.join('\n\n');
}

export function buildCoderUserPrompt(
  rawPrompt: string,
  context: CodeContext,
  codebaseContext?: string,
  webSearchResults?: string
): string {
  let prompt = '';

  // Add codebase context if available
  if (codebaseContext) {
    prompt += `[CODEBASE CONTEXT]
${codebaseContext}
[END CONTEXT]

`;
  }

  // Add web search results if available
  if (webSearchResults) {
    prompt += `[RESEARCH]
${webSearchResults}
[END RESEARCH]

`;
  }

  // Add existing code if provided (for debug/review/refactor)
  if (context.existingCode) {
    prompt += `[EXISTING CODE]
\`\`\`${context.detectedLanguages[0] || ''}
${context.existingCode}
\`\`\`
[END CODE]

`;
  }

  // Add the actual user request
  prompt += `[REQUEST]
${rawPrompt}
[END REQUEST]`;

  return prompt;
}
