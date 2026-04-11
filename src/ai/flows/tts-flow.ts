'use server';

/**
 * Text-to-Speech Flow
 *
 * Original used Gemini TTS (googleai/gemini-2.5-flash-preview-tts via Genkit).
 * Replacement uses:
 *   Primary:  Groq Whisper TTS API (free, fast, supports multiple voices)
 *   Fallback: Anthropic does not offer TTS — if Groq unavailable, throws a
 *             clear error so the UI can show a helpful message.
 *
 * Voice mapping from original Gemini voice names → Groq-compatible voices.
 * Groq supports: alloy, echo, fable, onyx, nova, shimmer
 */

export type TextToSpeechInput = {
  text:  string;
  voice: string; // Original voice name e.g. 'Algenib', 'Achernar', etc.
};

export type TextToSpeechOutput = {
  audio: string; // base64 data URI: "data:audio/wav;base64,..."
};

// Map your original Gemini voice names to Groq voices
const VOICE_MAP: Record<string, string> = {
  Algenib:  'nova',     // Female
  Enif:     'shimmer',  // Female
  Achernar: 'onyx',     // Male
  Canopus:  'echo',     // Male
  Arcturus: 'fable',    // Male
  Procyon:  'alloy',    // Male (neutral)
};

function mapVoice(originalVoice: string): string {
  return VOICE_MAP[originalVoice] ?? 'nova'; // default to nova if unmapped
}

export async function textToSpeech(
  input: TextToSpeechInput
): Promise<TextToSpeechOutput> {
  const groqKey = process.env.GROQ_API_KEY;

  if (!groqKey) {
    throw new Error(
      'GROQ_API_KEY is required for text-to-speech. Add it to your environment variables.'
    );
  }

  const groqVoice = mapVoice(input.voice);

  const response = await fetch(
    'https://api.groq.com/openai/v1/audio/speech',
    {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        model: 'playai-tts',   // Groq's TTS model
        input: input.text,
        voice: groqVoice,
        response_format: 'wav',
      }),
      signal: AbortSignal.timeout(60_000),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Groq TTS error ${response.status}: ${body}`);
  }

  // Convert the binary WAV response to a base64 data URI
  const arrayBuffer = await response.arrayBuffer();
  const base64      = Buffer.from(arrayBuffer).toString('base64');

  return {
    audio: `data:audio/wav;base64,${base64}`,
  };
}
