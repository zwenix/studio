'use server';
/**
 * General Content Generator
 * Migrated from Genkit / Groq-primary to Anthropic-primary with Groq failover.
 * All prompt logic preserved verbatim.
 */

import { generateJSON } from '@/lib/ai';

export type GeneralContentInput = {
  grade:        string;
  subject:      string;
  topic:        string;
  contentType?: string;
};

export type GeneralContentOutput = {
  title:   string;
  content: string;
};

export async function generateGeneralContent(
  input: GeneralContentInput
): Promise<GeneralContentOutput> {
  const systemPrompt = `You are an expert South African teacher. Generate high-quality CAPS-aligned educational content.
Return ONLY valid JSON with keys: title (string) and content (string with full markdown).
No code fences, no extra text outside the JSON.`;

  const userPrompt = `Generate ${input.contentType || 'general educational material'} for Grade ${input.grade} ${input.subject} on the topic "${input.topic}".
Requirements:
- Use simple, child-friendly language appropriate for the grade.
- Make it engaging and printable.
- Include activities, questions, or exercises where appropriate.
- Use markdown formatting (headings, lists, tables).`;

  return generateJSON<GeneralContentOutput>(userPrompt, systemPrompt, {
    maxTokens: 3500,
    temperature: 0.7,
  });
}

export default generateGeneralContent;
