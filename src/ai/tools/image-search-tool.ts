
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { createClient } from 'pexels';

const ImageSearchInputSchema = z.object({
  query: z.string().describe('The search query for the image.'),
  orientation: z.enum(['landscape', 'portrait', 'square']).optional(),
});

const ImageSearchOutputSchema = z.object({
  imageUrl: z.string(),
  photographer: z.string(),
  source: z.string(),
});

export const imageSearchTool = ai.defineTool(
  {
    name: 'searchImage',
    description: 'Searches for educational images via Pexels or Pixabay. Unsplash is currently disabled.',
    inputSchema: ImageSearchInputSchema,
    outputSchema: ImageSearchOutputSchema,
  },
  async ({ query, orientation }) => {
    // 1. Pexels (Primary)
    const pexelsApiKey = process.env.PEXELS_API_KEY;
    if (pexelsApiKey) {
      const client = createClient(pexelsApiKey);
      try {
        const response = await client.photos.search({ query, per_page: 1, orientation: orientation || 'landscape' });
        if ('photos' in response && response.photos.length > 0) {
          const photo = response.photos[0];
          return {
            imageUrl: photo.src.large,
            photographer: photo.photographer,
            source: 'Pexels',
          };
        }
      } catch (error) {
        console.error('Pexels search failed:', error);
      }
    }

    // 2. Pixabay (Fallback)
    const pixabayKey = process.env.PIXABAY_API_KEY;
    if (pixabayKey) {
      try {
        const url = `https://pixabay.com/api/?key=${pixabayKey}&q=${encodeURIComponent(query)}&image_type=photo&orientation=${orientation || 'horizontal'}&safesearch=true&per_page=3`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.hits && data.hits.length > 0) {
          return {
            imageUrl: data.hits[0].largeImageURL,
            photographer: data.hits[0].user,
            source: 'Pixabay',
          };
        }
      } catch (error) {
        console.error('Pixabay search failed:', error);
      }
    }

    return { imageUrl: '', photographer: '', source: 'None' };
  }
);
