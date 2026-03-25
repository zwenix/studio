'use server';

import { z } from 'genkit';
import { ai } from '@/genkit';
import { createClient } from 'pexels';

const GenerateLessonStudioInputSchema = z.object({
  topic: z.string(),
});

export type GenerateLessonStudioInput = z.infer<typeof GenerateLessonStudioInputSchema>;

export type GenerateLessonStudioOutput = {
  lessonPlan: string;
  posterUrl: string;
};

const LessonStudioResponseSchema = z.object({
  lessonPlan: z.string().describe('Markdown formatted lesson plan and IDP strategy'),
  posterQuery: z.string().describe('A descriptive English search query for a classroom poster related to the topic'),
});

async function fetchImage(query: string): Promise<string> {
  const pexelsKey = process.env.PEXELS_API_KEY;
  if (pexelsKey) {
    try {
      const client = createClient(pexelsKey);
      const response = await client.photos.search({
        query,
        per_page: 1,
        orientation: 'landscape',
      });
      if ('photos' in response && response.photos.length > 0) {
        return response.photos[0].src.large;
      }
    } catch (e) {
      console.error('Pexels failed for query:', query, e);
    }
  }

  const pixabayKey = process.env.PIXABAY_API_KEY;
  if (pixabayKey) {
    try {
      const url = `https://pixabay.com/api/?key=${pixabayKey}&q=${encodeURIComponent(
        query
      )}&image_type=photo&orientation=horizontal&safesearch=true&per_page=3`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.hits?.length > 0) {
        return data.hits[0].largeImageURL;
      }
    } catch (e) {
      console.error('Pixabay failed for query:', query, e);
    }
  }

  return '';
}

export async function generateLessonStudio(
  input: GenerateLessonStudioInput
): Promise<GenerateLessonStudioOutput> {
  try {
    const response = await ai.generate({
      model: 'googleai/gemini-1.5-pro',
      output: { schema: LessonStudioResponseSchema },
      system: `You are an expert South African teacher and curriculum designer.`,
      prompt: `Create a structured lesson plan and IDP strategy for primary school learners about: ${input.topic}. Also provide a search query for a related poster.`,
    });

    if (!response.output) {
      throw new Error('AI returned no structured output.');
    }

    const { lessonPlan, posterQuery } = response.output;
    const posterUrl = await fetchImage(posterQuery);

    return {
      lessonPlan,
      posterUrl,
    };
  } catch (error) {
    console.error('generateLessonStudio error:', error);
    throw new Error('Failed to generate lesson studio content');
  }
}
