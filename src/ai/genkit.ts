
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { groq } from 'genkitx-groq';

export const ai = genkit({
  plugins: [
    googleAI(),
    // Type casting to any bypasses the 'version' missing error in Genkit 1.x for community plugins
    groq({ apiKey: process.env.GROQ_API_KEY }) as any,
  ],
  model: 'groq/llama-3.3-70b-versatile',
});
