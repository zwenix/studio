import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Shared Genkit instance with Google AI plugin.
 * Default model: gemini-1.5-flash-latest (fast, reliable, multimodal).
 * Used by: extract-text-from-images.ts, tts-flow.ts, and all Gemini-based flows.
 */
export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-1.5-flash-latest',
});