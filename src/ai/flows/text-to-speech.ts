'use server';

import { z } from 'genkit';
import { googleCloud } from '@/genkit';
import { defineFlow } from '@genkit-ai/flow';
import TextToSpeech from '@google-cloud/text-to-speech';

const TextToSpeechInputSchema = z.object({
  text: z.string(),
});

const TextToSpeechOutputSchema = z.object({
  audioContent: z.string(), // Base64 encoded audio
});

export const textToSpeechFlow = defineFlow(
  {
    name: 'textToSpeech',
    inputSchema: TextToSpeechInputSchema,
    outputSchema: TextToSpeechOutputSchema,
  },
  async ({ text }) => {
    const client = new TextToSpeech.TextToSpeechClient();

    const request = {
      input: { text },
      voice: { languageCode: 'en-US', ssmlGender: 'NEUTRAL' },
      audioConfig: { audioEncoding: 'MP3' },
    };

    const [response] = await client.synthesizeSpeech(request);
    const audioContent = response.audioContent as string;

    return {
      audioContent,
    };
  }
);
