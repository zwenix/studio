import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Gemini-only instance.
// ONLY used by: extract-text-from-images.ts and tts-flow.ts
// All content generation flows use groq-client.ts directly.
export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.0-flash',
});
