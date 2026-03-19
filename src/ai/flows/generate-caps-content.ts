'use server';

/**
 * @fileOverview Generates CAPS-compliant educational content using Groq.
 *
 * Visual aids strategy:
 *   PRIMARY   — Groq generates inline SVG illustrations (no API keys needed)
 *   FALLBACK  — Wikimedia Commons REST API (no API keys needed)
 *
 * - generateCAPSContent       — main exported function
 * - GenerateCAPSContentInput  — input type
 * - GenerateCAPSContentOutput — output type
 */

import { z } from 'zod';
import { groqGenerate, groqGenerateJSON } from '@/ai/groq-client';

// ─── Schemas & Types ──────────────────────────────────────────────────────────

const GenerateCAPSContentInputSchema = z.object({
  // Using z.string() for grade and category so the UI can pass custom values
  // (e.g. "Other" grades or extra category types) without TypeScript errors.
  grade: z.string().describe('The grade level (R, 1–12, or custom).'),
  subject: z.string().describe('The subject.'),
  topic: z.string().describe('The topic.'),
  contentType: z.string().describe('Worksheet, Lesson Plan, Poster, Study Guide, ILP, etc.'),
  category: z.string().describe('The content category.'),
  term: z.string().optional().describe('School term (1, 2, 3, 4).'),
  language: z.string().optional().describe('Language of instruction.'),
  learnerProfile: z.string().optional().describe('Barriers, strengths, needs.'),
  objective: z.string().optional().describe('Teacher specific goal.'),
  duration: z.string().optional().describe('Duration in minutes.'),
  numberOfActivities: z.string().optional().describe('Desired number of activities.'),
  additionalInstructions: z.string().optional().describe('Specific tweaks.'),
  teacherName: z.string().optional(),
  signatureUrl: z.string().optional(),
});

export type GenerateCAPSContentInput = z.infer<typeof GenerateCAPSContentInputSchema>;

export type GenerateCAPSContentOutput = {
  content: string;
  memo: string;
  rubric: string;
};

// Internal shape of what Groq returns for the main content generation step
type GroqCAPSResponse = {
  content: string;
  memo: string;
  rubric: string;
  visualAids: Array<{ id: string; description: string }>;
};

// ─── Option 2: Wikimedia Commons fallback ────────────────────────────────────
// Free, no API key required, educationally appropriate imagery.

async function fetchWikimediaImage(query: string): Promise<string> {
  try {
    // Step 1: Search Wikipedia for the most relevant article
    const searchRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
        query
      )}&format=json&origin=*`,
      { next: { revalidate: 3600 } } // cache for 1 hour
    );

    if (!searchRes.ok) return '';

    const searchData = await searchRes.json();
    const pageTitle = searchData?.query?.search?.[0]?.title;
    if (!pageTitle) return '';

    // Step 2: Fetch the main thumbnail image for that article
    const imageRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(
        pageTitle
      )}&prop=pageimages&pithumbsize=600&format=json&origin=*`,
      { next: { revalidate: 3600 } }
    );

    if (!imageRes.ok) return '';

    const imageData = await imageRes.json();
    const pages = imageData?.query?.pages;
    if (!pages) return '';

    const page = pages[Object.keys(pages)[0]];
    const url: string = page?.thumbnail?.source || '';

    if (url) {
      console.log(`[VisualAids] Wikimedia found image for: "${query}"`);
    }

    return url;
  } catch (err) {
    console.error('[VisualAids] Wikimedia fetch error:', err);
    return '';
  }
}

// ─── Option 1: Groq SVG generation (primary) ─────────────────────────────────
// Groq generates a fully self-contained inline SVG illustration.
// If the SVG cannot be extracted, falls back to Option 2 (Wikimedia).

