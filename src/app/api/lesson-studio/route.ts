import { generateLessonStudioFlow } from '@/ai/flows/generate-lesson-studio';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { topic, grade, subject } = await req.json();
    const result = await generateLessonStudioFlow({ topic, grade, subject });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Generation Failed:', error);
    return NextResponse.json({ error: 'Generation Failed' }, { status: 500 });
  }
}
