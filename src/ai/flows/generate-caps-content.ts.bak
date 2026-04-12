'use server';

/**
 * CAPS Content Generator
 * Original system prompt preserved verbatim.
 * Transport: Genkit removed → direct Anthropic + Groq calls via /lib/ai.ts
 */

import { generateJSON } from '@/lib/ai';
import { createClient }  from 'pexels';

// ── Types (unchanged from original) ───────────────────────────────────────────
export type GenerateCAPSContentInput = {
  grade:                   string;
  subject:                 string;
  topic:                   string;
  contentType:             string;
  category:                string;
  term?:                   string;
  language?:               string;
  learnerProfile?:         string;
  objective?:              string;
  duration?:               string;
  additionalInstructions?: string;
  teacherName?:            string;
  signatureUrl?:           string;
};

export type GenerateCAPSContentOutput = {
  content: string;
  memo:    string;
  rubric:  string;
};

type CapsAIResponse = {
  content:    string;
  memo:       string;
  rubric:     string;
  visualAids: Array<{ id: string; query: string }>;
};

// ── Image fetcher: Pexels → Pixabay fallback (unchanged) ─────────────────────
async function fetchImage(query: string): Promise<string> {
  const pexelsKey = process.env.PEXELS_API_KEY;
  if (pexelsKey) {
    try {
      const client   = createClient(pexelsKey);
      const response = await client.photos.search({
        query,
        per_page:    1,
        orientation: 'landscape',
      });
      if ('photos' in response && response.photos.length > 0) {
        return response.photos[0].src.large;
      }
    } catch (e) {
      console.error('Pexels failed for query:', query, e);
    }
  }

  const pixabayKey = process.env.PIXABAY_API_KEY;
  if (pixabayKey) {
    try {
      const url  = `https://pixabay.com/api/?key=${pixabayKey}&q=${encodeURIComponent(query)}&image_type=photo&orientation=horizontal&safesearch=true&per_page=3`;
      const res  = await fetch(url);
      const data = await res.json();
      if (data.hits?.length > 0) return data.hits[0].largeImageURL;
    } catch (e) {
      console.error('Pixabay failed for query:', query, e);
    }
  }

  return '';
}

// ── Main exported function ────────────────────────────────────────────────────
export async function generateCAPSContent(
  input: GenerateCAPSContentInput
): Promise<GenerateCAPSContentOutput> {

  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  ORIGINAL SYSTEM PROMPT — preserved verbatim from generate-caps-content ║
  // ╚══════════════════════════════════════════════════════════════════════════╝
  const systemPrompt = `You are an expert South African teacher and CAPS curriculum designer.
    
CONTENT RULES:
- Strictly align to the South African CAPS curriculum.
- Use South African English spelling (colour, realise, learner, etc.).
- Adapt language and cognitive demand to the specified grade:
  - Grades R–1: Very simple words, concrete examples, matching/circling/colouring activities.
  - Grades 2–3: Simple sentences, scaffolded instructions.
  - Grades 4–7: Clear learner-friendly text, problem-solving, higher-order questions.
  - Grades 8–12: Subject-appropriate academic rigour.
- Use South African contexts, names, and Rands (ZAR).

LENGTH & DURATION RULES:
- If the user provided specific requirements for length or duration, strictly follow them.
- If no requirements were provided, default to a 30-minute lesson/task and/or 10 questions/activities.

IMAGE PLACEHOLDER RULES (CRITICAL):
- Where an image would enhance learning, insert a placeholder tag exactly like this: [IMAGE:VA1], [IMAGE:VA2], etc.
- Use 2 to 4 images per piece of content — place them at logical points in the HTML.
- In the "visualAids" array in your JSON response, list each image with its id and a detailed English search query.
- Example visualAids entry: { "id": "VA1", "query": "South African children learning mathematics classroom" }
- DO NOT include a VISUAL_AIDS text section in the content HTML — use only the JSON array.

OUTPUT FORMAT — return ONLY this JSON object, nothing else:
{
  "content": "<HTML string with [IMAGE:VA1] placeholders embedded at appropriate points>",
  "memo": "<HTML memo with answers and explanations>",
  "rubric": "<HTML rubric with criteria and mark allocations>",
  "visualAids": [
    { "id": "VA1", "query": "detailed search query for image 1" },
    { "id": "VA2", "query": "detailed search query for image 2" }
  ]
}`;

  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  ORIGINAL USER PROMPT — preserved verbatim                              ║
  // ╚══════════════════════════════════════════════════════════════════════════╝
  const userPrompt = `Generate a ${input.contentType} for Grade ${input.grade}.
Subject: ${input.subject}
Topic: ${input.topic}
Term: ${input.term || 'N/A'}
Language: ${input.language || 'English'}
Objective: ${input.objective || 'N/A'}
Learner Profile: ${input.learnerProfile || 'General class'}
Length & Duration: ${input.duration || 'Default (30 min / 10 items)'}
Additional Instructions: ${input.additionalInstructions || 'None'}`;

  const output = await generateJSON<CapsAIResponse>(userPrompt, systemPrompt, {
    maxTokens:   8192,
    temperature: 0.7,
  });

  // ── Replace [IMAGE:VAx] placeholders with real images ─────────────────────
  let html       = output.content    || '';
  const visualAids = output.visualAids || [];

  if (visualAids.length > 0) {
    const imageResults = await Promise.all(
      visualAids.map(async va => ({
        id:    va.id,
        query: va.query,
        url:   await fetchImage(va.query),
      }))
    );

    for (const result of imageResults) {
      const tagRegex = new RegExp(`\\[IMAGE:\\s*${result.id}\\]`, 'gi');
      if (result.url) {
        const imgHtml = `<div class="my-6 text-center">
  <img
    src="${result.url}"
    alt="${result.query}"
    class="rounded-xl shadow-lg mx-auto max-h-[400px]"
    style="width:auto;height:auto;max-width:100%;"
  />
  <p class="text-xs text-muted-foreground mt-2 italic">${result.query}</p>
</div>`;
        html = html.replace(tagRegex, imgHtml);
      } else {
        // No image found — remove placeholder silently
        html = html.replace(tagRegex, '');
      }
    }
  }

  // Clean up any stray placeholders
  html = html.replace(/\[IMAGE:\s*VA\d+\]/gi, '');

  return {
    content: html,
    memo:    output.memo   || '',
    rubric:  output.rubric || '',
  };
}
