import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Global Genkit instance configured for Google AI.
// Currently testing Gemini 1.5 Pro for all content generation tasks.
export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-1.5-pro',
});
