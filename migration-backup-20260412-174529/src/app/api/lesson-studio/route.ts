
import { generateLessonStudioFlow } from '@/ai/flows/generate-lesson-studio';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { grade, subject, topic, lessonType } = await req.json();
    if (!grade || !subject || !topic || !lessonType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const result = await generateLessonStudioFlow({ grade, subject, topic, lessonType });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Lesson Studio API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: `Failed to generate lesson plan: ${errorMessage}` }, { status: 500 });
  }
}
