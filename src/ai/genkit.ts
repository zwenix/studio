import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Gemini-only instance.
 * ONLY used by: extract-text-from-images.ts and tts-flow.ts
 * All logic-heavy content generation flows use groq-client.ts directly to bypass plugin issues.
 */
export const ai = genkit({
  plugins: [googleAI()],
});
