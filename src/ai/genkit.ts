import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Gemini-only instance — used exclusively for:
// 1. extract-text-from-images (vision/OCR)
// 2. tts-flow (audio generation)
export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.0-flash',
});
