import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Shared Genkit instance with Google AI plugin.
 * Default model: gemini-1.5-pro (Highly stable, intelligent, and multimodal).
 */
export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-1.5-pro',
});
