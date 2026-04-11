'use server';

/**
 * OCR & Handwriting Recognition
 * Original prompt preserved verbatim.
 * Uses Claude's vision capability directly (Groq does not support image input).
 */

export type ExtractTextFromImageInput = {
  photoDataUri: string; // "data:<mimetype>;base64,<data>"
};

export type ExtractTextFromImageOutput = {
  extractedText: string;
};

export async function extractTextFromImage(
  input: ExtractTextFromImageInput
): Promise<ExtractTextFromImageOutput> {

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is required for image OCR.');
  }

  // Parse the data URI — "data:image/jpeg;base64,<data>"
  const matches = input.photoDataUri.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) {
    throw new Error(
      'Invalid photoDataUri format. Expected: data:<mimetype>;base64,<encoded_data>'
    );
  }
  const [, mediaType, imageData] = matches;

  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  ORIGINAL PROMPT — preserved verbatim from extract-text-from-images.ts  ║
  // ║  (originally a Genkit definePrompt — now sent as the user message)       ║
  // ╚══════════════════════════════════════════════════════════════════════════╝
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method:  'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            // Image block — equivalent of {{media url=photoDataUri}} in Genkit
            {
              type:   'image',
              source: {
                type:       'base64',
                media_type: mediaType as
                  | 'image/jpeg'
                  | 'image/png'
                  | 'image/webp'
                  | 'image/gif',
                data:       imageData,
              },
            },
            // Text block — original prompt text preserved verbatim
            {
              type: 'text',
              text: `You are an expert OCR and handwriting recognition AI.

You will use this information to extract the text from the image.

Use the following as the primary source of information about the image.

Photo: [image provided above]`,
            },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Claude OCR error ${response.status}: ${body}`);
  }

  const data          = await response.json();
  const extractedText = (data.content[0]?.text ?? '') as string;

  return { extractedText };
}
