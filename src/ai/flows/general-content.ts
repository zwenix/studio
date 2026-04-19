// src/ai/flows/general-content.ts
import { defineFlow } from '@genkit-ai/core';
import { geminiProLatest } from '@genkit-ai/core';
import { groqLlama31_70b } from '@genkit-ai/core';
import { z } from 'zod';

export const generateGeneralContent = defineFlow(
  {
    name: 'generateGeneralContent',
    inputSchema: z.object({
      grade: z.string(),
      subject: z.string(),
      topic: z.string(),
      contentType: z.string().optional(), // worksheet, lesson plan, quiz, etc.
    }),
    outputSchema: z.object({
      title: z.string(),
      content: z.string(),
    }),
  },
  async ({ grade, subject, topic, contentType }) => {
    const prompt = `You are an expert South African teacher. Generate high-quality CAPS-aligned educational content for Grade ${grade} \( {subject} on the topic " \){topic}".

Content type: ${contentType || 'general educational material'}

Requirements:
- Use simple, child-friendly language.
- Make it engaging and printable.
- Include activities, questions, or exercises where appropriate.
- Use markdown formatting (headings, lists, tables).
- Return **only valid JSON** in this format: {"title": "...", "content": "full markdown here"}

Do not add any extra text outside the JSON.`;

    // Groq Primary (faster + stronger for structured output)
    try {
      const result = await groqLlama31_70b.generate({
        prompt,
        config: { temperature: 0.7, maxTokens: 3500 },
      });

      const parsed = JSON.parse(result.text);
      return parsed;
    } catch (err) {
      console.warn('Groq failed, trying Gemini...');
      
      // Gemini Fallback
      const result = await gemini15Flash.generate({
        prompt,
        config: { temperature: 0.7, maxOutputTokens: 3500 },
      });

      try {
        return JSON.parse(result.text);
      } catch {
        // Last resort: clean the output
        const cleaned = result.text.replace(/```json|```/g, '').trim();
        return JSON.parse(cleaned);
      }
    }
  }
);