async function generateVisual(description: string, grade: string): Promise<string> {
  const isEarlyGrade = ['R', '1', '2', '3', '4'].includes(grade);

  // ── Attempt Option 1: SVG via Groq ──────────────────────────────────────
  try {
    const svgText = await groqGenerate(
      [
        {
          role: 'system',
          content: `You are an expert SVG illustrator creating visual aids for South African educational materials.

STRICT RULES — follow every one:
- Output ONLY the raw SVG. Start with <svg and end with </svg>. No text before or after.
- Use viewBox="0 0 400 300" width="400" height="300" on the root <svg> element.
- Include xmlns="http://www.w3.org/2000/svg" on the root <svg> element.
- Use bright, cheerful colours: blues (#3399FF, #1E90FF), greens (#4CAF50, #8BC34A), yellows (#FFC107, #FFD700), oranges (#FF9800).
- ${
    isEarlyGrade
      ? 'Style: very simple, bold, cartoon-like. Large shapes, thick strokes (stroke-width 3+). Suitable for Grade R–4 learners.'
      : 'Style: clean, accurate, educational diagram. Suitable for Grade 5–12 learners.'
  }
- Include a <title> element as the FIRST child of <svg> with a short description.
- For diagrams: use <text> elements to label all key parts clearly. Font size minimum 12px.
- For scenes/objects: use basic SVG shapes — rect, circle, ellipse, polygon, path, line.
- Add a light background rectangle: <rect width="400" height="300" fill="#F0F8FF" rx="12"/>
- NO external images (no <image href>). NO <script> tags. NO external CSS.
- The SVG must be 100% self-contained and renderable inline in HTML.`,
        },
        {
          role: 'user',
          content: `Create an educational SVG illustration for Grade ${grade} South African learners.
Illustration to create: "${description}"
Make it accurate, colourful, and educationally valuable.`,
        },
      ],
      { temperature: 0.3, max_tokens: 2048 }
    );

    // Extract only the SVG tag — discard any surrounding text Groq may add
    const svgMatch = svgText.match(/<svg[\s\S]*?<\/svg>/i);

    if (svgMatch && svgMatch[0].length > 100) {
      console.log(`[VisualAids] SVG generated for: "${description}"`);
      return `<div class="my-6 text-center visual-aid">
  <div class="inline-block rounded-xl shadow-lg overflow-hidden border border-blue-100">
    ${svgMatch[0]}
  </div>
  <p class="text-xs text-muted-foreground mt-2 italic">${description}</p>
</div>`;
    }

    console.warn(`[VisualAids] SVG extraction failed for: "${description}" — trying Wikimedia`);
  } catch (err) {
    console.error(`[VisualAids] Groq SVG generation error for: "${description}"`, err);
  }

  // ── Attempt Option 2: Wikimedia fallback ────────────────────────────────
  const wikiUrl = await fetchWikimediaImage(description);

  if (wikiUrl) {
    return `<div class="my-6 text-center visual-aid">
  <img
    src="${wikiUrl}"
    alt="${description}"
    class="rounded-xl shadow-lg mx-auto max-h-[400px]"
    style="width: auto; height: auto; max-width: 100%;"
  />
  <p class="text-xs text-muted-foreground mt-2 italic">${description}</p>
</div>`;
  }

  // ── Both options failed — remove placeholder silently ───────────────────
  console.warn(`[VisualAids] No visual found for: "${description}" — placeholder removed`);
  return '';
}

// ─── Main exported function ───────────────────────────────────────────────────

