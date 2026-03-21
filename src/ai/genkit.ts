import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Global Genkit instance configured for Google AI.
// Using Gemini 1.5 Pro for high-quality pedagogical reasoning.
export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-1.5-pro',
});
