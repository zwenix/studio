'use server';

/**
 * @fileOverview Visual Aids & Media Tools Generator
 *
 * Generates educational posters, classroom labels, word walls, diagrams,
 * booklet covers, flashcards, and other visual learning materials.
 */

import { ai } from '@/genkit';
import { z } from 'genkit';

// ─── Schemas ─────────────────────────────────────────────────────────────────

export const VisualAidInputSchema = z.object({
  visualType: z.string().describe('e.g. "Educational Poster", "Classroom Labels", "Word Wall", "Diagram", "Flashcards", "Mind Map", "Alphabet Chart", "Number Chart", "Vocabulary Cards", "Certificate"'),
  grade: z.string(),
  subject: z.string(),
  topic: z.string(),
  language: z.string().optional().default('English'),
  colorScheme: z.string().optional().describe('e.g. "bright primary colors", "pastel", "school colors", "monochrome"'),
  style: z.string().optional().describe('e.g. "fun cartoon", "clean modern", "hand-drawn", "professional"'),
  specificContent: z.string().optional().describe('Specific words, concepts, or items to include'),
  quantity: z.string().optional().describe('Number of items e.g. "12 labels" or "26 flashcards"'),
  size: z.string().optional().describe('e.g. "A4 poster", "A5 cards", "small labels"'),
  additionalInstructions: z.string().optional(),
  generateImage: z.boolean().optional().default(false).describe('Whether to generate an actual image via Imagen'),
});

export type VisualAidInput = z.infer<typeof VisualAidInputSchema>;

export type VisualAidOutput = {
  content: string;
  printInstructions: string;
  imageDataUri?: string;
  description: string;
};

// ─── System Prompt for HTML Visual Aids ──────────────────────────────────────

const VISUAL_HTML_SYSTEM = `You are Zwelakhe Msuthu, South Africa's top educational graphic designer who creates viral classroom resources. Your visual aids are photographed and shared across thousands of South African teacher WhatsApp groups. Your work is pinned in classrooms from Limpopo to the Western Cape.

You create stunning, eye-catching educational visuals using pure HTML with inline styles — no external CSS, no class names, no Tailwind utilities.

═══════════════════════════════════════════════════════
VISUAL DESIGN PHILOSOPHY
═══════════════════════════════════════════════════════

Your visuals must be:
✅ VISUALLY STUNNING — Bold typography, vibrant colors, strong visual hierarchy
✅ EDUCATIONALLY PURPOSEFUL — Every element serves a learning goal
✅ PRINT-READY — A4-optimised, high contrast, clear at 100% zoom
✅ AGE-APPROPRIATE — Playful for Foundation Phase, clean for FET

NEVER create:
❌ Bland, text-heavy walls without visual relief
❌ Small unreadable text in labels
❌ Poor contrast (light text on light background)
❌ Generic clipart descriptions that can't render in HTML

═══════════════════════════════════════════════════════
DESIGN SYSTEM
═══════════════════════════════════════════════════════

COLOR PALETTES (choose one based on subject/grade):

FOUNDATION PHASE (Grades R–3):
Primary: #FF6B6B (coral), #4ECDC4 (teal), #FFE66D (yellow), #6BCB77 (green)
Background: #FFFEF0 or #F0F9FF
Font: Impact for headings, Arial rounded for body

INTERMEDIATE (Grades 4–6):
Primary: #2563EB (blue), #7C3AED (purple), #059669 (green), #D97706 (amber)
Background: #F8FAFF or #FFFBF0
Font: Georgia for headings, Arial for body

SENIOR/FET (Grades 7–12):
Primary: #1E40AF (navy), #1D4ED8 (blue), #065F46 (forest), #7C2D12 (burgundy)
Background: #FFFFFF or #F9FAFB
Font: Arial Black for headings, Arial for body

SUBJECT COLOURS:
- Mathematics: #1E40AF (navy blue)
- Natural Sciences/Physical Sciences: #065F46 (forest green)
- Languages/English: #7C3AED (purple)
- Social Sciences/History: #92400E (amber/brown)
- Life Sciences: #14532D (dark green)
- Creative Arts: #BE185D (magenta)
- Life Orientation: #0E7490 (cyan)
- Technology/EMS: #374151 (slate)

═══════════════════════════════════════════════════════
ABSOLUTE RULES
═══════════════════════════════════════════════════════
1. Return ONLY valid JSON with "content", "printInstructions", "description"
2. HTML must use ONLY inline styles — NO class names, NO external CSS
3. NO code fences, NO markdown
4. HTML must start with <div style="...">
5. All text must be readable: dark text on light, white text on dark — NEVER same-color
6. Must be gorgeous — teachers must gasp when they see it`;

// ─── Image Generation for Visual Aids ────────────────────────────────────────

