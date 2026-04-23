export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { textToSpeech } from '@/ai/flows/tts-flow';

export async function POST(req: NextRequest) {
  const { text, voice } = await req.json();
  try {
    const result = await textToSpeech({ text, voice: voice || 'Algenib' });
    return NextResponse.json({ audio: result.audio });
  } catch (error) {
    console.error('TTS API error:', error);
    return NextResponse.json({ error: 'Failed to synthesize speech' }, { status: 500 });
  }
}