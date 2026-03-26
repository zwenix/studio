'use server';

/**
 * @fileOverview A Text-to-Speech flow using Google Cloud Text-to-Speech.
 *
 * - textToSpeech - A function that converts text to speech.
 * - TextToSpeechInput - The input type for the textToSpeech function.
 * - TextToSpeechOutput - The return type for the textToSpeech function.
 */

import { ai } from '@/genkit';
import { z } from 'genkit';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';

const TextToSpeechInputSchema = z.object({
  text: z.string().describe('The text to convert to speech.'),
  voice: z.string().describe('The voice to use for the speech.'),
});
export type TextToSpeechInput = z.infer<typeof TextToSpeechInputSchema>;

const TextToSpeechOutputSchema = z.object({
  audio: z.string().describe('The base64 encoded WAV audio data URI.'),
});
export type TextToSpeechOutput = z.infer<typeof TextToSpeechOutputSchema>;

export async function textToSpeech(
  input: TextToSpeechInput
): Promise<TextToSpeechOutput> {
  return ttsFlow(input);
}

const ttsFlow = ai.defineFlow(
  {
    name: 'ttsFlow',
    inputSchema: TextToSpeechInputSchema,
    outputSchema: TextToSpeechOutputSchema,
  },
  async ({ text, voice }) => {
    try {
      const client = new TextToSpeechClient();
      const request = {
        input: { text },
        voice: { languageCode: 'en-US', name: voice },
        audioConfig: { audioEncoding: 'MP3' as const },
      };
      
      const [response] = await client.synthesizeSpeech(request);
      
      if (!response.audioContent) {
        throw new Error('No audio content returned from TTS service.');
      }

      const audioBase64 = Buffer.from(response.audioContent).toString('base64');
      
      return {
        audio: `data:audio/mp3;base64,${audioBase64}`,
      };
    } catch (error) {
      console.error('TTS error:', error);
      throw new Error(`Text-to-speech failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);
