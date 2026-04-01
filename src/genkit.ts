import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Shared Genkit instance with Google AI plugin.
 *
 * Default model: gemini-3.1-pro
 *
 * Per-flow model assignments (per EduAI Companion chat.txt architecture):
 *  - Lesson Plans, IDPs, CAPS Content:  gemini-3.1-pro  (long-horizon planning)
 *  - Autograding & Assessments:         gemini-3.1-pro  (high-accuracy rubric grading)
 *  - Real-time Tutoring:                gemini-3.1-flash (lowest latency for dialogue)
 *  - Classroom Posters / Visual Aids:   gemini-3-flash-image (high-fidelity image gen)
 *  - OCR / Text extraction:             gemini-3.1-flash (multimodal, fast)
 *  - TTS:                               Google Cloud TTS (separate client)
 */
export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-pro-latest',
});
