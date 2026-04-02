'use server';

import { ai } from '@/genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { z } from 'genkit';

const TextToSpeechInputSchema = z.object({
  text: z.string().describe('The text to convert to speech.'),
  voice: z.string().describe('The Gemini prebuilt voice name (e.g. "Algenib", "Achernar").'),
});
export type TextToSpeechInput = z.infer<typeof TextToSpeechInputSchema>;

const TextToSpeechOutputSchema = z.object({
  audio: z.string().describe('Base64 WAV audio as a data URI: data:audio/wav;base64,...'),
});
export type TextToSpeechOutput = z.infer<typeof TextToSpeechOutputSchema>;

export async function textToSpeech(input: TextToSpeechInput): Promise<TextToSpeechOutput> {
  return ttsFlow(input);
}

function pcmToWavDataUri(pcmBuffer: Buffer, sampleRate = 24000, channels = 1, bitDepth = 16): string {
  const byteRate = (sampleRate * channels * bitDepth) / 8;
  const blockAlign = (channels * bitDepth) / 8;
  const dataSize = pcmBuffer.length;
  const wavBuffer = Buffer.alloc(44 + dataSize);
  wavBuffer.write('RIFF', 0);
  wavBuffer.writeUInt32LE(36 + dataSize, 4);
  wavBuffer.write('WAVE', 8);
  wavBuffer.write('fmt ', 12);
  wavBuffer.writeUInt32LE(16, 16);
  wavBuffer.writeUInt16LE(1, 20);
  wavBuffer.writeUInt16LE(channels, 22);
  wavBuffer.writeUInt32LE(sampleRate, 24);
  wavBuffer.writeUInt32LE(byteRate, 28);
  wavBuffer.writeUInt16LE(blockAlign, 32);
  wavBuffer.writeUInt16LE(bitDepth, 34);
  wavBuffer.write('data', 36);
  wavBuffer.writeUInt32LE(dataSize, 40);
  pcmBuffer.copy(wavBuffer, 44);
  return `data:audio/wav;base64,${wavBuffer.toString('base64')}`;
}

const ttsFlow = ai.defineFlow(
  {
    name: 'ttsFlow',
    inputSchema: TextToSpeechInputSchema,
    outputSchema: TextToSpeechOutputSchema,
  },
  async ({ text, voice }) => {
    const { media } = await ai.generate({
      // gemini-2.5-flash-preview-tts = dedicated TTS model (per geminichat.txt + verified in @genkit-ai/google-genai v1.31.0)
      model: 'googleai/gemini-2.5-flash-preview-tts',
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
      prompt: text,
    });

    if (!media?.url) throw new Error('Gemini TTS returned no audio media.');

    const base64Data = media.url.substring(media.url.indexOf(',') + 1);
    const pcmBuffer = Buffer.from(base64Data, 'base64');
    return { audio: pcmToWavDataUri(pcmBuffer) };
  }
);