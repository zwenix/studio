'use server';
/**
 * Pexels Image Search Tool
 * Migrated from Genkit ai.defineTool → plain async function.
 */
import { createClient } from 'pexels';

export type PexelsSearchInput = {
  query:        string;
  orientation?: 'landscape' | 'portrait' | 'square';
};

export type PexelsSearchOutput = {
  imageUrl:     string;
  photographer: string;
};

export async function searchPexelsImage(
  input: PexelsSearchInput
): Promise<PexelsSearchOutput> {
  const pexelsApiKey = process.env.PEXELS_API_KEY;
  if (!pexelsApiKey) {
    console.error('[pexelsSearch] PEXELS_API_KEY not set');
    return { imageUrl: '', photographer: '' };
  }

  try {
    const client   = createClient(pexelsApiKey);
    const response = await client.photos.search({
      query:       input.query,
      per_page:    1,
      orientation: input.orientation,
    });
    if ('photos' in response && response.photos.length > 0) {
      const photo = response.photos[0];
      return { imageUrl: photo.src.large, photographer: photo.photographer };
    }
  } catch (err) {
    console.error('[pexelsSearch] Error:', err);
  }

  return { imageUrl: '', photographer: '' };
}

export const pexelsSearchTool = searchPexelsImage;
export default searchPexelsImage;
