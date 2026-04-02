'use server';
/**
 * @fileOverview OCR and handwriting recognition flow.
 *
 * Model: googleai/gemini-flash-latest (= Gemini 3 Flash, per geminichat.txt alias table)
 * Rationale: Fast multimodal model sufficient for OCR — no heavy reasoning needed.
 * Previously used gemini-flash-live-latest which DOES NOT EXIST in @genkit-ai/google-genai v1.31.0.
 */

import {ai} from '@/genkit';
import {z} from 'genkit';

const ExtractTextFromImageInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo containing text, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractTextFromImageInput = z.infer<typeof ExtractTextFromImageInputSchema>;

const ExtractTextFromImageOutputSchema = z.object({
  extractedText: z.string().describe('The extracted text from the image.'),
});
export type ExtractTextFromImageOutput = z.infer<typeof ExtractTextFromImageOutputSchema>;

export async function extractTextFromImage(input: ExtractTextFromImageInput): Promise<ExtractTextFromImageOutput> {
  return extractTextFromImageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractTextFromImagePrompt',
  // gemini-flash-latest = Gemini 3 Flash (per geminichat.txt) — fast multimodal, ideal for OCR
  model: 'googleai/gemini-flash-latest',
  input: {schema: ExtractTextFromImageInputSchema},
  output: {schema: ExtractTextFromImageOutputSchema},
  prompt: `You are an expert OCR and handwriting recognition AI.

Extract all text from the image accurately, preserving the original structure and layout where possible.

Photo: {{media url=photoDataUri}}`,
});

const extractTextFromImageFlow = ai.defineFlow(
  {
    name: 'extractTextFromImageFlow',
    inputSchema: ExtractTextFromImageInputSchema,
    outputSchema: ExtractTextFromImageOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
