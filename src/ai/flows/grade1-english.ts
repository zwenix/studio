// src/ai/flows/grade1-english.ts
import { defineFlow } from '@genkit-ai/flow';
import { googleAI, geminiProLatest, geminiFlashLatest } from '@genkit-ai/google-genai';
import { z } from 'zod';
import { db } from '@/lib/firebase'; // Your Firebase config
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export const generateGrade1English = defineFlow(
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
    }),
  },
  async ({ materialType, userId }) => {
    const prompt = `You are a highly experienced South African Foundation Phase educator.
Generate **beautiful, CAPS-aligned Grade 1 English materials** in a vibrant, child-friendly style with Teacher's Pet Font aesthetic.

Material Type: ${materialType}

Requirements:
- Extremely engaging and age-appropriate for 6-7 year olds
- Use simple, repetitive language
- Include activities, tracing, matching, colouring spaces
- Rich markdown formatting with headings, tables, bullet points
- Add emojis and simple visual descriptions

Return clean JSON only.`;

    // Gemini 3.1 Pro (Best quality) with Flash fallback
    let result;
    try {
      result = await geminiProLatest.generate({
        prompt,
        config: { temperature: 0.75, maxOutputTokens: 5000 },
      });
    } catch (err) {
      console.warn('Gemini Pro failed, falling back to Flash...');
      result = await geminiFlashLatest.generate({
        prompt,
        config: { temperature: 0.8, maxOutputTokens: 4000 },
      });
    }

    const output = JSON.parse(result.text);

    // Save to Firebase automatically
    const docRef = await addDoc(collection(db, 'generatedContent'), {
      userId,
      type: materialType,
      title: output.title,
      content: output.content,
      description: output.description,
      createdAt: serverTimestamp(),
      modelUsed: 'gemini-pro-latest',
    });

    return {
      ...output,
      docId: docRef.id,
    };
  }
);