async function generateImageForVisualAid(
  visualType: string,
  topic: string,
  subject: string,
  grade: string,
  style: string,
  colorScheme: string
): Promise<string | null> {
  try {
    const gradeNum = parseInt(grade);
    const isFoundation = grade === 'R' || gradeNum <= 3;

    const imagePrompt = `Educational ${visualType} for South African grade ${grade} ${subject} about "${topic}".
${isFoundation ? 'Bright, cheerful, child-friendly cartoon style with bold colors.' : 'Clean, professional educational design.'}
${style ? `Style: ${style}.` : ''}
${colorScheme ? `Colors: ${colorScheme}.` : 'Vibrant, high-contrast colors.'}
No text overlays. Clean white background. Print-ready educational graphic. South African context.
The image should be: well-composed, high-quality, suitable for classroom display.`;

    const result = await ai.generate({
      model: 'googleai/gemini-3.1-flash-image-preview',
      prompt: imagePrompt,
      output: { format: 'media' },
    } as any);

    const media = (result as any).media;
    if (media?.url) return media.url;
    return null;
  } catch (err) {
    console.warn('Image generation for visual aid failed (non-fatal):', err);
    return null;
  }
}

// ─── Main Function ────────────────────────────────────────────────────────────

export async function generateVisualAid(
  input: VisualAidInput
): Promise<VisualAidOutput> {

  // For image-heavy types, try to generate an actual image
  let imageDataUri: string | undefined;
  if (input.generateImage) {
    const imgResult = await generateImageForVisualAid(
      input.visualType,
      input.topic,
      input.subject,
      input.grade,
      input.style || '',
      input.colorScheme || ''
    );
    if (imgResult) imageDataUri = imgResult;
  }

  const outputSchema = z.object({
    content: z.string(),
    printInstructions: z.string(),
    description: z.string(),
  });

  const response = await ai.generate({
    model: 'googleai/gemini-3.1-pro-preview',
    config: { temperature: 0.8 },
    system: VISUAL_HTML_SYSTEM,
    prompt: `Create a stunning ${input.visualType} for:

Grade: ${input.grade}
Subject: ${input.subject}
Topic: ${input.topic}
Language: ${input.language || 'English'}
Color Scheme: ${input.colorScheme || 'Subject-appropriate vibrant colors'}
Style: ${input.style || 'Modern educational, eye-catching'}
Specific Content to Include: ${input.specificContent || 'All key concepts for this topic'}
Quantity: ${input.quantity || 'Appropriate for the type'}
Size/Format: ${input.size || 'A4 portrait'}
Additional Instructions: ${input.additionalInstructions || 'None'}
${imageDataUri ? `An image has been generated and will be inserted. Include an <img> placeholder: <img src="__GENERATED_IMAGE__" style="width:100%;max-height:300px;object-fit:cover;border-radius:12px;" alt="${input.topic}">` : ''}

OUTPUT FORMAT — return ONLY this JSON:
{
  "content": "<stunning, print-ready HTML with ALL inline styles>",
  "printInstructions": "Clear instructions for printing and using this visual aid",
  "description": "Brief description of what was created"
}

The HTML must be: visually SPECTACULAR, print-ready, using the design system from your instructions.
For Foundation Phase: make it JOYFUL and COLORFUL with emojis and large text.
For Senior Phase: make it CLEAN and AUTHORITATIVE.`,
    output: {
      format: 'json',
      schema: outputSchema,
    }
  });

  // FIX: Robust output handling — never crash on response.output being null.
  // When Gemini wraps its response in markdown fences or produces slightly
  // non-conforming JSON, response.output is null. Fall back to response.text.
  let parsed: { content: string; printInstructions: string; description: string };

  if (response.output) {
    parsed = response.output;
  } else if (response.text) {
    let clean = response.text.trim();
    if (clean.startsWith('```json')) clean = clean.slice(7);
    else if (clean.startsWith('```')) clean = clean.slice(3);
    if (clean.endsWith('```')) clean = clean.slice(0, -3);
    try {
      parsed = JSON.parse(clean.trim());
    } catch {
      // Last resort: wrap raw text as content
      parsed = {
        content: `<div style="font-family:Arial,sans-serif;padding:24px;">${response.text}</div>`,
        printInstructions: 'Print on A4 paper.',
        description: `${input.visualType} for Grade ${input.grade} ${input.subject}`,
      };
    }
  } else {
    throw new Error('Visual Aid generation returned no output. Please try again.');
  }

  const clean = (html: string) =>
    html.replace(/^```(?:html)?\s*/gim, '').replace(/```\s*$/gim, '').trim();

  let content = clean(parsed.content);

  // Embed the generated image if available
  if (imageDataUri) {
    content = content.replace('__GENERATED_IMAGE__', imageDataUri);
  }

  return {
    content,
    printInstructions: parsed.printInstructions,
    imageDataUri,
    description: parsed.description,
  };
}
