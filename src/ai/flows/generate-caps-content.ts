'use server';

import { z } from 'genkit';
import { ai } from '@/genkit';

// ─── Schemas ─────────────────────────────────────────────────────────────────

const GenerateCAPSContentInputSchema = z.object({
  grade: z.string(),
  subject: z.string(),
  topic: z.string(),
  contentType: z.string(),
  category: z.string(),
  term: z.string().optional(),
  language: z.string().optional(),
  learnerProfile: z.string().optional(),
  objective: z.string().optional(),
  duration: z.string().optional(),
  additionalInstructions: z.string().optional(),
  teacherName: z.string().optional(),
  signatureUrl: z.string().optional(),
  userId: z.string(),
});

export type GenerateCAPSContentInput = z.infer<typeof GenerateCAPSContentInputSchema>;

const CAPSContentOutputSchema = z.object({
  content_html: z.string(),
  description: z.string(),
  assessmentCriteria: z.string().optional(),
  successIndicators: z.array(z.string()).optional(),
  memo_if_requested: z.object({
    included: z.boolean(),
    answers: z.array(z.object({
      question_number: z.string(),
      answer: z.string(),
    })).optional(),
  }).optional(),
  rubric: z.string().optional(),
  image_prompt: z.string().optional(),
});

export type GenerateCAPSContentOutput = {
  content: string;
  memo?: string;
  rubric?: string;
  docId?: string;
  assessmentCriteria?: string;
  successIndicators?: string[];
};

// ─── System Prompt ────────────────────────────────────────────────────────────

const MASTER_SYSTEM_PROMPT = `
You are an expert South African CAPS-aligned educational content designer specializing in primary and high school learning materials for South African classrooms.

Generate BEAUTIFUL, PROFESSIONAL, PRINT-READY classroom materials that are:
- 100% aligned to the South African CAPS curriculum
- Age-appropriate and highly engaging for South African learners
- Culturally relevant with South African contexts, diversity, local examples
- Visually sophisticated using inline-styled HTML only
- Professional layout with clear hierarchy, spacing, and typography

STYLE RULES:
- Color palette: South African-inspired colors (earth tones, bright accents, ocean blues, savanna oranges/greens)
- Typography: Clean sans-serif fonts for body; bold for titles
- NO emojis unless Foundation Phase (Grade R-3)
- ALL HTML must use ONLY inline CSS styles — no class names, no external CSS

OUTPUT FORMAT — MANDATORY:
Return ONLY a valid JSON object. No markdown. No code blocks. No text before or after the JSON.
{
  "content_html": "<Complete HTML with ONLY inline CSS>",
  "description": "<1-sentence summary>",
  "assessmentCriteria": "<HTML for CAPS assessment criteria or empty string>",
  "successIndicators": ["indicator 1", "indicator 2"],
  "memo_if_requested": {
    "included": true,
    "answers": [{ "question_number": "1", "answer": "Answer text" }]
  },
  "rubric": "<HTML rubric or empty string>",
  "image_prompt": "<Detailed image prompt or empty string>"
}
`;

// ─── Content Type Templates ───────────────────────────────────────────────────

