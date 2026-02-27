'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { createClient } from 'pexels';

const ImageSearchInputSchema = z.object({
  query: z.string().describe('The search query for the image. Be descriptive.'),
  orientation: z.enum(['landscape', 'portrait', 'square']).optional().describe('The orientation of the image.'),
  imageType: z.enum(['all', 'photo', 'illustration', 'vector']).optional().describe('The type of image to search for. Prioritize "illustration" for young learners.'),
});

const ImageSearchOutputSchema = z.object({
  imageUrl: z.string().describe('The URL of the found image.'),
  photographer: z.string().describe('The name of the photographer.'),
  source: z.string().describe('The source of the image (Pixabay or Pexels).'),
});

export const imageSearchTool = ai.defineTool(
  {
    name: 'searchImage',
    description: 'Searches for a high-quality, royalty-free image. It tries Pixabay first and falls back to Pexels if needed.',
    inputSchema: ImageSearchInputSchema,
    outputSchema: ImageSearchOutputSchema,
  },
  async ({ query, orientation, imageType }) => {
    // 1. Try Pixabay First (Primary)
    const pixabayKey = process.env.PIXABAY_API_KEY;
    if (pixabayKey) {
      try {
        const encodedQuery = encodeURIComponent(query);
        const typeParam = imageType || 'all';
        const url = `https://pixabay.com/api/?key=${pixabayKey}&q=${encodedQuery}&image_type=${typeParam}&orientation=${orientation || 'all'}&safesearch=true&per_page=3`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.hits && data.hits.length > 0) {
          const photo = data.hits[0];
          return {
            imageUrl: photo.largeImageURL,
            photographer: photo.user,
            source: 'Pixabay',
          };
        }
      } catch (error) {
        console.error('Pixabay search failed, falling back to Pexels:', error);
      }
    }

    // 2. Fallback to Pexels (Secondary)
    const pexelsApiKey = process.env.PEXELS_API_KEY;
    if (pexelsApiKey) {
      const client = createClient(pexelsApiKey);
      try {
        // Pexels doesn't have an image_type filter, so we append it to the query for better results
        let pexelsQuery = query;
        if (imageType === 'illustration' || imageType === 'vector') {
          pexelsQuery += ` ${imageType} drawing`;
        }
        
        const response = await client.photos.search({ query: pexelsQuery, per_page: 1, orientation });
        if ('photos' in response && response.photos.length > 0) {
          const photo = response.photos[0];
          return {
            imageUrl: photo.src.large,
            photographer: photo.photographer,
            source: 'Pexels',
          };
        }
      } catch (error) {
        console.error('Pexels search also failed:', error);
      }
    }

    return { imageUrl: '', photographer: '', source: 'None' };
  }
);
