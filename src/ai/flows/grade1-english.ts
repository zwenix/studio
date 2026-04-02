'use server';

import { z } from 'zod';
import { ai } from '@/genkit';
import { googleAI } from '@genkit-ai/google-genai';

export const generateGrade1English = ai.defineFlow(
  {
    name: 'generateGrade1English',
    inputSchema: z.object({
      materialType: z.enum([
        'phonicsBook',
        'readingComprehensionA',
        'spellingTr',
        'displayPack',
        'improvementTracker',
        'handwritingSheet',
        'abcBooklet',
        'classroomLabels',
      ]),
    }),
    outputSchema: z.object({
      title: z.string(),
      content: z.string(),           // Rich markdown
      description: z.string(),       // Short summary
    }),
  },
  async ({ materialType }) => {
    const prompt = `You are a master Foundation Phase teacher in South Africa. 
Generate **high-quality, CAPS-aligned Grade 1 English materials** in a colourful, child-friendly, Teacher's Pet style.

Material: ${materialType}

Requirements:
- Use very simple language suitable for Grade 1.
- Lots of repetition and phonics focus.
- Colourful, engaging layout descriptions.
- Include activities, tracing, matching, drawing spaces.
- Use markdown with headings, bullet points, tables where needed.
- Add emoji and simple ASCII art for visual appeal since no external images.

Return clean JSON only with this structure:
{
  "title": "string",
  "content": "string (markdown)",
  "description": "string"
}`;

    // Try Gemini Primary
    try {
      const result = await ai.generate({
        model: googleAI.model('gemini-1.5-flash-latest'), // Using primary Gemini
        prompt,
        config: { temperature: 0.75, maxOutputTokens: 4000 },
        output: { format: 'json' },
      });

      if (!result.text) throw new Error("Gemini returned empty text");
      return JSON.parse(result.text);

    } catch (err) {
      console.warn('Gemini failed, falling back to Groq Llama 3...', err);
      
      // Fallback to Groq Llama 3 70B
      try {
        const groqResult = await ai.generate({
          model: 'groq/llama3-70b-8192', // Genkitx-Groq standard alias
          prompt,
          config: { temperature: 0.7 },
          output: { format: 'json' },
        });
        
        if (!groqResult.text) throw new Error("Groq returned empty text");
        return JSON.parse(groqResult.text);

      } catch (groqErr) {
        console.error("Groq fallback also failed", groqErr);
        throw new Error("Failed to generate content with both Gemini and Groq.");
      }
    }
  }
);