function getSpecificPromptTemplate(contentType: string, grade: string, subject: string, topic: string): string {
  const lowerType = contentType.toLowerCase();

  if (lowerType.includes('poster') || lowerType.includes('wall chart')) {
    return `Create a stunning educational poster for Grade ${grade} ${subject} on "${topic}". Design: A2 portrait, vibrant SA-inspired colors, clear typographic hierarchy, 4-6 key fact boxes, culturally relevant South African context.`;
  }
  if (lowerType.includes('worksheet') || lowerType.includes('exercise') || lowerType.includes('homework')) {
    return `Design a comprehensive CAPS-aligned worksheet for Grade ${grade} ${subject} on "${topic}". Include: clear instructions, well-spaced questions with answer lines, variety of question types (multiple choice, short answer, extended response), marks per question. South African context throughout.`;
  }
  if (lowerType.includes('lesson plan')) {
    return `Create a detailed CAPS-aligned lesson plan for Grade ${grade} ${subject} on "${topic}". Include: CAPS strand/topic reference, learning outcomes, prior knowledge, resources, introduction/body/conclusion structure, assessment method, differentiation for mixed-ability class.`;
  }
  if (lowerType.includes('memo') || lowerType.includes('memorandum')) {
    return `Create a complete marking memorandum for Grade ${grade} ${subject} on "${topic}". Include model answers for every question, mark allocation per question/sub-question, acceptable alternative answers, marking notes. Clean numbered layout.`;
  }
  if (lowerType.includes('rubric')) {
    return `Create a detailed assessment rubric for Grade ${grade} ${subject} on "${topic}". Include: criteria rows, level columns (Outstanding/Exceeds/Meets/Approaching/Not Achieved), clear descriptors for each level, CAPS-aligned standards, total marks. Format as a clean HTML table with inline styles.`;
  }
  if (lowerType.includes('test') || lowerType.includes('exam') || lowerType.includes('assessment') || lowerType.includes('controlled')) {
    return `Design a CAPS-aligned formal assessment for Grade ${grade} ${subject} on "${topic}". Include: clear instructions, section divisions (Section A: Multiple choice, Section B: Short answers, Section C: Extended response), mark allocations, time allowed.`;
  }
  if (lowerType.includes('flashcard')) {
    return `Create a set of educational flashcards for Grade ${grade} ${subject} on "${topic}". 10-15 cards covering key vocabulary/concepts. Term on front (large, bold), definition on back. Format as printable cards with cut lines.`;
  }
  if (lowerType.includes('mind map') || lowerType.includes('concept map')) {
    return `Design a visual mind map for Grade ${grade} ${subject} on "${topic}". Central concept in middle, radiating branches with key ideas, sub-branches with details and SA examples. Color-coded by category. Format as HTML with div-based layout.`;
  }
  if (lowerType.includes('study guide') || lowerType.includes('notes') || lowerType.includes('revision')) {
    return `Create a comprehensive study guide for Grade ${grade} ${subject} on "${topic}". Include: key concepts with explanations, definitions box, important formulas/rules, worked examples in South African context, summary points, self-test questions.`;
  }
  return `Design a comprehensive educational resource for Grade ${grade} ${subject} on "${topic}". Include all key CAPS concepts with clear explanations, South African examples, and appropriate assessment questions. Make it visually appealing and print-ready.`;
}

// ─── Image Generation Helper ──────────────────────────────────────────────────

