'use server';

/**
 * @fileOverview Visual Aids & Media Tools Generator
 *
 * Generates educational posters, classroom labels, word walls, diagrams,
 * booklet covers, flashcards, and other visual learning materials.
 *
 * Strategy:
 * - For image-heavy output (posters, labels): Use Imagen 4 Fast via googleAI.model()
 * - For structured visual HTML (diagrams, mind maps): Use Gemini 2.5 Pro
 * - Always returns base64-embedded images (no external URLs to break)
 */

import { ai } from '@/genkit';
import { googleAI } from '@genkit-ai/google-genai';
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
  content: string;          // HTML or base64 image tag
  printInstructions: string; // How to print/use
  imageDataUri?: string;    // Base64 image if generated
  description: string;       // Description of what was generated
};

// ─── System Prompt for HTML Visual Aids ──────────────────────────────────────

const VISUAL_HTML_SYSTEM = `You are Amahle Khumalo, South Africa's top educational graphic designer who creates viral classroom resources. Your visual aids are photographed and shared across thousands of South African teacher WhatsApp groups. Your work is pinned in classrooms from Limpopo to the Western Cape.

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
COMPONENT PATTERNS
═══════════════════════════════════════════════════════

POSTER HEADER:
<div style="background:linear-gradient(135deg,#1E40AF,#7C3AED);padding:32px 24px;text-align:center;border-radius:0 0 20px 20px;">
  <div style="font-size:11px;letter-spacing:4px;color:rgba(255,255,255,0.7);text-transform:uppercase;margin-bottom:8px;">Grade X · Subject</div>
  <h1 style="font-size:42px;font-weight:900;color:#fff;margin:0;text-shadow:2px 2px 0 rgba(0,0,0,0.2);line-height:1.1;">TITLE</h1>
</div>

CONTENT CARD:
<div style="background:#fff;border-radius:12px;padding:20px;margin:12px 0;box-shadow:0 2px 8px rgba(0,0,0,0.08);border-left:4px solid #1E40AF;">
  <h3 style="font-size:16px;font-weight:700;color:#1E40AF;margin:0 0 8px;">Card Title</h3>
  <p style="font-size:14px;color:#374151;margin:0;line-height:1.5;">Card content</p>
</div>

LABEL CARD (for classroom labels):
<div style="display:inline-flex;flex-direction:column;align-items:center;justify-content:center;width:120px;height:90px;background:#EFF6FF;border:2px solid #1E40AF;border-radius:12px;padding:8px;text-align:center;">
  <span style="font-size:28px;margin-bottom:4px;">🔢</span>
  <span style="font-size:13px;font-weight:700;color:#1E40AF;">Label Text</span>
</div>

WORD WALL CARD:
<div style="display:inline-flex;flex-direction:column;align-items:center;padding:12px 20px;background:linear-gradient(135deg,#1E40AF,#2563EB);border-radius:8px;margin:4px;min-width:100px;text-align:center;">
  <span style="font-size:18px;font-weight:900;color:#fff;letter-spacing:1px;">WORD</span>
  <span style="font-size:11px;color:rgba(255,255,255,0.75);margin-top:4px;">definition</span>
</div>

FLASHCARD (front):
<div style="width:200px;height:140px;background:linear-gradient(135deg,#1E40AF,#3B82F6);border-radius:16px;display:flex;align-items:center;justify-content:center;margin:8px;box-shadow:0 4px 12px rgba(30,64,175,0.3);">
  <p style="font-size:22px;font-weight:900;color:#fff;text-align:center;padding:16px;margin:0;">TERM</p>
</div>

FLASHCARD (back):
<div style="width:200px;height:140px;background:#fff;border-radius:16px;display:flex;align-items:center;justify-content:center;margin:8px;box-shadow:0 4px 12px rgba(0,0,0,0.1);border:2px solid #E5E7EB;">
  <p style="font-size:14px;color:#374151;text-align:center;padding:16px;margin:0;line-height:1.4;">Definition or answer</p>
</div>

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
      model: googleAI.model('gemini-3.1-flash-image-preview'),
      prompt: imagePrompt,
      output: { format: 'media' },
    } as any);

    const media = (result as any).media;
    if (media?.url) {
      return media.url;
    }
    return null;
  } catch (err) {
    console.error('Imagen generation failed:', err);
    // Try Gemini 2.5 Flash Image as fallback
    try {
      const fallback = await ai.generate({
        model: 'googleai/gemini-3.1-flash-image-preview',
        prompt: `Generate an educational image for: ${visualType} about ${topic} for grade ${grade} ${subject}. ${style || 'Clean educational style'}. ${colorScheme || 'Bright colors'}.`,
        output: { format: 'media' },
      } as any);
      const fallbackMedia = (fallback as any).media;
      return fallbackMedia?.url || null;
    } catch {
      return null;
    }
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

  const response = await ai.generate({
    model: 'googleai/gemini-2.5-pro',
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
      schema: z.object({
        content: z.string(),
        printInstructions: z.string(),
        description: z.string(),
      })
    }
  });

  const output = response.output!;

  const clean = (html: string) =>
    html.replace(/^```(?:html)?\s*/gim, '').replace(/```\s*$/gim, '').trim();

  let content = clean(output.content);

  // Embed the generated image if available
  if (imageDataUri) {
    content = content.replace('__GENERATED_IMAGE__', imageDataUri);
  }

  return {
    content,
    printInstructions: output.printInstructions,
    imageDataUri,
    description: output.description,
  };
}
