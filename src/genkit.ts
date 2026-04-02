import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Shared Genkit instance with Google AI plugin.
 *
 * Default model: googleai/gemini-pro-latest  (= Gemini 3.1 Pro, per geminichat.txt)
 *
 * Per-flow model assignments (per geminichat.txt verified against @genkit-ai/google-genai v1.31.0):
 *
 *  ALIAS (recommended)                     PINNED VERSION                   USE CASE
 *  googleai/gemini-pro-latest           =  googleai/gemini-3.1-pro-preview  CAPS content, lesson plans, assessments, autograding, memos
 *  googleai/gemini-flash-latest         =  googleai/gemini-3-flash-preview   AI Tutor dialogue, OCR/handwriting (fast, multimodal)
 *  googleai/gemini-2.5-flash-preview-tts                                     Text-to-Speech only
 *  googleai/gemini-3.1-flash-image-preview                                   Image generation for visual aids
 *
 * ❌ DO NOT USE — these strings do not exist in v1.31.0 and will crash at runtime:
 *    gemini-flash-live-latest  |  gemini-2.5-flash-image  |  gemini-2.5-flash-preview-04-17
 *    gemini-3-flash-image  |  gemini-3.1-flash  (bare, without -preview/-latest suffix)
 */
export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-pro-latest',
});
