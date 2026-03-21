import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Global Genkit instance configured for Google AI.
// Using Gemini 2.5 Pro for high-quality pedagogical reasoning as requested.
export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.5-pro',
});