async function generateImage(prompt: string): Promise<string> {
  const enrichedPrompt = `${prompt}\n\nUltra-detailed digital illustration, professional educational graphic design, vibrant colors, perfect composition, 300 DPI print quality, no text overlays, no watermarks, suitable for South African classroom display.`;

  // Primary: Gemini 3.1 Flash Image
  try {
    const response = await ai.generate({
      model: 'googleai/gemini-3.1-flash-image-preview',
      prompt: enrichedPrompt,
      output: { format: 'media' },
    } as any);

    if (response.media?.url) return response.media.url;
    const parts = (response as any).candidates?.[0]?.message?.content ?? [];
    for (const part of parts) {
      if (part?.media?.url) return part.media.url;
      if (part?.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  } catch (e) {
    console.warn('Primary image model failed, trying fallback:', e);
  }

  // Fallback: Gemini 3 Pro Image
  try {
    const fallback = await ai.generate({
      model: 'googleai/gemini-3-pro-image-preview',
      prompt: enrichedPrompt,
      output: { format: 'media' },
    } as any);

    if (fallback.media?.url) return fallback.media.url;
    const parts = (fallback as any).candidates?.[0]?.message?.content ?? [];
    for (const part of parts) {
      if (part?.media?.url) return part.media.url;
      if (part?.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  } catch (e) {
    console.warn('Fallback image model also failed:', e);
  }

  return '';
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export async function generateCAPSContent(
  input: GenerateCAPSContentInput
): Promise<GenerateCAPSContentOutput> {

  const specificInstructions = getSpecificPromptTemplate(
    input.contentType, input.grade, input.subject, input.topic
  );

  const userPrompt = `
REQUESTED CONTENT:
- Grade: ${input.grade}
- Subject: ${input.subject}
- Topic: ${input.topic}
- Content Type: ${input.contentType}
- Category: ${input.category}
- Term: ${input.term || 'General'}
- Language: ${input.language || 'English'}

ADDITIONAL CONTEXT:
- Objective: ${input.objective || 'N/A'}
- Learner Profile: ${input.learnerProfile || 'General South African Classroom'}
- Duration: ${input.duration || 'N/A'}
- Extra Instructions: ${input.additionalInstructions || 'None'}
- Teacher Name: ${input.teacherName || 'Educator'}

SPECIFIC DESIGN INSTRUCTIONS:
${specificInstructions}

REMEMBER: Return ONLY raw JSON. No markdown fences. No extra text.
`;

  // ── Step 1: Generate content ───────────────────────────────────────────────
  let parsedContent: z.infer<typeof CAPSContentOutputSchema>;

  const response = await ai.generate({
    model: 'googleai/gemini-3.1-pro-preview',
    system: MASTER_SYSTEM_PROMPT,
    prompt: userPrompt,
    config: { temperature: 0.65 },
    output: {
      format: 'json',
      schema: CAPSContentOutputSchema,
    },
  });

  if (response.output) {
    parsedContent = response.output as z.infer<typeof CAPSContentOutputSchema>;
  } else if (response.text) {
    let cleanText = response.text.trim();
    if (cleanText.startsWith('```json')) cleanText = cleanText.slice(7);
    else if (cleanText.startsWith('```')) cleanText = cleanText.slice(3);
    if (cleanText.endsWith('```')) cleanText = cleanText.slice(0, -3);
    try {
      parsedContent = JSON.parse(cleanText.trim());
    } catch {
      return { content: response.text };
    }
  } else {
    throw new Error('AI generation returned no output. Check that GOOGLE_GENAI_API_KEY is bound in apphosting.yaml under runConfig.env.');
  }

  let finalHtmlContent = parsedContent.content_html || '';

  // ── Step 2: Optional image generation (non-fatal) ─────────────────────────
  if (parsedContent.image_prompt) {
    try {
      const dataUri = await generateImage(parsedContent.image_prompt);
      if (dataUri) {
        finalHtmlContent = `
          <div style="margin-bottom:24px;text-align:center;">
            <img src="${dataUri}" alt="Educational Illustration" style="max-width:100%;height:auto;border-radius:12px;box-shadow:0 10px 15px -3px rgba(0,0,0,0.1);" />
          </div>
          ${finalHtmlContent}
        `;
      }
    } catch (imgErr) {
      console.warn('Image generation skipped (non-fatal):', imgErr);
    }
  }

  // ── Step 3: Build memo HTML ────────────────────────────────────────────────
  let memoHtml = '';
  if (parsedContent.memo_if_requested?.included && parsedContent.memo_if_requested?.answers?.length) {
    memoHtml = `<div style="font-family:Arial,sans-serif;padding:24px;">
      <h2 style="color:#1a56db;font-size:1.25rem;font-weight:bold;margin-bottom:1rem;border-bottom:2px solid #1a56db;padding-bottom:8px;">MEMORANDUM</h2>
      ${parsedContent.memo_if_requested.answers.map(ans =>
        `<p style="margin-bottom:0.75rem;"><strong style="color:#374151;">${ans.question_number}.</strong> <span style="color:#4b5563;">${ans.answer}</span></p>`
      ).join('')}
    </div>`;
  }

  const assessmentCriteria = parsedContent.assessmentCriteria || '';
  const successIndicators = parsedContent.successIndicators || [];
  const rubricHtml = parsedContent.rubric || '';

  // ── Step 4: Save to Firestore (non-blocking — NEVER kills the response) ────
  let docId: string | undefined;
  try {
    const { initializeApp, getApps } = await import('firebase/app');
    const { getFirestore, collection, addDoc, serverTimestamp } = await import('firebase/firestore');
    const { firebaseConfig } = await import('@/firebase/config');

    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    const db = getFirestore(app);

    const docRef = await addDoc(collection(db, 'teachers', input.userId, 'generatedContent'), {
      teacherId: input.userId,
      grade: input.grade,
      subject: input.subject,
      topic: input.topic,
      contentType: input.contentType,
      category: input.category,
      content: finalHtmlContent,
      description: parsedContent.description || '',
      assessmentCriteria,
      successIndicators,
      memo: memoHtml,
      rubric: rubricHtml,
      createdAt: serverTimestamp(),
      modelUsed: 'gemini-3.1-pro-preview',
      capsAligned: true,
    });

    docId = docRef.id;
  } catch (firestoreErr) {
    // Non-fatal: content is still returned to the teacher even if save fails
    console.error('Firestore save failed (content still returned):', firestoreErr);
  }

  return {
    content: finalHtmlContent,
    memo: memoHtml,
    rubric: rubricHtml,
    docId,
    assessmentCriteria,
    successIndicators,
  };
}