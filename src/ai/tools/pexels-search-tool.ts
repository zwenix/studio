'use server';

import { ai } from '@/genkit';
import { z } from 'genkit';
import { createClient } from 'pexels';

const PexelsSearchInputSchema = z.object({
  query: z.string().describe('The search query for the image. Be descriptive and include context like "for kids", "illustration", "photograph".'),
  orientation: z.enum(['landscape', 'portrait', 'square']).optional().describe('The orientation of the image.'),
});

const PexelsSearchOutputSchema = z.object({
  imageUrl: z.string().describe('The URL of the found image from Pexels.'),
  photographer: z.string().describe('The name of the photographer.'),
});

export const pexelsSearchTool = ai.defineTool(
  {
    name: 'searchPexelsImage',
    description: 'Searches for a high-quality, royalty-free image from Pexels.com based on a query. Use this to find relevant illustrations, photos, and graphics to embed in educational content.',
    inputSchema: PexelsSearchInputSchema,
    outputSchema: PexelsSearchOutputSchema,
  },
  async ({ query, orientation }) => {
    const pexelsApiKey = process.env.PEXELS_API_KEY;
    if (!pexelsApiKey) {
      console.error('Pexels API Key is not set in environment variables.');
      throw new Error('Pexels API Key is missing.');
    }

    const client = createClient(pexelsApiKey);
    
    try {
      const response = await client.photos.search({ query, per_page: 1, orientation });
      if ('photos' in response && response.photos.length > 0) {
        const photo = response.photos[0];
        return {
          // Use the 'large' size for a good balance of quality and size.
          imageUrl: photo.src.large, 
          photographer: photo.photographer,
        };
      } else {
        // Fallback or error if no image is found
        return {
            imageUrl: '',
            photographer: '',
        };
      }
    } catch (error) {
      console.error('Error fetching image from Pexels:', error);
      // Return a fallback or throw an error
      return {
          imageUrl: '',
          photographer: '',
      };
    }
  }
);
