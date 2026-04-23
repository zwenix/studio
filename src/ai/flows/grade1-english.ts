'use server';
/**
 * Grade 1 English Material Generator
 * Migrated from Genkit ai.defineFlow → direct Anthropic + Groq via @/lib/ai.
 * All CAPS prompts and output shape preserved verbatim.
 */

import { generateJSON } from '@/lib/ai';

export type Grade1EnglishMaterialType =
  | 'phonicsBook'
  | 'readingComprehensionA'
  | 'spellingTr'
  | 'displayPack'
  | 'improvementTracker'
  | 'handwritingSheet'
  | 'abcBooklet'
  | 'classroomLabels';

export type Grade1EnglishInput = {
  materialType: Grade1EnglishMaterialType;
  userId:       string;
};

export type Grade1EnglishOutput = {
  title:              string;
  content:            string;
  description:        string;
  assessmentCriteria: string;
  successIndicators:  string[];
};

const SYSTEM_PROMPT = `You are an expert South African Foundation Phase English teacher.

Generate **CAPS-aligned Grade 1 English materials** with clear assessment criteria.

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

Return ONLY a JSON object with these exact keys:
{
  "title": "string",
  "content": "string (HTML)",
  "description": "string",
  "assessmentCriteria": "string",
  "successIndicators": ["string", ...]
}
No code fences. No extra text.`;

export async function generateGrade1English(
  input: Grade1EnglishInput
): Promise<Grade1EnglishOutput> {
  const userPrompt = `Material Type: ${input.materialType}

Generate a complete, classroom-ready Grade 1 English resource of this type.
Include all CAPS requirements listed in your instructions.
The HTML content must be beautiful, colourful, and immediately printable.`;

  return generateJSON<Grade1EnglishOutput>(userPrompt, SYSTEM_PROMPT, {
    maxTokens:   6144,
    temperature: 0.7,
  });
}

export default generateGrade1English;