export async function generateCAPSContent(
  input: GenerateCAPSContentInput
): Promise<GenerateCAPSContentOutput> {

  // ── Step 1: Generate educational content + visual aid descriptions ───────
  const output = await groqGenerateJSON<GroqCAPSResponse>(
    [
      {
        role: 'system',
        content: `You are an expert South African teacher and CAPS curriculum designer for Grades R–12.

CONTENT RULES:
- Strictly align ALL content to the South African CAPS curriculum.
- Use South African English spelling: colour, realise, learner, programme, centre, etc.
- Adapt language, vocabulary, and cognitive demand precisely to the specified grade:
  - Grades R–1: Very simple words, concrete examples, matching / circling / colouring activities.
  - Grades 2–3: Simple sentences, scaffolded step-by-step instructions.
  - Grades 4–7: Clear learner-friendly text, problem-solving, higher-order thinking questions.
  - Grades 8–12: Subject-appropriate academic rigour, formal terminology, analytical tasks.
- Use South African contexts, names, currencies (Rands), and examples throughout.
- Structure the HTML content neatly with h1, h2, h3, p, ul, ol, table where appropriate.

VISUAL AID RULES (CRITICAL):
- Embed exactly 2 to 4 image placeholders in the content HTML where visuals genuinely aid understanding.
- Placeholder format — NO spaces inside the brackets: [IMAGE:VA1], [IMAGE:VA2], [IMAGE:VA3], [IMAGE:VA4]
- Place each placeholder on its own line in the HTML, between paragraphs or sections.
- In the visualAids JSON array, write a SPECIFIC and DETAILED description of the illustration needed.
  - GOOD: "A clearly labelled diagram of the water cycle showing evaporation, condensation, precipitation and collection with arrows indicating direction of flow"
  - GOOD: "A cartoon illustration of a South African township street scene showing a spaza shop, children playing, and a minibus taxi"
  - BAD: "an image", "a picture", "visual aid"
- An SVG illustrator will draw exactly what you describe — be precise and detailed.

RETURN FORMAT:
Return ONLY a single JSON object. No markdown fences, no extra text before or after.
{
  "content": "<complete HTML string with [IMAGE:VA1] placeholders embedded at appropriate points>",
  "memo": "<HTML memo with model answers and explanations>",
  "rubric": "<HTML rubric with assessment criteria and mark allocations>",
  "visualAids": [
    { "id": "VA1", "description": "detailed specific description of what to illustrate" },
    { "id": "VA2", "description": "detailed specific description of what to illustrate" }
  ]
}`,
      },
      {
        role: 'user',
        content: `Generate a ${input.contentType} for Grade ${input.grade}.

Subject: ${input.subject}
Topic: ${input.topic}
Term: ${input.term || 'N/A'}
Language of Instruction: ${input.language || 'English'}
Learning Objective: ${input.objective || 'N/A'}
Learner Profile / Needs: ${input.learnerProfile || 'General class'}
Duration: ${input.duration || 'N/A'} minutes
Number of Activities: ${input.numberOfActivities || 'N/A'}
Additional Instructions: ${input.additionalInstructions || 'None'}
${input.teacherName ? `Teacher: ${input.teacherName}` : ''}`,
      },
    ],
    { max_tokens: 8192, temperature: 0.7 }
  );

  // ── Step 2: Validate visual aids array ───────────────────────────────────
  const visualAids: Array<{ id: string; description: string }> = Array.isArray(output.visualAids)
    ? output.visualAids
    : [];

  console.log(
    `[ContentGen] Groq returned ${visualAids.length} visual aid(s):`,
    visualAids.map(v => v.id)
  );

  // ── Step 3: Generate all visuals in parallel (SVG first, Wikimedia fallback) ──
  const visualResults = await Promise.all(
    visualAids.map(async (va) => ({
      id: va.id,
      html: await generateVisual(va.description, input.grade),
    }))
  );

  // ── Step 4: Inject generated visuals into the HTML content ───────────────
  let html = output.content || '';

  for (const result of visualResults) {
    // Matches both [IMAGE:VA1] and [IMAGE: VA1] (with or without space)
    const tagRegex = new RegExp(`\\[IMAGE:\\s*${result.id}\\]`, 'gi');
    html = html.replace(tagRegex, result.html);
  }

  // ── Step 5: Clean up any unresolved placeholders ─────────────────────────
  html = html.replace(/\[IMAGE:\s*VA\d+\]/gi, '');

  return {
    content: html,
    memo: output.memo || '',
    rubric: output.rubric || '',
  };
}