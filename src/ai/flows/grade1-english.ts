'use server';

import { z } from 'genkit';   // ← FIXED: was 'zod' — ai.defineFlow requires Genkit's z
import { ai } from '@/genkit';

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
      userId: z.string(),
    }),
    outputSchema: z.object({
      title: z.string(),
      content: z.string(),
      description: z.string(),
      assessmentCriteria: z.string(),
      successIndicators: z.array(z.string()),
    }),
  },
  async ({ materialType, userId }) => {
    const capsPrompt = `You are an expert South African Foundation Phase English teacher.

Generate **CAPS-aligned Grade 1 English materials** with clear assessment criteria.

**Material Type:** ${materialType}

**CAPS Assessment Requirements (Must Include):**
- Informal assessment through observation
- Use of concrete apparatus and manipulatives
- Differentiation for different ability levels
- Clear success criteria (what "meeting expectations" looks like)
- Simple rubric or checklist for teachers
- Links to CAPS Learning Outcomes for Home Language (Listening & Speaking, Reading & Phonics, Writing & Handwriting, Language Structure & Use)

**Output Requirements:**
- Child-friendly, engaging activities
- South African real-life contexts
- Teacher's Pet style (colourful, fun, simple)
- Include space for drawing, cutting, pasting where appropriate
- Generate content in **beautifully formatted HTML**. Do NOT use markdown. Do NOT use plain text.
- Use clean, semantic HTML with appropriate tags (e.g., <h1>, <p>, <ul>, <strong>, <em>, <table>) for formatting.
- Add emoji descriptions or simple visual cues within the HTML where appropriate.
- ALL HTML must use ONLY inline CSS styles — no class names, no external CSS.

Return ONLY valid JSON in this exact structure (no markdown, no code fences):
{
  "title": "string",
  "content": "string (full HTML content with activities and ALL inline CSS)",
  "description": "string",
  "assessmentCriteria": "string (detailed CAPS assessment guidance for teachers in HTML format)",
  "successIndicators": ["observable success criteria 1", "success criteria 2", "..."]
}`;

    let result;
    try {
      result = await ai.generate({
        model: 'googleai/gemini-3.1-pro-preview',
        prompt: capsPrompt,
        config: {
          temperature: 0.65,
          maxOutputTokens: 5000,
        },
      });
    } catch (err) {
      console.warn('Gemini 3.1 Pro failed for Grade 1 English, falling back to Flash...');
      result = await ai.generate({
        model: 'googleai/gemini-3-flash-preview',
        prompt: capsPrompt,
        config: {
          temperature: 0.7,
          maxOutputTokens: 4200,
        },
      });
    }

    if (!result.text) throw new Error('Grade 1 English generation returned empty text.');

    // Robust JSON parsing — strip markdown fences if present
    let cleanText = result.text.trim();
    if (cleanText.startsWith('```json')) cleanText = cleanText.slice(7);
    else if (cleanText.startsWith('```')) cleanText = cleanText.slice(3);
    if (cleanText.endsWith('```')) cleanText = cleanText.slice(0, -3);

    const output = JSON.parse(cleanText.trim());

    return {
      title: output.title || 'Grade 1 English Material',
      content: output.content || '',
      description: output.description || '',
      assessmentCriteria: output.assessmentCriteria || '',
      successIndicators: output.successIndicators || [],
    };
  }
);
