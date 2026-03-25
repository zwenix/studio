import { NextRequest, NextResponse } from 'next/server';
import { textToSpeechFlow } from '@/ai/flows/text-to-speech';

export async function POST(req: NextRequest) {
  const { text } = await req.json();

  try {
    const { audioContent } = await textToSpeechFlow.run({ text });
    return NextResponse.json({ audioContent });
  } catch (error) {
    console.error('TTS API error:', error);
    return NextResponse.json({ error: 'Failed to synthesize speech' }, { status: 500 });
  }
}
