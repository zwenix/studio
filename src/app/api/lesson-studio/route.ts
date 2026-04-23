import { generateLessonStudio } from '@/ai/flows/generate-lesson-studio';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      grade?:      string;
      topic?:      string;
      phase?:      string;
      lessonType?: string;
    };

    const { grade, topic, phase = 'General', lessonType } = body;

    if (!grade || !topic) {
      return NextResponse.json({ error: 'grade and topic are required' }, { status: 400 });
    }

    const result = await generateLessonStudio({
      grade,
      topic,
      phase: lessonType ?? phase,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[lesson-studio] API Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to generate lesson plan: ${message}` }, { status: 500 });
  }
}
