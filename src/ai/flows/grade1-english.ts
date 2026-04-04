                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         'use server';

import { z } from 'zod';
import { ai } from '@/genkit';
// Removed explicit model import

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
      userId: z.string(), // Added userId for Firebase storage
    }),
    outputSchema: z.object({
      title: z.string(),
      content: z.string(),           // Now expecting rich HTML
      description: z.string(),       // Short summary
      assessmentCriteria: z.string(),   // New: CAPS-aligned assessment
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
- Use clean, semantic HTML with appropriate tags (e.g., <h1>, <p>, <ul>, <strong>, <em>, <table>, <img> if images are described) for formatting.
- Add emoji descriptions or simple visual cues within the HTML where appropriate, as no external images are embedded directly.

Return clean JSON only with this structure:
{
  "title": "string",
  "content": "string (full HTML content with activities)",
  "description": "string",
  "assessmentCriteria": "string (detailed CAPS assessment guidance for teachers in HTML format)",
  "successIndicators": ["observable success criteria 1", "success criteria 2", "..."]
}`;

    let result;
    try {
      result = await ai.generate({
        model: 'googleai/gemini-3.1-pro-preview', // Using gemini31Pro for CAPS content, as per chat.txt
        prompt: capsPrompt,
        config: { 
          temperature: 0.65, 
          maxOutputTokens: 5000,
          version: '3.1', // As requested in the prompt
          thinkingLevel: 'medium', // As requested in the prompt
        },
      });
    } catch (err) {
      console.warn('Gemini 3.1 Pro failed, falling back to Flash...');
      result = await ai.generate({
        model: 'googleai/gemini-3-flash-preview', // Fallback to gemini-flash-latest
        prompt: capsPrompt,
        config: { 
          temperature: 0.7, 
          maxOutputTokens: 4200,
          version: '3.1',
          thinkingLevel: 'medium',
        },
      });
    }

    if (!result.text) throw new Error("Gemini returned empty text");
    const output = JSON.parse(result.text);

    // TODO: Save to Firebase with CAPS metadata (add Firebase import and logic)
    // For now, returning the output directly

    return {
      ...output,
      // docId: docRef.id, // Uncomment when Firebase saving is implemented
    };
  }
);