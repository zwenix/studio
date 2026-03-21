import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Global Genkit instance configured for Google AI.
// Using Gemini 2.0 Flash for all content generation tasks.
export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.0-flash',
});
