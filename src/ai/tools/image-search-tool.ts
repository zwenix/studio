'use server';
/**
 * Image Search Tool
 * Migrated from Genkit ai.defineTool → plain async function.
 * Searches Pexels (primary) then Pixabay (fallback).
 */
import { createClient } from 'pexels';

export type ImageSearchInput = {
  query:       string;
  orientation?: 'landscape' | 'portrait' | 'square';
};

export type ImageSearchOutput = {
  imageUrl:     string;
  photographer: string;
  source:       string;
};

export async function searchImage(
  input: ImageSearchInput
): Promise<ImageSearchOutput> {
  const { query, orientation = 'landscape' } = input;

  // 1. Pexels (Primary)
  const pexelsApiKey = process.env.PEXELS_API_KEY;
  if (pexelsApiKey) {
    try {
      const client   = createClient(pexelsApiKey);
      const response = await client.photos.search({ query, per_page: 1, orientation });
      if ('photos' in response && response.photos.length > 0) {
        const photo = response.photos[0];
        return {
          imageUrl:     photo.src.large,
          photographer: photo.photographer,
          source:       'Pexels',
        };
      }
    } catch (err) {
      console.error('[imageSearch] Pexels failed:', err);
    }
  }

  // 2. Pixabay (Fallback)
  const pixabayKey = process.env.PIXABAY_API_KEY;
  if (pixabayKey) {
    try {
      const url      = `https://pixabay.com/api/?key=${pixabayKey}&q=${encodeURIComponent(query)}&image_type=photo&orientation=${orientation === 'landscape' ? 'horizontal' : orientation}&safesearch=true&per_page=3`;
      const response = await fetch(url);
      const data     = await response.json() as { hits?: { largeImageURL: string; user: string }[] };
      if (data.hits && data.hits.length > 0) {
        return {
          imageUrl:     data.hits[0].largeImageURL,
          photographer: data.hits[0].user,
          source:       'Pixabay',
        };
      }
    } catch (err) {
      console.error('[imageSearch] Pixabay failed:', err);
    }
  }

  return { imageUrl: '', photographer: '', source: 'None' };
}

export const imageSearchTool = searchImage;
export default searchImage;
